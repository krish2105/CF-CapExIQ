import {
  Home, LayoutDashboard, FileSpreadsheet, Table, GitCompare, TrendingUp, Dices,
  PieChart, Target, Cpu, BarChart3, Zap, Truck, ShieldCheck, GitBranch, Landmark,
  Award, Calendar, BookOpen, Download, Bot, Sliders, Monitor, ShieldAlert, Box,
  Leaf, Wand2, Users, FileText, Gauge, Database, LayoutGrid, Sparkles,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Permission } from '@/lib/auth/permissions';

/**
 * Navigation taxonomy — the single source of truth for both the sidebar and
 * the in-page segment bar.
 *
 * The previous sidebar exposed 31 sibling destinations across 7 flat groups.
 * At that width every route competes equally for attention, which is the same
 * "everything is emphasised, so nothing is" failure the header already had.
 * This collapses the app to FIVE primary sections; each section's routes
 * become segments revealed inside it via <SegmentNav>.
 *
 * Adding a route means adding one entry here — the sidebar, the segment bar
 * and the RBAC filter all derive from this array, so they cannot drift apart.
 */

export interface NavSegment {
  href: string;
  label: string;
  /** Short gloss shown in the command palette and section landing rail. */
  desc: string;
  icon: LucideIcon;
  /** Role must hold at least ONE of these to see the segment. Empty = open. */
  permissions: Permission[];
}

