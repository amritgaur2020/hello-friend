// Centralized inventory units with proper normalization and parsing logic

export interface UnitOption {
  value: string;
  label: string;
  aliases: string[]; // Alternative names that should map to this unit
  category: 'weight' | 'volume' | 'count' | 'packaging';
}

// Master unit definitions with aliases for flexible parsing
export const MASTER_UNITS: UnitOption[] = [
  // Weight units
  { value: 'kg', label: 'Kilograms (kg)', aliases: ['kg', 'kgs', 'kilogram', 'kilograms', 'kilo', 'kilos'], category: 'weight' },
  { value: 'g', label: 'Grams (g)', aliases: ['g', 'gm', 'gms', 'gram', 'grams'], category: 'weight' },
  
  // Volume units
  { value: 'l', label: 'Liters (L)', aliases: ['l', 'ltr', 'ltrs', 'liter', 'liters', 'litre', 'litres'], category: 'volume' },
  { value: 'ml', label: 'Milliliters (ml)', aliases: ['ml', 'mls', 'milliliter', 'milliliters', 'millilitre', 'millilitres'], category: 'volume' },
  
  // Count units
  { value: 'pcs', label: 'Pieces', aliases: ['pcs', 'pc', 'piece', 'pieces', 'unit', 'units', 'nos', 'no'], category: 'count' },
  { value: 'dozen', label: 'Dozen', aliases: ['dozen', 'dz', 'dzn'], category: 'count' },
  
  // Packaging units
  { value: 'bottle', label: 'Bottle', aliases: ['bottle', 'bottles', 'btl', 'btls'], category: 'packaging' },
  { value: 'can', label: 'Can', aliases: ['can', 'cans'], category: 'packaging' },
  { value: 'box', label: 'Box', aliases: ['box', 'boxes', 'bx'], category: 'packaging' },
  { value: 'pack', label: 'Pack', aliases: ['pack', 'packs', 'pkt', 'packet', 'packets'], category: 'packaging' },
  { value: 'bag', label: 'Bag', aliases: ['bag', 'bags'], category: 'packaging' },
  { value: 'roll', label: 'Roll', aliases: ['roll', 'rolls'], category: 'packaging' },
  { value: 'set', label: 'Set', aliases: ['set', 'sets'], category: 'packaging' },
];

// Build alias lookup map for fast normalization
const UNIT_ALIAS_MAP: Record<string, string> = {};
MASTER_UNITS.forEach(unit => {
  unit.aliases.forEach(alias => {
    UNIT_ALIAS_MAP[alias.toLowerCase()] = unit.value;
  });
});

/**
 * Normalize a unit string to its canonical form
 * @param input - The unit string to normalize (e.g., "Kilogram", "ltrs", "pieces")
 * @returns The normalized unit value (e.g., "kg", "l", "pcs") or the original input if not recognized
 */
export function normalizeUnit(input: string | null | undefined): string {
  if (!input) return 'pcs';
  const normalized = input.toLowerCase().trim();
  return UNIT_ALIAS_MAP[normalized] || normalized;
}

/**
 * Check if a unit is valid (exists in master units or aliases)
 * @param input - The unit string to check
 * @returns True if the unit is valid
 */
export function isValidUnit(input: string): boolean {
  const normalized = input.toLowerCase().trim();
  return normalized in UNIT_ALIAS_MAP;
}

/**
 * Get unit label for display
 * @param value - The unit value (e.g., "kg", "l")
 * @returns The display label (e.g., "Kilograms (kg)")
 */
export function getUnitLabel(value: string): string {
  const unit = MASTER_UNITS.find(u => u.value === value);
  return unit?.label || value;
}

// Pre-defined unit sets for different departments
export const KITCHEN_UNITS = MASTER_UNITS.filter(u => 
  ['kg', 'g', 'l', 'ml', 'pcs', 'dozen', 'box', 'pack'].includes(u.value)
).map(({ value, label }) => ({ value, label }));

export const RESTAURANT_UNITS = MASTER_UNITS.filter(u => 
  ['kg', 'g', 'l', 'ml', 'pcs', 'dozen', 'box', 'pack'].includes(u.value)
).map(({ value, label }) => ({ value, label }));

export const BAR_UNITS = MASTER_UNITS.filter(u => 
  ['bottle', 'can', 'ml', 'l', 'pcs', 'kg', 'pack', 'box'].includes(u.value)
).map(({ value, label }) => ({ value, label }));

