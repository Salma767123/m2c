// ─── Smart Logistics Calculation Utility ────────────────────────────────────

export interface LogisticsConfig {
  unitWeight: number;
  weightUom: 'KG' | 'GRAM' | 'TON';
  maxWeight: number;
  dimensions: { length: number; width: number; height: number; unit: 'CM' | 'IN' } | null;
  transportTypes: ('AIR' | 'SHIP')[];
  weightRanges: Array<{ minWeight: number; maxWeight: number; recommendedTransport: 'AIR' | 'SHIP' }>;
  airDeliveryDays: number;
  shipDeliveryDays: number;
  airCostPerKg: number;
  shipCostPerKg: number;
  notes: string;
}

export interface LogisticsCalculation {
  unitWeightKg: number;
  totalWeightKg: number;
  recommendedTransport: 'AIR' | 'SHIP';
  selectedTransport: 'AIR' | 'SHIP';
  deliveryDays: number;
  shippingCostPerKg: number;
  totalShippingCost: number;
  exceedsMaxWeight: boolean;
  maxWeightKg: number;
}

export function toKg(weight: number, uom: 'KG' | 'GRAM' | 'TON'): number {
  if (uom === 'GRAM') return weight / 1000;
  if (uom === 'TON') return weight * 1000;
  return weight;
}

export function calculateLogistics(
  config: LogisticsConfig,
  quantity: number,
  overrideTransport?: 'AIR' | 'SHIP'
): LogisticsCalculation {
  const unitWeightKg = toKg(config.unitWeight, config.weightUom);
  const totalWeightKg = unitWeightKg * quantity;
  const maxWeightKg = toKg(config.maxWeight, config.weightUom);
  const exceedsMaxWeight = maxWeightKg > 0 && totalWeightKg > maxWeightKg;

  // Find recommended transport from weight ranges
  let recommendedTransport: 'AIR' | 'SHIP' = config.transportTypes[0] || 'SHIP';
  for (const range of config.weightRanges) {
    if (totalWeightKg >= range.minWeight && totalWeightKg <= range.maxWeight) {
      recommendedTransport = range.recommendedTransport;
      break;
    }
  }

  // If only one transport type is available, force it
  if (config.transportTypes.length === 1) {
    recommendedTransport = config.transportTypes[0];
  }

  const selectedTransport = overrideTransport && config.transportTypes.includes(overrideTransport)
    ? overrideTransport
    : recommendedTransport;

  const deliveryDays = selectedTransport === 'AIR'
    ? config.airDeliveryDays
    : config.shipDeliveryDays;

  const shippingCostPerKg = selectedTransport === 'AIR'
    ? config.airCostPerKg
    : config.shipCostPerKg;

  const totalShippingCost = Math.round(totalWeightKg * shippingCostPerKg * 100) / 100;

  return {
    unitWeightKg,
    totalWeightKg,
    recommendedTransport,
    selectedTransport,
    deliveryDays,
    shippingCostPerKg,
    totalShippingCost,
    exceedsMaxWeight,
    maxWeightKg,
  };
}

export function formatWeight(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(2)} TON`;
  if (kg < 1) return `${(kg * 1000).toFixed(0)} g`;
  return `${kg.toFixed(2)} KG`;
}

export function formatDimensions(dims: LogisticsConfig['dimensions']): string {
  if (!dims) return '';
  return `${dims.length} x ${dims.width} x ${dims.height} ${dims.unit}`;
}
