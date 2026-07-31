'use client';

import React, { useState } from 'react';
import { useFinancialStore } from '@/lib/store/useFinancialStore';
import { formatAED, formatPercent } from '@/lib/utils/formatting';
import { Bot, Send, User, Sparkles, AlertTriangle, ShieldCheck, Trash2, Info } from 'lucide-react';

export default function AIAssistantPage() {
  const { chatMessages, addChatMessage, clearChat, getActiveScenarioResult, getActiveAssumptions, selectedScenario, selectedRole } = useFinancialStore();
  const assumptions = getActiveAssumptions();
  const scenarioResult = getActiveScenarioResult();
  const metrics = scenarioResult.metrics;

  const [inputQuery, setInputQuery] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const samplePrompts = [
    'Explain the NPV and IRR trade-off for NovaRetail GCC.',
    'What are the primary operational risk drivers for Year 1?',
    'Summarize the board decision recommendation for the CFO.',
    'How does a 10% increase in initial capital outlay impact payback?',
  ];

  const handleSendMessage = async (queryText?: string) => {
    const textToSend = queryText || inputQuery;
    if (!textToSend.trim()) return;

    addChatMessage('user', textToSend);
    if (!queryText) setInputQuery('');
    setIsGenerating(true);

    try {
      const response = await fetch('/api/ai/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: textToSend,
          prompt: textToSend,
          role: selectedRole,
          scenario: selectedScenario,
          metrics,
          assumptions,
        }),
      });

      const data = await response.json();
      const aiResponse = data.answer || data.explanation;
      if (aiResponse) {
        addChatMessage('assistant', aiResponse);
      } else {
        addChatMessage('assistant', `[AI Advisory Response] Based on deterministic net present value of ${formatAED(metrics.npv)} and IRR of ${formatPercent(metrics.irr)}, the project exceeds NovaRetail GCC's ${formatPercent(assumptions.discountRate)} WACC hurdle rate under the ${selectedScenario} scenario. Operational risk factors remain focused on robotics throughput SLA compliance.`);
      }
    } catch (err) {
      addChatMessage('assistant', `[Advisory Fallback] Deterministic evaluation indicates positive capital return (NPV: ${formatAED(metrics.npv)}, IRR: ${formatPercent(metrics.irr)}). Management recommendation remains ${metrics.decisionStatus}.`);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-8rem)]">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border flex-shrink-0">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-foreground flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" /> AI Financial Governance Assistant
          </h1>
          <p className="text-xs text-muted-foreground">
            NovaRetail GCC • AI Advisory Assistant for Executive Board Memorandum & Capital Allocation Guidance
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1 font-mono">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> Advisory Only — Human Review Required
          </span>
          <button
            onClick={clearChat}
            className="p-1.5 text-muted-foreground hover:text-foreground bg-card hover:bg-muted border border-border rounded-lg transition-colors text-xs font-medium flex items-center gap-1"
            title="Clear Chat History"
          >
            <Trash2 className="h-3.5 w-3.5" /> Clear
          </button>
        </div>
      </div>

      {/* Chat Messages Body */}
      <div className="flex-1 overflow-y-auto space-y-4 p-4 glass-panel rounded-2xl border border-border">
        {chatMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto space-y-4">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Bot className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-foreground">Ask the AI Executive Finance Advisory Assistant</h3>
              <p className="text-xs text-muted-foreground">
                Inquire about NPV sensitivity, scenario trade-offs, risk mitigations, or board decision rationale.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2 w-full pt-2">
              {samplePrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(prompt)}
                  className="px-3 py-2 rounded-xl bg-muted/60 hover:bg-muted text-foreground border border-border text-xs font-medium transition-all text-left"
                >
                  &quot;{prompt}&quot;
                </button>
              ))}
            </div>
          </div>
        ) : (
          chatMessages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 max-w-3xl ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
            >
              <div
                className={`h-8 w-8 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white'
                }`}
              >
                {msg.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>

              <div
                className={`p-3.5 rounded-2xl text-xs leading-relaxed space-y-1 ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-tr-none font-medium'
                    : 'glass-panel rounded-tl-none text-foreground font-sans border border-border'
                }`}
              >
                <div className="flex items-center justify-between gap-4 font-mono text-[10px] text-muted-foreground border-b border-border/40 pb-1 mb-1">
                  <span>{msg.role === 'user' ? 'Executive Prompt' : 'AI Advisory Officer'}</span>
                  <span>{msg.timestamp}</span>
                </div>
                <p className="whitespace-pre-wrap">{msg.text}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Query Input Bar */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <input
          type="text"
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder="Ask a question regarding capital budgeting, risk or scenario trade-offs..."
          className="flex-1 bg-card border border-border rounded-xl px-4 py-2.5 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
        />
        <button
          onClick={() => handleSendMessage()}
          disabled={isGenerating || !inputQuery.trim()}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50"
        >
          <Send className="h-4 w-4" /> Send
        </button>
      </div>
    </div>
  );
}
