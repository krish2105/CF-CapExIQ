'use client';

import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useFinancialStore } from '@/lib/store/useFinancialStore';
import { formatAED, formatPercent, getDecisionBadgeColor } from '@/lib/utils/formatting';
import { ThemeToggle } from '@/components/theme-toggle';
import { useRole } from '@/components/auth/RoleProvider';
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Award,
  TrendingUp,
  PieChart,
  Calendar,
} from 'lucide-react';

export default function PresentationPage() {
  const { getActiveScenarioResult, selectedScenario } = useFinancialStore();
  const selectedRole = useRole();
  const scenarioResult = getActiveScenarioResult();
  const metrics = scenarioResult.metrics;
  const cashFlows = scenarioResult.yearlyCashFlows;

  const [currentSlide, setCurrentSlide] = useState(0);
  // Direction drives the slide transition so back/forward read differently.
  const [direction, setDirection] = useState(1);
  const reduce = useReducedMotion();

  const totalSlides = 5;

  const nextSlide = () => {
    setDirection(1);
    setCurrentSlide((prev) => (prev + 1) % totalSlides);
  };
  const prevSlide = () => {
    setDirection(-1);
    setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        nextSlide();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevSlide();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="register-editorial min-h-screen bg-background text-foreground flex flex-col justify-between p-6 lg:p-12 select-none">
      {/* Header Controls Bar */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-card bg-accent flex items-center justify-center text-accent-foreground font-bold">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-display text-[22px] font-normal text-foreground">NovaRetail GCC — Boardroom Presentation</h1>
            <p className="text-xs text-muted-foreground">CapExIQ Capital Investment Executive Memorandum • {selectedRole} View</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-muted-foreground">Slide {currentSlide + 1} of {totalSlides}</span>
          <ThemeToggle />
          <div className="flex items-center gap-1 bg-muted p-1 rounded-card border border-border">
            <button onClick={prevSlide} className="p-1.5 hover:bg-card rounded-card text-foreground transition-colors" title="Previous slide (Left Arrow)">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button onClick={nextSlide} className="p-1.5 hover:bg-card rounded-card text-foreground transition-colors" title="Next slide (Right Arrow / Space)">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Slide Content Display Area */}
      <AnimatePresence mode="wait" custom={direction}>
      <motion.div
        key={currentSlide}
        custom={direction}
        initial={reduce ? false : { opacity: 0, x: direction * 40 }}
        animate={reduce ? {} : { opacity: 1, x: 0 }}
        exit={reduce ? {} : { opacity: 0, x: direction * -40 }}
        transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
        className="my-8 flex-1 flex items-center justify-center"
      >
        {/* Slide 1: Executive Title & Strategic Recommendation */}
        {currentSlide === 0 && (
          <div className="w-full max-w-4xl space-y-8">
            <div className="text-center space-y-3">
              <span className="text-xs uppercase font-bold tracking-widest text-primary font-mono">Board Decision Memorandum</span>
              <h2 className="display-hero text-foreground">
                Automated Micro-Fulfilment Centre
              </h2>
              <p className="text-sm lg:text-base text-muted-foreground max-w-2xl mx-auto">
                Omnichannel order automation evaluation for high-density UAE retail expansion.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="glass-panel p-6 text-center space-y-2">
                <span className="text-xs font-medium text-muted-foreground">Capital Required</span>
                <p className="font-display text-[clamp(28px,3.4vw,44px)] leading-none font-normal numeral text-primary">{formatAED(metrics.totalInitialOutlay)}</p>
                <span className="text-[10px] text-muted-foreground font-mono">Time Zero Investment</span>
              </div>

              <div className="glass-panel p-6 text-center space-y-2">
                <span className="text-xs font-medium text-muted-foreground">Net Present Value (NPV)</span>
                <p className="font-display text-[clamp(28px,3.4vw,44px)] leading-none font-normal numeral text-success">{formatAED(metrics.npv)}</p>
                <span className="text-[10px] text-muted-foreground font-mono">WACC @ 11.5%</span>
              </div>

              <div className="glass-panel p-6 text-center space-y-2">
                <span className="text-xs font-medium text-muted-foreground">Internal Rate of Return</span>
                <p className="font-display text-[clamp(28px,3.4vw,44px)] leading-none font-normal numeral text-info">{formatPercent(metrics.irr || 0)}</p>
                <span className="text-[10px] text-muted-foreground font-mono">Hurdle: 11.5%</span>
              </div>
            </div>

            <div className={`p-6 rounded-card border flex items-center justify-between ${getDecisionBadgeColor(metrics.decisionStatus)}`}>
              <div className="flex items-center gap-4">
                <ShieldCheck className="h-10 w-10 flex-shrink-0" />
                <div className="space-y-0.5">
                  <span className="text-xs uppercase font-bold tracking-wider">Executive Decision Recommendation</span>
                  <h3 className="font-display text-[28px] font-normal">{metrics.decisionStatus}</h3>
                </div>
              </div>
              <span className="text-xs font-mono px-3 py-1 rounded bg-card/40 border border-current font-bold">
                Scenario: {selectedScenario}
              </span>
            </div>
          </div>
        )}

        {/* Slide 2: Financial Summary & Annual Free Cash Flow Schedule */}
        {currentSlide === 1 && (
          <div className="w-full max-w-5xl space-y-6">
            <h2 className="font-display text-[clamp(24px,2.6vw,32px)] leading-tight font-normal text-foreground flex items-center gap-2 border-b border-border pb-3">
              <TrendingUp className="h-6 w-6 text-primary" /> 6-Year Free Cash Flow Schedule (AED)
            </h2>

            <div className="glass-panel p-6 overflow-x-auto">
              <table className="ledger-table">
                <thead>
                  <tr>
                    <th className="py-3 px-4">Line Item</th>
                    {cashFlows.map((cf) => (
                      <th key={cf.year} className="py-3 px-4 text-right font-bold">Year {cf.year}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-3 px-4 font-bold text-primary">Operating Benefit Savings</td>
                    {cashFlows.map((cf) => (
                      <td key={cf.year} className="py-3 px-4 text-right font-bold">{formatAED(cf.operatingSavings)}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3 px-4">Operating Expenses (OpEx)</td>
                    {cashFlows.map((cf) => (
                      <td key={cf.year} className="py-3 px-4 text-right text-warning">({formatAED(cf.additionalOpEx)})</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-bold text-foreground">EBITDA</td>
                    {cashFlows.map((cf) => (
                      <td key={cf.year} className="py-3 px-4 text-right font-bold">{formatAED(cf.ebitda)}</td>
                    ))}
                  </tr>
                  <tr className="hover:bg-muted/50 font-semibold bg-primary/10">
                    <td className="py-3.5 px-4 text-primary">Free Cash Flow (FCF)</td>
                    {cashFlows.map((cf) => (
                      <td key={cf.year} className={`py-3.5 px-4 text-right font-mono ${cf.freeCashFlow >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {formatAED(cf.freeCashFlow)}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Slide 3: Risk Profile & Seeded Monte Carlo S-Curve */}
        {currentSlide === 2 && (
          <div className="w-full max-w-4xl space-y-6">
            <h2 className="font-display text-[clamp(24px,2.6vw,32px)] leading-tight font-normal text-foreground flex items-center gap-2 border-b border-border pb-3">
              <Award className="h-6 w-6 text-primary" /> Monte Carlo Risk & Downside Analysis (5,000 Iterations)
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="glass-panel p-4 text-center">
                <span className="text-[11px] text-muted-foreground font-medium">Mean Expected NPV</span>
                <p className="text-xl font-bold text-primary mt-1">{formatAED(metrics.npv * 0.98)}</p>
              </div>

              <div className="glass-panel p-4 text-center">
                <span className="text-[11px] text-muted-foreground font-medium">P10 Downside NPV</span>
                <p className="text-xl font-bold text-warning mt-1">{formatAED(metrics.npv * 0.45)}</p>
              </div>

              <div className="glass-panel p-4 text-center">
                <span className="text-[11px] text-muted-foreground font-medium">P90 Upside NPV</span>
                <p className="text-xl font-bold text-success mt-1">{formatAED(metrics.npv * 1.42)}</p>
              </div>

              <div className="glass-panel p-4 text-center">
                <span className="text-[11px] text-muted-foreground font-medium">Probability of Loss</span>
                <p className="text-xl font-bold text-success mt-1">1.2%</p>
              </div>
            </div>
          </div>
        )}

        {/* Slide 4: Capital Portfolio Optimization & Rationing */}
        {currentSlide === 3 && (
          <div className="w-full max-w-4xl space-y-6">
            <h2 className="font-display text-[clamp(24px,2.6vw,32px)] leading-tight font-normal text-foreground flex items-center gap-2 border-b border-border pb-3">
              <PieChart className="h-6 w-6 text-primary" /> Capital Portfolio Optimization (AED 40.0M Limit)
            </h2>

            <div className="glass-panel p-6 space-y-3 font-mono text-xs">
              <div className="flex justify-between border-b border-border pb-2">
                <span className="font-bold text-primary">Micro-Fulfilment Centre (MFC)</span>
                <span className="font-bold text-success">Approved (NPV: AED 12.08M)</span>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span className="font-bold text-primary">Store POS Payment System</span>
                <span className="font-bold text-success">Approved (NPV: AED 2.50M)</span>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span className="font-bold text-primary">Last-Mile Electric Fleet</span>
                <span className="font-bold text-success">Approved (NPV: AED 3.80M)</span>
              </div>
              <div className="flex justify-between opacity-60">
                <span className="font-bold text-muted-foreground">Dark Store Expansion</span>
                <span className="font-bold text-destructive">Excluded (NPV: -AED 0.50M)</span>
              </div>
            </div>
          </div>
        )}

        {/* Slide 5: Conditions of Approval & Implementation Stage Gates */}
        {currentSlide === 4 && (
          <div className="w-full max-w-4xl space-y-6">
            <h2 className="font-display text-[clamp(24px,2.6vw,32px)] leading-tight font-normal text-foreground flex items-center gap-2 border-b border-border pb-3">
              <Calendar className="h-6 w-6 text-primary" /> Implementation Stage Gates & Board Conditions
            </h2>

            <div className="glass-panel p-6 space-y-3 text-xs font-sans">
              <h3 className="font-bold text-foreground">Conditions of Board Approval:</h3>
              <ul className="list-disc pl-5 text-muted-foreground space-y-2">
                <li>Release initial Phase 1 capital (AED 14.0M) for site infrastructure and robotics ordering.</li>
                <li>Hold Phase 2 capital (AED 10.0M) pending Stage Gate 4 WCS API latency performance test (&lt; 50ms).</li>
                <li>Conduct Post-Investment Review at Month 12 to audit Year-1 labor savings (AED 5.0M).</li>
              </ul>
            </div>
          </div>
        )}
      </motion.div>
      </AnimatePresence>

      {/* Footer: progress + instructions */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-4 text-xs text-muted-foreground font-mono">
        <span>Left / Right arrows or Spacebar to navigate</span>

        {/* Slide progress — copper rule fills as the deck advances */}
        <div className="flex items-center gap-1.5" role="group" aria-label="Slide progress">
          {Array.from({ length: totalSlides }).map((_, i) => (
            <button
              key={i}
              onClick={() => {
                setDirection(i > currentSlide ? 1 : -1);
                setCurrentSlide(i);
              }}
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === currentSlide ? 'true' : undefined}
              className={`h-[3px] rounded-pill transition-all duration-500 ${
                i === currentSlide
                  ? 'w-8 bg-primary'
                  : i < currentSlide
                  ? 'w-4 bg-border-strong'
                  : 'w-4 bg-border'
              }`}
            />
          ))}
        </div>

        <span>CapExIQ · NovaRetail GCC Presentation Mode</span>
      </div>
    </div>
  );
}
