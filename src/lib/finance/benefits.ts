export interface BenefitTrackerItem {
  id: string;
  category: string;
  approvedYear1BenefitAed: number;
  forecastYear1BenefitAed: number;
  actualYear1BenefitAed: number;
  varianceAed: number;
  ownerRole: string;
  status: 'On Track' | 'Ahead of Plan' | 'Underperforming';
}

export const DEFAULT_BENEFITS_TRACKER: BenefitTrackerItem[] = [
  { id: 'b-1', category: 'Warehouse Picking Labor Savings', approvedYear1BenefitAed: 5000000, forecastYear1BenefitAed: 5200000, actualYear1BenefitAed: 5150000, varianceAed: 150000, ownerRole: 'COO', status: 'Ahead of Plan' },
  { id: 'b-2', category: 'Packaging & Fulfillment Error Reduction', approvedYear1BenefitAed: 1500000, forecastYear1BenefitAed: 1450000, actualYear1BenefitAed: 1400000, varianceAed: -100000, ownerRole: 'COO', status: 'On Track' },
  { id: 'b-3', category: 'Last-Mile Delivery Route Optimization', approvedYear1BenefitAed: 1000000, forecastYear1BenefitAed: 1100000, actualYear1BenefitAed: 1050000, varianceAed: 50000, ownerRole: 'COO / Logistics', status: 'Ahead of Plan' },
  { id: 'b-4', category: 'Incremental Express Contribution Margin', approvedYear1BenefitAed: 2500000, forecastYear1BenefitAed: 2400000, actualYear1BenefitAed: 2350000, varianceAed: -150000, ownerRole: 'CFO / Commercial', status: 'On Track' },
];