export const HOUSEKEEPING_UNITS = MASTER_UNITS.filter(u => 
  ['pcs', 'bottle', 'box', 'kg', 'l', 'pack', 'roll', 'set'].includes(u.value)
).map(({ value, label }) => ({ value, label }));

export const SPA_UNITS = MASTER_UNITS.filter(u => 
  ['pcs', 'bottle', 'ml', 'l', 'kg', 'pack', 'box', 'set'].includes(u.value)
).map(({ value, label }) => ({ value, label }));

// Simple unit arrays for dropdowns (value/label format)
export const ALL_UNITS = MASTER_UNITS.map(({ value, label }) => ({ value, label }));

/**
 * Convert a quantity from one unit to another (within same category)
 * Returns the quantity in the target unit, or null if conversion not possible
 */
export function convertUnits(quantity: number, fromUnit: string, toUnit: string): number | null {
  const from = normalizeUnit(fromUnit);
  const to = normalizeUnit(toUnit);
  
  if (from === to) return quantity;
  
  // Weight conversions
  if (from === 'g' && to === 'kg') return quantity / 1000;
  if (from === 'kg' && to === 'g') return quantity * 1000;
  
  // Volume conversions
  if (from === 'ml' && to === 'l') return quantity / 1000;
  if (from === 'l' && to === 'ml') return quantity * 1000;
  
  // Cannot convert between different categories
  return null;
}

/**
 * Convert ingredient quantity to inventory unit for stock operations
 * This is the SINGLE source of truth for stock checks and deductions
 * @param ingredientQty - Quantity in recipe (e.g., 250)
 * @param ingredientUnit - Unit in recipe (e.g., "g")
 * @param inventoryUnit - Inventory unit (e.g., "kg")
 * @returns Converted quantity in inventory unit, or null if conversion impossible
 */
export function convertIngredientToInventoryUnit(
  ingredientQty: number,
  ingredientUnit: string,
  inventoryUnit: string
): number | null {
  const ingUnit = normalizeUnit(ingredientUnit);
  const invUnit = normalizeUnit(inventoryUnit);
  
  // Same unit - no conversion needed
  if (ingUnit === invUnit) return ingredientQty;
  
  // Use existing convertUnits for the actual conversion
  return convertUnits(ingredientQty, ingUnit, invUnit);
}

/**
 * Check if there's enough stock for an ingredient (with unit conversion)
 * @param ingredientQty - Quantity needed in recipe unit
 * @param ingredientUnit - Unit in recipe (e.g., "g")
 * @param currentStock - Current stock in inventory unit
 * @param inventoryUnit - Inventory unit (e.g., "kg")
 * @returns Object with hasStock boolean and convertedQty
 */
export function checkIngredientStock(
  ingredientQty: number,
  ingredientUnit: string,
  currentStock: number,
  inventoryUnit: string
): { hasStock: boolean; convertedQty: number | null; unitMismatch: boolean } {
  const convertedQty = convertIngredientToInventoryUnit(ingredientQty, ingredientUnit, inventoryUnit);
  
  // If conversion not possible, units are incompatible
  if (convertedQty === null) {
    return { hasStock: false, convertedQty: null, unitMismatch: true };
  }
  
  return { 
    hasStock: currentStock >= convertedQty, 
    convertedQty, 
    unitMismatch: false 
  };
}

/**
 * Calculate cost for an ingredient based on inventory item's cost_price and unit
 * Handles unit conversion between recipe unit and inventory unit
 * @param ingredientQty - Quantity in recipe (e.g., 250)
 * @param ingredientUnit - Unit in recipe (e.g., "g")
 * @param inventoryCostPrice - Cost price per inventory unit
 * @param inventoryUnit - Inventory unit (e.g., "kg")
 * @returns Cost for the ingredient quantity
 */
export function calculateIngredientCost(
  ingredientQty: number,
  ingredientUnit: string,
  inventoryCostPrice: number,
  inventoryUnit: string
): number {
  const ingUnit = normalizeUnit(ingredientUnit);
  const invUnit = normalizeUnit(inventoryUnit);
  
  // If same unit, simple calculation
  if (ingUnit === invUnit) {
    return ingredientQty * inventoryCostPrice;
  }
  
  // Convert ingredient quantity to inventory unit
  const convertedQty = convertUnits(ingredientQty, ingUnit, invUnit);
  
  if (convertedQty !== null) {
    // Successfully converted - cost = converted_qty * cost_per_unit
    return convertedQty * inventoryCostPrice;
  }
  
  // Cannot convert (different categories) - return 0 or estimate
  return 0;
}
