export interface StageGateMilestone {
  id: string;
  stageNumber: number;
  name: string;
  ownerRole: string;
  plannedMonths: string;
  budgetAllocatedAed: number;
  actualSpendAed: number;
  status: 'Completed' | 'In Progress' | 'Pending Gate Review';
  gateDecision: 'Continue' | 'Continue with Conditions' | 'Hold' | 'Redesign' | 'Stop';
  exitCriteria: string;
}

export const DEFAULT_STAGE_GATES: StageGateMilestone[] = [
  { id: 'gate-1', stageNumber: 1, name: 'Business Case & Board Charter Approval', ownerRole: 'CFO / CEO', plannedMonths: 'M1', budgetAllocatedAed: 200000, actualSpendAed: 180000, status: 'Completed', gateDecision: 'Continue', exitCriteria: 'Signed Board Charter & initial capital allocation' },
  { id: 'gate-2', stageNumber: 2, name: 'Vendor Procurement & TCO Evaluation', ownerRole: 'COO / CTO', plannedMonths: 'M2-M3', budgetAllocatedAed: 300000, actualSpendAed: 290000, status: 'Completed', gateDecision: 'Continue', exitCriteria: 'Vendor contract execution with 26-week lead time warranty' },
  { id: 'gate-3', stageNumber: 3, name: 'Facility Infrastructure Preparation', ownerRole: 'COO', plannedMonths: 'M4-M6', budgetAllocatedAed: 2500000, actualSpendAed: 2450000, status: 'Completed', gateDecision: 'Continue', exitCriteria: 'Civil works, electrical slab, and DEWA 3-phase grid hookup' },
  { id: 'gate-4', stageNumber: 4, name: 'Robotics Assembly & WCS Integration', ownerRole: 'CTO', plannedMonths: 'M7-M9', budgetAllocatedAed: 18000000, actualSpendAed: 17800000, status: 'In Progress', gateDecision: 'Continue with Conditions', exitCriteria: 'WCS API latency < 50ms and zero safety stop faults' },
  { id: 'gate-5', stageNumber: 5, name: 'Phase 1 Pilot & Acceptance Testing', ownerRole: 'COO / Analyst', plannedMonths: 'M10-M11', budgetAllocatedAed: 1500000, actualSpendAed: 0, status: 'Pending Gate Review', gateDecision: 'Hold', exitCriteria: 'Sustain 450 lines/hr/robot for 14 consecutive shifts' },
  { id: 'gate-6', stageNumber: 6, name: 'Full Commercial Go-Live & Post-Review', ownerRole: 'CEO / Board', plannedMonths: 'M12', budgetAllocatedAed: 1500000, actualSpendAed: 0, status: 'Pending Gate Review', gateDecision: 'Hold', exitCriteria: 'Post-Investment Review audit verifying Year-1 benefit realization' },
];
