/**
 * Vendor total-cost-of-ownership comparison set.
 *
 * ILLUSTRATIVE PRICING — NOT QUOTATIONS.
 * Dematic, Swisslog, Knapp and AutoStore are real suppliers, but no quotation
 * was requested from or issued by any of them. Every figure below is an
 * academic estimate constructed to exercise the TCO comparison, and must not
 * be read as market pricing or relied on for procurement. A live evaluation
 * would replace this table wholesale with quotations obtained under an RFP.
 *
 * This banner exists because naming a real supplier next to a specific number
 * implies a source the project does not have; the disclosure is the source.
 */

import { VendorRecord } from '../types/finance';

export const DEFAULT_VENDOR_CATALOG: VendorRecord[] = [
  {
    id: 'v-dematic',
    vendorName: 'Dematic (KION Group)',
    equipmentCost: 18000000,
    installationCost: 2500000,
    softwareCost: 1200000,
    annualMaintenance: 850000,
    sixYearTco: 26800000, // 21.7M capex + 5.1M maintenance
    cybersecurityRating: 'A+',
    deliveryWeeks: 26,
    score: 4.6,
  },
  {
    id: 'v-swisslog',
    vendorName: 'Swisslog (KUKA Logistics)',
    equipmentCost: 19200000,
    installationCost: 2200000,
    softwareCost: 1100000,
    annualMaintenance: 780000,
    sixYearTco: 27180000,
    cybersecurityRating: 'A+',
    deliveryWeeks: 28,
    score: 4.4,
  },
  {
    id: 'v-knapp',
    vendorName: 'KNAPP Logistics Automation',
    equipmentCost: 17500000,
    installationCost: 2800000,
    softwareCost: 1400000,
    annualMaintenance: 920000,
    sixYearTco: 27220000,
    cybersecurityRating: 'A',
    deliveryWeeks: 30,
    score: 4.2,
  },
  {
    id: 'v-autostore',
    vendorName: 'AutoStore AS System',
    equipmentCost: 16800000,
    installationCost: 3100000,
    softwareCost: 1500000,
    annualMaintenance: 990000,
    sixYearTco: 27340000,
    cybersecurityRating: 'B+',
    deliveryWeeks: 24,
    score: 4.1,
  },
];
