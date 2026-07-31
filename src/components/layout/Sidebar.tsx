'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  LayoutDashboard,
  FileSpreadsheet,
  Table,
  GitCompare,
  TrendingUp,
  Dices,
  PieChart,
  Target,
  Cpu,
  BarChart3,
  Zap,
  Truck,
  ShieldCheck,
  GitBranch,
  Landmark,
  Award,
  Calendar,
  BookOpen,
  Download,
  Bot,
  Sliders,
  Monitor,
} from 'lucide-react';

const NAV_GROUPS = [
  {
    title: 'Core Decision Workflow',
    items: [
      { href: '/', label: 'Overview', icon: Home },
      { href: '/dashboard', label: 'Executive Dashboard', icon: LayoutDashboard },
      { href: '/assumptions', label: 'Assumptions Register', icon: FileSpreadsheet },
      { href: '/financial-model', label: 'Financial Model Schedule', icon: Table },
    ],
  },
  {
    title: 'Scenario & Risk Analysis',
    items: [
      { href: '/scenarios', label: 'Scenario Engine', icon: GitCompare },
      { href: '/sensitivity', label: 'Sensitivity Matrix', icon: TrendingUp },
      { href: '/monte-carlo', label: 'Monte Carlo Simulation', icon: Dices },
    ],
  },
  {
    title: 'Capital & Portfolio',
    items: [
      { href: '/portfolio', label: 'Capital Portfolio Optimizer', icon: PieChart },
      { href: '/strategic-scorecard', label: 'Strategic Scorecard', icon: Target },
    ],
  },
  {
    title: 'Operations & Vendors',
    items: [
      { href: '/capacity-model', label: 'COO Capacity Model', icon: Cpu },
      { href: '/operational-analytics', label: 'Operational Delivery', icon: BarChart3 },
      { href: '/electricity-estimator', label: 'DEWA Tariff Estimator', icon: Zap },
      { href: '/vendor-analysis', label: 'Vendor TCO Matrix', icon: Truck },
    ],
  },
  {
    title: 'Governance & Execution',
    items: [
      { href: '/approvals', label: 'Approval Workflow', icon: ShieldCheck },
      { href: '/real-options', label: 'Real Options Staging', icon: GitBranch },
      { href: '/funding', label: 'Funding & Liquidity', icon: Landmark },
      { href: '/benefits-tracker', label: 'Benefits Realisation', icon: Award },
      { href: '/implementation-plan', label: 'Implementation Gates', icon: Calendar },
    ],
  },
  {
    title: 'Methodology & AI',
    items: [
      { href: '/data-sources', label: 'Data & Methodology', icon: BookOpen },
      { href: '/external-data', label: 'UAE Tax & WACC', icon: Landmark },
      { href: '/csv-management', label: 'CSV Import & Audit', icon: Download },
      { href: '/ai-assistant', label: 'AI Finance Assistant', icon: Bot },
      { href: '/presentation', label: 'Boardroom Presentation', icon: Monitor },
      { href: '/settings', label: 'Settings', icon: Sliders },
    ],
  },
];

export const Sidebar: React.FC = () => {
  const pathname = usePathname();

  return (
    <aside className="w-full md:w-64 bg-card border-b md:border-b-0 md:border-r border-border flex-shrink-0 transition-colors">
      <div className="p-4 space-y-5">
        {NAV_GROUPS.map((group, idx) => (
          <div key={idx} className="space-y-1">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-3 mb-1">
              {group.title}
            </p>
            <nav className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-primary/15 text-primary border border-primary/30 shadow-sm font-bold'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}
      </div>
    </aside>
  );
};
