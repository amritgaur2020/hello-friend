import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TaxSetting {
  id: string;
  name: string;
  description: string | null;
  percentage: number;
  applies_to: string[] | null;
  is_active: boolean;
}

export interface TaxBreakdownItem {
  name: string;
  percentage: number;
  amount: number;
  category: string;
}

// Tax category mapping
export const TAX_CATEGORIES = {
  ROOM_CHARGES: 'room_charges',
  FOOD_BEVERAGE: 'food_beverage',
  SERVICES: 'services',
  AMENITIES: 'amenities',
  LAUNDRY: 'laundry',
  SPA: 'spa',
  PARKING: 'parking',
  OTHERS: 'others',
} as const;

// Map charge categories to tax categories
export const CHARGE_TO_TAX_CATEGORY: Record<string, string> = {
  'Room Charges': TAX_CATEGORIES.ROOM_CHARGES,
  'Bar': TAX_CATEGORIES.FOOD_BEVERAGE,
  'Restaurant': TAX_CATEGORIES.FOOD_BEVERAGE,
  'Kitchen': TAX_CATEGORIES.FOOD_BEVERAGE,
  'Spa': TAX_CATEGORIES.SPA,
  'Laundry': TAX_CATEGORIES.LAUNDRY,
  'Parking': TAX_CATEGORIES.PARKING,
  'Services': TAX_CATEGORIES.SERVICES,
  'Amenities': TAX_CATEGORIES.AMENITIES,
  'Additional': TAX_CATEGORIES.OTHERS,
};

export function useTaxSettings() {
  const { data: taxes = [], isLoading, error } = useQuery({
    queryKey: ['tax_settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tax_settings')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as TaxSetting[];
    },
  });

  // Get applicable taxes for a specific category
  const getTaxesForCategory = (category: string): TaxSetting[] => {
    const taxCategory = CHARGE_TO_TAX_CATEGORY[category] || TAX_CATEGORIES.OTHERS;
    
    return taxes.filter(tax => {
      // If applies_to is null or empty, tax applies to all categories
      if (!tax.applies_to || tax.applies_to.length === 0) {
        return true;
      }
      // Check if this category is in the applies_to list
      return tax.applies_to.includes(taxCategory);
    });
  };

  // Calculate tax for a specific amount and category
  const calculateTaxForCategory = (amount: number, category: string): TaxBreakdownItem[] => {
    const applicableTaxes = getTaxesForCategory(category);
    
    return applicableTaxes.map(tax => ({
      name: tax.name,
      percentage: tax.percentage,
      amount: (amount * tax.percentage) / 100,
      category,
    }));
  };

  // Calculate total tax breakdown for multiple charges
  interface ChargeItem {
    category: string;
    total: number;
  }

  const calculateTaxBreakdown = (charges: ChargeItem[]): TaxBreakdownItem[] => {
    const taxBreakdown: TaxBreakdownItem[] = [];
    
    charges.forEach(charge => {
      const chargeTaxes = calculateTaxForCategory(charge.total, charge.category);
      taxBreakdown.push(...chargeTaxes);
    });

    return taxBreakdown;
  };

  // Get consolidated tax breakdown (grouped by tax name)
  const getConsolidatedTaxBreakdown = (charges: ChargeItem[]): { name: string; percentage: number; amount: number }[] => {
    const breakdown = calculateTaxBreakdown(charges);
    
    // Group by tax name
    const consolidated = breakdown.reduce((acc, item) => {
      const existing = acc.find(t => t.name === item.name && t.percentage === item.percentage);
      if (existing) {
        existing.amount += item.amount;
      } else {
        acc.push({
          name: item.name,
          percentage: item.percentage,
          amount: item.amount,
        });
      }
      return acc;
    }, [] as { name: string; percentage: number; amount: number }[]);

    return consolidated;
  };

  // Calculate total tax amount
  const calculateTotalTax = (charges: ChargeItem[]): number => {
    const breakdown = calculateTaxBreakdown(charges);
    return breakdown.reduce((sum, item) => sum + item.amount, 0);
  };

  // Get summary by category
  const getTaxSummaryByCategory = (charges: ChargeItem[]): Record<string, { subtotal: number; taxAmount: number; total: number }> => {
    const summary: Record<string, { subtotal: number; taxAmount: number; total: number }> = {};

    charges.forEach(charge => {
      const category = charge.category;
      if (!summary[category]) {
        summary[category] = { subtotal: 0, taxAmount: 0, total: 0 };
      }
      
      const chargeTaxes = calculateTaxForCategory(charge.total, category);
      const taxAmount = chargeTaxes.reduce((sum, t) => sum + t.amount, 0);
      
      summary[category].subtotal += charge.total;
      summary[category].taxAmount += taxAmount;
      summary[category].total += charge.total + taxAmount;
    });

    return summary;
  };

  return {
    taxes,
    isLoading,
    error,
    getTaxesForCategory,
    calculateTaxForCategory,
    calculateTaxBreakdown,
    getConsolidatedTaxBreakdown,
    calculateTotalTax,
    getTaxSummaryByCategory,
  };
}