export interface NavSection {
  id: string;
  label: string;
  /** The route entered when the primary tab itself is clicked. */
  href: string;
  icon: LucideIcon;
  blurb: string;
  segments: NavSegment[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    id: 'decision',
    label: 'Decision',
    href: '/dashboard',
    icon: LayoutDashboard,
    blurb: 'Investment position, approval workflow and board-facing materials.',
    segments: [
      { href: '/', label: 'Overview', desc: 'Programme narrative and headline case', icon: Home, permissions: [] },
      { href: '/dashboard', label: 'Executive Dashboard', desc: 'Investment position at a glance', icon: LayoutDashboard, permissions: ['metrics.headline'] },
      { href: '/approvals', label: 'Approval Workflow', desc: 'Sign and lock the decision snapshot', icon: ShieldCheck, permissions: ['approval.sign'] },
      { href: '/board-memo', label: 'Board Memorandum', desc: 'SHA-256 audited investment memo', icon: FileText, permissions: ['board.materials'] },
      { href: '/board-debate', label: 'Board Debate Swarm', desc: 'Multi-agent CFO / COO / CRO debate', icon: Users, permissions: ['board.materials'] },
      { href: '/presentation', label: 'Boardroom Mode', desc: 'Full-screen presentation deck', icon: Monitor, permissions: ['board.materials'] },
    ],
  },
  {
    id: 'model',
    label: 'Model',
    href: '/financial-model',
    icon: Table,
    blurb: 'The deterministic engine: assumptions, cash flows, capacity and funding.',
    segments: [
      { href: '/archetypes', label: 'Archetype Library', desc: 'Eight investment templates on one engine', icon: LayoutGrid, permissions: ['assumptions.view'] },
      { href: '/financial-model', label: 'Financial Model', desc: 'Year-by-year cash-flow schedule', icon: Table, permissions: ['financials.schedule'] },
      { href: '/assumptions', label: 'Assumptions Register', desc: 'Governed inputs and audit trail', icon: FileSpreadsheet, permissions: ['assumptions.view'] },
      { href: '/capacity-model', label: 'Capacity Model', desc: 'Throughput and automation sizing', icon: Cpu, permissions: ['operations.view'] },
      { href: '/electricity-estimator', label: 'DEWA Tariff Estimator', desc: 'Slab tariff and energy cost model', icon: Zap, permissions: ['operations.view'] },
      { href: '/funding', label: 'Funding & Liquidity', desc: 'Capital structure and drawdown', icon: Landmark, permissions: ['funding.view'] },
      { href: '/external-data', label: 'UAE Tax & WACC', desc: 'External rate and tax basis', icon: Database, permissions: ['assumptions.view'] },
    ],
  },
  {
    id: 'risk',
    label: 'Risk & Scenarios',
    href: '/scenarios',
    icon: GitCompare,
    blurb: 'Downside testing: scenarios, sensitivity, simulation and staged options.',
    segments: [
      { href: '/scenarios', label: 'Scenario Engine', desc: 'Base, optimistic and pessimistic cases', icon: GitCompare, permissions: ['scenario.switch'] },
      { href: '/sensitivity', label: 'Sensitivity Matrix', desc: 'Two-way driver sensitivity', icon: TrendingUp, permissions: ['metrics.advanced'] },
      { href: '/monte-carlo', label: 'Monte Carlo', desc: 'Probabilistic NPV distribution', icon: Dices, permissions: ['metrics.advanced'] },
      { href: '/ai-scenario-studio', label: 'Scenario Studio', desc: 'Generative macro scenarios', icon: Wand2, permissions: ['scenario.author'] },
      { href: '/ai-threat-radar', label: 'Threat Radar', desc: '6-axis risk analysis', icon: ShieldAlert, permissions: ['risk.view'] },
      { href: '/real-options', label: 'Real Options Staging', desc: 'Stage-gate option value', icon: GitBranch, permissions: ['metrics.advanced'] },
    ],
  },
  {
    id: 'portfolio',
    label: 'Portfolio & Ops',
    href: '/portfolio',
    icon: PieChart,
    blurb: 'Capital allocation, delivery performance, vendors and sustainability.',
    segments: [
      { href: '/portfolio', label: 'Portfolio Optimizer', desc: 'Constrained capital allocation', icon: PieChart, permissions: ['portfolio.view'] },
      { href: '/strategic-scorecard', label: 'Strategic Scorecard', desc: 'Non-financial strategic fit', icon: Target, permissions: ['portfolio.view'] },
      { href: '/operational-analytics', label: 'Operational Delivery', desc: 'Fulfilment and SLA analytics', icon: BarChart3, permissions: ['operations.view'] },
      { href: '/vendor-analysis', label: 'Vendor TCO Matrix', desc: 'Total cost of ownership by vendor', icon: Truck, permissions: ['vendor.view'] },
      { href: '/rfp-negotiator', label: 'RFP Negotiator', desc: 'AI-assisted commercial negotiation', icon: Gauge, permissions: ['vendor.negotiate'] },
      { href: '/benefits-tracker', label: 'Benefits Realisation', desc: 'Post-investment benefit tracking', icon: Award, permissions: ['portfolio.view'] },
      { href: '/implementation-plan', label: 'Implementation Gates', desc: 'Delivery milestones and gates', icon: Calendar, permissions: ['operations.view'] },
      { href: '/esg-sustainability', label: 'ESG & Green Loan', desc: 'Carbon offsets and tariff discount', icon: Leaf, permissions: ['esg.view'] },
    ],
  },
  {
    id: 'intelligence',
    label: 'Intelligence & Data',
    href: '/ai-assistant',
    icon: Bot,
    blurb: 'AI advisory, the facility twin, data lineage and platform settings.',
    segments: [
      { href: '/ai-assistant', label: 'Finance Assistant', desc: 'Conversational finance copilot', icon: Bot, permissions: ['ai.advisory'] },
      { href: '/ai-studio', label: 'AI Studio', desc: 'All AI capabilities with provenance badges', icon: Sparkles, permissions: ['ai.advisory'] },
      { href: '/3d-digital-twin', label: '3D Digital Twin', desc: 'Facility layout simulation', icon: Box, permissions: ['operations.view'] },
      { href: '/data-sources', label: 'Data & Methodology', desc: 'Provenance and calculation basis', icon: BookOpen, permissions: [] },
      { href: '/csv-management', label: 'CSV Import & Audit', desc: 'Vendor quote ingestion and lineage', icon: Download, permissions: ['audit.view'] },
      { href: '/settings', label: 'Settings', desc: 'Platform and model configuration', icon: Sliders, permissions: ['settings.manage'] },
    ],
  },
];

/** Flat index of every segment, for the command palette and lookups. */
export const ALL_SEGMENTS: Array<NavSegment & { sectionId: string; sectionLabel: string }> =
  NAV_SECTIONS.flatMap((s) =>
    s.segments.map((seg) => ({ ...seg, sectionId: s.id, sectionLabel: s.label }))
  );

/**
 * Which section owns a pathname. Matches on the longest segment href so that
 * '/' does not swallow every route.
 */
export function sectionForPath(pathname: string): NavSection | undefined {
  let best: { section: NavSection; len: number } | undefined;
  for (const section of NAV_SECTIONS) {
    for (const seg of section.segments) {
      const isMatch = seg.href === '/' ? pathname === '/' : pathname.startsWith(seg.href);
      if (isMatch && (!best || seg.href.length > best.len)) {
        best = { section, len: seg.href.length };
      }
    }
  }
  return best?.section;
}

export function segmentForPath(pathname: string): NavSegment | undefined {
  let best: { seg: NavSegment; len: number } | undefined;
  for (const seg of ALL_SEGMENTS) {
    const isMatch = seg.href === '/' ? pathname === '/' : pathname.startsWith(seg.href);
    if (isMatch && (!best || seg.href.length > best.len)) best = { seg, len: seg.href.length };
  }
  return best?.seg;
}
