'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useFinancialStore } from '@/lib/store/useFinancialStore';
import { formatAED, formatPercent } from '@/lib/utils/formatting';
import { SourceCitations } from '@/components/ai/SourceCitations';
import type { Citation } from '@/lib/rag/types';
import { Bot, Send, User, AlertTriangle, Trash2, Library, Square } from 'lucide-react';
import { useRole } from '@/components/auth/RoleProvider';

interface StreamEvent {
  type: 'sources' | 'delta' | 'done' | 'error';
  citations?: Citation[];
  retrieval?: { semanticUsed: boolean; tookMs: number; chunks: number };
  text?: string;
  isFallback?: boolean;
}

/**
 * The in-flight answer lives in component state, never in the store.
 *
 * The store is wrapped in zustand's `persist`, which serialises to
 * localStorage on every write — streaming tokens through it would mean one
 * full JSON stringify of the entire chat history per token. Only the completed
 * message is committed.
 */
export default function AIAssistantPage() {
  const { chatMessages, addChatMessage, clearChat, selectedScenario } = useFinancialStore(
    useShallow((s) => ({
      chatMessages: s.chatMessages,
      addChatMessage: s.addChatMessage,
      clearChat: s.clearChat,
      selectedScenario: s.selectedScenario,
    }))
  );
  const selectedRole = useRole();

  const [inputQuery, setInputQuery] = useState('');
  const [phase, setPhase] = useState<'idle' | 'retrieving' | 'streaming'>('idle');
  const [streamText, setStreamText] = useState('');
  const [streamCitations, setStreamCitations] = useState<Citation[]>([]);
  const [retrievalInfo, setRetrievalInfo] = useState<StreamEvent['retrieval'] | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  // Follow the tail only while the reader is already at the bottom, so
  // scrolling up to re-read an earlier answer is not yanked back by tokens.
  const pinnedRef = useRef(true);
  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    pinnedRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }, []);

  useEffect(() => {
    if (pinnedRef.current) endRef.current?.scrollIntoView({ block: 'end' });
  }, [chatMessages.length, streamText]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const samplePrompts = [
    'Where does the 9% corporate tax rate come from, and what is its source?',
    'Why is MIRR lower than IRR in this model?',
    'What are the stated limitations of this financial model?',
    'How are the Pessimistic scenario multipliers defined?',
  ];

  const handleSend = async (queryText?: string) => {
    const textToSend = (queryText ?? inputQuery).trim();
    if (!textToSend || phase !== 'idle') return;

    addChatMessage('user', textToSend);
    if (!queryText) setInputQuery('');

    setPhase('retrieving');
    setStreamText('');
    setStreamCitations([]);
    setRetrievalInfo(null);
    pinnedRef.current = true;

    const controller = new AbortController();
    abortRef.current = controller;

    // Read the model snapshot at send time rather than subscribing to it, so
    // a scenario switch mid-answer cannot re-render this page per token.
    const store = useFinancialStore.getState();
    const assumptions = store.getActiveAssumptions();
    const metrics = store.getActiveScenarioResult().metrics;

    let accumulated = '';
    let citations: Citation[] = [];
    let isFallback = false;

    try {
      const res = await fetch('/api/ai/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          question: textToSend,
          role: selectedRole,
          scenario: selectedScenario,
          metrics,
          assumptions,
        }),
      });

      if (!res.body) throw new Error('No response stream');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      // SSE frames are delimited by a blank line and can be split across
      // network chunks, so the tail of the buffer is carried forward.
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const frames = buffer.split('\n\n');
        buffer = frames.pop() ?? '';

        for (const frame of frames) {
          const line = frame.split('\n').find((l) => l.startsWith('data: '));
          if (!line) continue;
          let evt: StreamEvent;
          try {
            evt = JSON.parse(line.slice(6));
          } catch {
            continue;
          }

          if (evt.type === 'sources') {
            citations = evt.citations ?? [];
            setStreamCitations(citations);
            setRetrievalInfo(evt.retrieval ?? null);
          } else if (evt.type === 'delta' && evt.text) {
            accumulated += evt.text;
            setStreamText(accumulated);
            setPhase('streaming');
          } else if (evt.type === 'done') {
            isFallback = Boolean(evt.isFallback);
          }
        }
      }
    } catch (err) {
      if ((err as Error)?.name !== 'AbortError') {
        accumulated =
          accumulated ||
          `[Advisory Fallback] Deterministic evaluation indicates NPV ${formatAED(metrics.npv)} and IRR ${formatPercent(metrics.irr)}. Management recommendation remains ${metrics.decisionStatus}.`;
        isFallback = true;
      }
    } finally {
      abortRef.current = null;
      if (accumulated.trim()) {
        addChatMessage('assistant', accumulated.trim(), { citations, isFallback });
      }
      setStreamText('');
      setStreamCitations([]);
      setRetrievalInfo(null);
      setPhase('idle');
    }
  };

  const busy = phase !== 'idle';

  return (
    <div className="space-y-4 flex flex-col h-[calc(100vh-8rem)]">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border flex-shrink-0">
        <div>
          <h1 className="font-display text-[clamp(24px,2.6vw,32px)] leading-tight font-normal text-foreground flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" /> AI Financial Governance Assistant
          </h1>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Library className="h-3 w-3 text-primary" />
            Retrieval-grounded over the project corpus — every claim cites its source
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs px-2.5 py-1 rounded-card bg-warning/10 text-warning border border-warning/30 flex items-center gap-1 font-mono">
            <AlertTriangle className="h-3.5 w-3.5" /> Advisory Only — Human Review Required
          </span>
          <button
            type="button"
            onClick={clearChat}
            disabled={busy}
            className="p-1.5 text-muted-foreground hover:text-foreground bg-card hover:bg-muted border border-border rounded-card transition-colors text-xs font-medium flex items-center gap-1 disabled:opacity-50"
            title="Clear chat history"
          >
            <Trash2 className="h-3.5 w-3.5" /> Clear
          </button>
        </div>
      </div>

      {/* Chat body */}
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex-1 overflow-y-auto space-y-4 p-4 glass-panel rounded-card border border-border"
      >
        {chatMessages.length === 0 && !busy ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto space-y-4">
            <div className="h-12 w-12 rounded-card bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Bot className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-foreground">Ask the AI Executive Finance Advisory Assistant</h3>
              <p className="text-xs text-muted-foreground">
                Answers are retrieved from the assumptions register, methodology notes and the live
                model output — then cited so you can check them.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2 w-full pt-2">
              {samplePrompts.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handleSend(p)}
                  className="px-3 py-2 rounded-card bg-muted/60 hover:bg-muted text-foreground border border-border text-xs font-medium transition-all text-left"
                >
                  &quot;{p}&quot;
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-3xl ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
              >
                <div
                  className={`h-8 w-8 rounded-card flex items-center justify-center flex-shrink-0 ${
                    msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-accent text-accent-foreground'
                  }`}
                >
                  {msg.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>

                <div
                  className={`p-3.5 rounded-card text-xs leading-relaxed min-w-0 ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-tr-none font-medium'
                      : 'glass-panel rounded-tl-none text-foreground border border-border'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4 font-mono text-[10px] text-muted-foreground border-b border-border/40 pb-1 mb-1.5">
                    <span>{msg.role === 'user' ? 'Executive Prompt' : 'AI Advisory Officer'}</span>
                    <span className="flex items-center gap-2">
                      {msg.isFallback && <span className="text-warning font-bold">deterministic fallback</span>}
                      {msg.timestamp}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                  {msg.role === 'assistant' && msg.citations && (
                    <SourceCitations citations={msg.citations} />
                  )}
                </div>
              </div>
            ))}

            {/* In-flight answer */}
            {busy && (
              <div className="flex gap-3 max-w-3xl">
                <div className="h-8 w-8 rounded-card flex items-center justify-center flex-shrink-0 bg-accent text-accent-foreground">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="p-3.5 rounded-card rounded-tl-none text-xs leading-relaxed glass-panel border border-border min-w-0">
                  <div className="flex items-center justify-between gap-4 font-mono text-[10px] text-muted-foreground border-b border-border/40 pb-1 mb-1.5">
                    <span>AI Advisory Officer</span>
                    <span className="text-primary">
                      {phase === 'retrieving'
                        ? 'searching knowledge base…'
                        : retrievalInfo
                          ? `${retrievalInfo.chunks} sources · ${retrievalInfo.semanticUsed ? 'hybrid' : 'lexical'} · ${retrievalInfo.tookMs}ms`
                          : 'generating…'}
                    </span>
                  </div>

                  {streamCitations.length > 0 && streamText === '' && (
                    <p className="text-muted-foreground italic">
                      Retrieved {streamCitations.length} sources. Composing answer…
                    </p>
                  )}

                  {streamText && (
                    <p className="whitespace-pre-wrap">
                      {streamText}
                      <span className="inline-block w-1.5 h-3 ml-0.5 bg-primary align-middle animate-pulse" />
                    </p>
                  )}

                  {streamCitations.length > 0 && <SourceCitations citations={streamCitations} />}
                </div>
              </div>
            )}
          </>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <input
          type="text"
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          disabled={busy}
          placeholder="Ask about methodology, assumptions, provenance or scenario trade-offs…"
          className="flex-1 bg-card border border-border rounded-card px-4 py-2.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium disabled:opacity-60"
        />
        {busy ? (
          <button
            type="button"
            onClick={() => abortRef.current?.abort()}
            className="px-4 py-2.5 rounded-card bg-destructive text-destructive-foreground text-xs font-bold flex items-center gap-2"
          >
            <Square className="h-3.5 w-3.5" /> Stop
          </button>
        ) : (
          <button
            type="button"
            onClick={() => handleSend()}
            disabled={!inputQuery.trim()}
            className="px-4 py-2.5 rounded-card bg-accent text-accent-foreground text-xs font-bold flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <Send className="h-4 w-4" /> Send
          </button>
        )}
      </div>
    </div>
  );
}
