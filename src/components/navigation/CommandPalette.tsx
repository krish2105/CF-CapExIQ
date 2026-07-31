'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFinancialStore } from '@/lib/store/useFinancialStore';
import { useTheme } from 'next-themes';
import {
  Search,
  LayoutDashboard,
  FileSpreadsheet,
  Table,
  GitCompare,
  TrendingUp,
  Dices,
  Target,
  PieChart,
  Landmark,
  GitBranch,
  Truck,
  Cpu,
  Calendar,
  Award,
  ShieldCheck,
  BarChart3,
  Zap,
  BookOpen,
  Download,
  Bot,
  Sliders,
  Printer,
  Sun,
  Moon,
  X,
} from 'lucide-react';

const COMMAND_ROUTES = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard', label: 'Executive Dashboard', icon: LayoutDashboard },
  { href: '/strategic-scorecard', label: 'Strategic-Fit Scorecard', icon: Target },
  { href: '/portfolio', label: 'Capital Portfolio Optimizer', icon: PieChart },
  { href: '/funding', label: 'Funding Mix & Liquidity', icon: Landmark },
  { href: '/real-options', label: 'Real Options & Staging', icon: GitBranch },
  { href: '/vendor-analysis', label: 'Vendor TCO Comparison', icon: Truck },
  { href: '/capacity-model', label: 'COO Capacity Model', icon: Cpu },
  { href: '/implementation-plan', label: 'Implementation Stage Gates', icon: Calendar },
  { href: '/benefits-tracker', label: 'Benefits-Realization Tracker', icon: Award },
  { href: '/approvals', label: 'Approval Workflow & Snapshot', icon: ShieldCheck },
  { href: '/assumptions', label: 'Assumptions Register', icon: FileSpreadsheet },
  { href: '/financial-model', label: 'Financial Model Schedule', icon: Table },
  { href: '/scenarios', label: 'Scenario Engine', icon: GitCompare },
  { href: '/sensitivity', label: 'Sensitivity Matrix', icon: TrendingUp },
  { href: '/monte-carlo', label: 'Monte Carlo Simulation', icon: Dices },
  { href: '/operational-analytics', label: 'Operational Delivery Analytics', icon: BarChart3 },
  { href: '/electricity-estimator', label: 'DEWA Tariff Estimator', icon: Zap },
  { href: '/external-data', label: 'UAE Tax & WACC Debt Calculator', icon: Landmark },
  { href: '/data-sources', label: 'Data Dictionary & Methodology', icon: BookOpen },
  { href: '/csv-management', label: 'CSV Import & Audit', icon: Download },
  { href: '/ai-assistant', label: 'AI Finance Assistant', icon: Bot },
  { href: '/settings', label: 'Model Settings & Thresholds', icon: Sliders },
  { href: '/printable-report', label: 'Printable Investment Report', icon: Printer },
];

export const CommandPalette: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const router = useRouter();
  const { setScenario } = useFinancialStore();
  const { setTheme } = useTheme();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (!isOpen) return null;

  const filteredRoutes = COMMAND_ROUTES.filter((r) =>
    r.label.toLowerCase().includes(query.toLowerCase())
  );

  const handleNavigate = (href: string) => {
    router.push(href);
    setIsOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-20 p-4">
      <div className="bg-card border border-border text-card-foreground rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Search Header */}
        <div className="relative border-b border-border p-3 flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground ml-2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or jump to page..."
            className="w-full bg-transparent text-xs text-foreground placeholder-muted-foreground focus:outline-none font-medium"
            autoFocus
          />
          <button onClick={() => setIsOpen(false)} className="p-1 text-muted-foreground hover:text-foreground rounded-lg">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Command Options List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1 text-xs">
          <p className="text-[10px] font-bold text-muted-foreground uppercase px-2 py-1">Pages & Modules ({filteredRoutes.length})</p>
          {filteredRoutes.map((route) => {
            const Icon = route.icon;
            return (
              <button
                key={route.href}
                onClick={() => handleNavigate(route.href)}
                className="w-full px-3 py-2 rounded-xl hover:bg-muted text-left flex items-center gap-3 transition-colors font-medium"
              >
                <Icon className="h-4 w-4 text-primary" />
                <span>{route.label}</span>
              </button>
            );
          })}

          <p className="text-[10px] font-bold text-muted-foreground uppercase px-2 py-1 pt-2">Quick Actions</p>
          <button
            onClick={() => {
              setTheme('light');
              setIsOpen(false);
            }}
            className="w-full px-3 py-2 rounded-xl hover:bg-muted text-left flex items-center gap-3 font-medium"
          >
            <Sun className="h-4 w-4 text-amber-500" /> Switch Theme to Light Mode
          </button>
          <button
            onClick={() => {
              setTheme('dark');
              setIsOpen(false);
            }}
            className="w-full px-3 py-2 rounded-xl hover:bg-muted text-left flex items-center gap-3 font-medium"
          >
            <Moon className="h-4 w-4 text-cyan-400" /> Switch Theme to Dark Mode
          </button>
        </div>
      </div>
    </div>
  );
};
