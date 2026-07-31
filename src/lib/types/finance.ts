export type ExecutiveRole = 'CEO' | 'CFO' | 'COO' | 'CTO' | 'Capital Committee' | 'Analyst';

export type DataClassification =
  | 'Historical'
  | 'Current external'
  | 'Forecast'
  | 'User-entered assumption'
  | 'AI-generated';

export interface AssumptionItem {
  id: string;
  category: 'Capital expenditure' | 'Working capital' | 'Project' | 'Operating benefits' | 'Operating costs' | 'Finance' | 'Tax' | 'Terminal value';
  name: string;
  value: number;
  unit: string;
  dataClassification: DataClassification;
  source: string;
  notes: string;
  lastUpdated: string;
  isEditable: boolean;
}

export interface AssumptionAuditEntry {
  id: string;
  timestamp: string;
  fieldKey: string;
  fieldName: string;
  previousValue: number | string;
  newValue: number | string;
  scenario: string;
  userLabel: string;
}

export interface FinancialAssumptions {
  // CaPeX Items
  automationEquipment: number; // AED 18,000,000
  installationIntegration: number; // AED 2,500,000
  softwareCybersecurity: number; // AED 1,200,000
  trainingLaunch: number; // AED 300,000
  initialWorkingCapital: number; // AED 2,000,000

  // Depreciable Capex Toggles
  depreciableCapexItems?: {
    automationEquipment: boolean;
    installationIntegration: boolean;
    softwareCybersecurity: boolean;
    trainingLaunch: boolean;
  };

  // Project Life
  projectLifeYears: number; // 6 years

  // Benefits
  year1OperatingSavings: number; // AED 7,500,000
  annualSavingsGrowth: number; // 0.04 (4%)
  year1ContributionMargin: number; // AED 2,500,000
  annualMarginGrowth: number; // 0.05 (5%)

  // Costs
  year1AdditionalOpEx: number; // AED 2,200,000
  annualOpExGrowth: number; // 0.03 (3%)

  // Rates
  discountRate: number; // 0.115 (11.5%)
  financeRateMIRR: number; // 0.115 (11.5%)
  reinvestmentRateMIRR: number; // 0.115 (11.5%)
  corporateTaxRate: number; // 0.09 (9%)

  // Terminal
  salvageValue: number; // AED 2,000,000
  workingCapitalRecovery: number; // AED 2,000,000
}

export interface YearlyCashFlow {
  year: number;
  operatingSavings: number;
  incrementalMargin: number;
  totalOperatingBenefits: number;
  additionalOpEx: number;
  ebitda: number;
  depreciation: number;
  ebit: number;
  tax: number;
  nopat: number;
  operatingCashFlow: number;
  changeWorkingCapital: number;
  salvageValue: number;
  workingCapitalRecovery: number;
  terminalCashFlow: number;
  freeCashFlow: number;
  discountFactor: number;
  presentValue: number;
  cumulativeCashFlow: number;
  cumulativeDiscountedCashFlow: number;
}

export interface FinancialMetrics {
  totalInitialCapex: number;
  initialWorkingCapital: number;
  totalInitialOutlay: number; // Negative Year 0 FCF
  npv: number;
  irr: number | null; // Percentage decimal, null if no real root
  irrWarning?: string;
  mirr: number;
  profitabilityIndex: number;
  roiPct: number; // Total Net Gain / Initial Investment * 100
  paybackPeriodYears: number | null;
  discountedPaybackPeriodYears: number | null;
  breakEvenAnnualOperatingBenefit: number;
  breakEvenInitialInvestment: number;
  maxInvestmentCostOverrunPct: number;
  maxOperatingBenefitShortfallPct: number;
  totalProjectCashInflow: number;
  totalProjectNetCashFlow: number;
  averageAnnualCashFlow: number;
  breakEvenYear: number | null;
  valueCreatedAboveHurdleRate: number; // Equivalent to NPV
  decisionStatus: 'Approve' | 'Phased Implementation' | 'Delay Pending Evidence' | 'Reject';
}

export type ScenarioType = 'Optimistic' | 'Base' | 'Pessimistic' | 'Custom';

export interface ScenarioDefinition {
  type: ScenarioType;
  name: string;
  description: string;
  investmentMultiplier: number;
  operatingBenefitMultiplier: number;
  operatingCostMultiplier: number;
  discountRate: number;
}

