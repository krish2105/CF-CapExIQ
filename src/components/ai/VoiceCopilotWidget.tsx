'use client';

import React, { useState, useEffect } from 'react';
import { useFinancialStore } from '@/lib/store/useFinancialStore';
import { Mic, MicOff, Volume2, Sparkles, X, RefreshCw } from 'lucide-react';
import { VoiceIntentResponse } from '@/app/api/ai/voice-intent/route';

export default function VoiceCopilotWidget() {
  const { assumptions, updateAssumptions } = useFinancialStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState<VoiceIntentResponse | null>(null);

  const speakText = (text: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // Stop any active speech
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleVoiceCommand = async (text: string) => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/ai/voice-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userSpeech: text,
          currentAssumptions: assumptions,
        }),
      });

      if (!res.ok) throw new Error('Voice intent failed');
      const data: VoiceIntentResponse = await res.json();
      setResponse(data);

      if (data.proposedUpdates && Object.keys(data.proposedUpdates).length > 0) {
        updateAssumptions(data.proposedUpdates);
      }

      if (data.spokenSummary) {
        speakText(data.spokenSummary);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const startListening = () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. You can type spoken queries directly!');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      setTranscript(text);
      handleVoiceCommand(text);
    };

    recognition.start();
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <div className="fixed bottom-8 right-8 z-[9999]">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="h-14 w-14 rounded-full bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-500 hover:scale-110 transition-all shadow-2xl shadow-purple-500/50 flex items-center justify-center text-white border-2 border-white/40 group ring-4 ring-purple-500/20"
          title="Voice AI Executive Copilot"
        >
          <Sparkles className="h-6 w-6 group-hover:rotate-12 transition-transform" />
        </button>
      </div>

      {/* Floating Widget Panel */}
      {isOpen && (
        <div className="fixed bottom-28 right-8 z-[9999] w-80 sm:w-96 bg-card/95 backdrop-blur-xl border border-primary/30 rounded-2xl shadow-2xl p-5 space-y-4 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Voice AI Copilot</h3>
                <p className="text-[10px] text-muted-foreground">Hands-free Conversational Control</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="p-1 text-muted-foreground hover:text-foreground rounded-lg">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Voice Wave Visualizer */}
          <div className="bg-background/60 border border-border rounded-xl p-4 text-center space-y-3">
            <div className="flex items-center justify-center gap-1.5 h-8">
              {[...Array(7)].map((_, i) => (
                <div
                  key={i}
                  className={`w-1.5 rounded-full bg-primary transition-all duration-300 ${
                    isListening ? 'animate-pulse bg-purple-500 h-6' : 'h-3 opacity-40'
                  }`}
                  style={{ animationDelay: `${i * 100}ms` }}
                />
              ))}
            </div>

            <button
              onClick={startListening}
              disabled={isListening || loading}
              className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md ${
                isListening
                  ? 'bg-rose-500 text-white animate-pulse'
                  : 'bg-primary text-primary-foreground hover:opacity-90'
              }`}
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" /> Processing AI Intent...
                </>
              ) : isListening ? (
                <>
                  <MicOff className="h-4 w-4" /> Listening... Speak Now
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4" /> Click to Speak Command
                </>
              )}
            </button>
          </div>

          {/* Text Input Fallback */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleVoiceCommand(transcript);
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="e.g. Set discount rate to 10%..."
              className="flex-1 bg-background text-xs px-3 py-2 rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              type="submit"
              disabled={loading || !transcript.trim()}
              className="px-3 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              Send
            </button>
          </form>

          {/* AI Response Box */}
          {response && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 text-xs space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-bold text-primary uppercase">
                <span>AI Executive Feedback</span>
                <button onClick={() => speakText(response.spokenSummary)} className="hover:opacity-80" title="Replay voice readout">
                  <Volume2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="text-foreground text-[11px] leading-relaxed">{response.spokenSummary}</p>
              {response.actionTaken && (
                <span className="inline-block text-[10px] font-mono text-emerald-500 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded">
                  ✓ {response.actionTaken}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