export interface ScenarioResult {
  definition: ScenarioDefinition;
  metrics: FinancialMetrics;
  yearlyCashFlows: YearlyCashFlow[];
}

export interface SensitivityVariablePoint {
  multiplier: number;
  label: string;
  parameterValue: number;
  npv: number;
  irr: number | null;
  decisionStatus: 'Approve' | 'Phased Implementation' | 'Delay Pending Evidence' | 'Reject';
}

export interface SensitivityVariableResult {
  variableKey: keyof FinancialAssumptions;
  displayName: string;
  unit: string;
  baseValue: number;
  points: SensitivityVariablePoint[];
  npvImpactRange: number;
}

export interface TwoWayMatrixPoint {
  rowValue: number;
  colValue: number;
  npv: number;
  decisionStatus: 'Approve' | 'Phased Implementation' | 'Delay Pending Evidence' | 'Reject';
}

export interface TwoWayMatrix {
  rowLabel: string;
  colLabel: string;
  rowValues: number[];
  colValues: number[];
  matrix: TwoWayMatrixPoint[][];
}

export interface TornadoItem {
  variableName: string;
  lowValueLabel: string;
  highValueLabel: string;
  npvLow: number;
  npvHigh: number;
  baseNpv: number;
  spread: number;
}

export type RiskSeverity = 'Critical' | 'High' | 'Medium' | 'Low';

export interface RiskAlert {
  id: string;
  severity: RiskSeverity;
  title: string;
  explanation: string;
  triggeringMetric: string;
  managementResponse: string;
}

export interface StructedAIResponse {
  decision: 'Approve' | 'Phased Implementation' | 'Delay Pending Evidence' | 'Reject';
  executiveSummary: string;
  keyValueDrivers: string[];
  principalRisks: string[];
  managementControls: string[];
  confidence: 'High' | 'Medium' | 'Low';
  disclaimer: string;
}

/* --- Strategic Scorecard Types --- */
export interface StrategicDimension {
  id: string;
  name: string;
  description: string;
  score: number; // 1 - 5
  weightPct: number; // e.g. 15 for 15%
}

export interface StrategicScorecardResult {
  weightedScore: number; // 1.0 to 5.0
  dimensions: StrategicDimension[];
  strategicFitCategory: 'Exceptional' | 'Strong' | 'Moderate' | 'Weak';
  tradeoffNotice?: string;
}

/* --- Capital Portfolio Types --- */
export interface PortfolioProject {
  id: string;
  name: string;
  category: string;
  initialInvestment: number;
  npv: number;
  irr: number;
  profitabilityIndex: number;
  strategicScore: number;
  riskScore: number; // 1 to 5 (5 = highest risk)
  isMandatory: boolean;
  selected?: boolean;
}

export interface PortfolioOptimizationResult {
  totalBudget: number;
  totalInvestmentCommitted: number;
  remainingCapital: number;
  totalPortfolioNpv: number;
  weightedPortfolioIrr: number;
  averageStrategicScore: number;
  selectedProjects: PortfolioProject[];
  deferredProjects: PortfolioProject[];
}

/* --- Funding Types --- */
export interface FundingSourceItem {
  type: 'Cash' | 'Bank Debt' | 'Lease Financing' | 'Equity';
  amount: number;
  percentage: number;
  annualInterestRate: number; // e.g. 0.065
  termYears: number;
}

export interface FundingAnalysisResult {
  totalFunding: number;
  weightedCostOfCapital: number;
  annualDebtService: number;
  debtServiceCoverageRatio: number; // DSCR
  covenantAlert?: string;
}

/* --- Vendor Comparison Types --- */
export interface VendorRecord {
  id: string;
  vendorName: string;
  equipmentCost: number;
  installationCost: number;
  softwareCost: number;
  annualMaintenance: number;
  sixYearTco: number;
  cybersecurityRating: 'A+' | 'A' | 'B+';
  deliveryWeeks: number;
  score: number;
}

/* --- Approval Workflow Types --- */
export type ApprovalStatus = 'Draft' | 'Under Review' | 'Approved with Conditions' | 'Signed & Approved' | 'Rejected';

export interface DecisionSnapshot {
  id: string;
  timestamp: string;
  signedByRole: ExecutiveRole;
  decisionStatus: string;
  baseNpv: number;
  baseIrr: number;
  totalOutlay: number;
  approvalConditions: string[];
}
