import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMemo } from 'react';

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

// Fixed tax category mapping for non-department categories
export const FIXED_TAX_CATEGORIES = {
  ROOM_CHARGES: 'room_charges',
  SERVICES: 'services',
  AMENITIES: 'amenities',
  LAUNDRY: 'laundry',
  PARKING: 'parking',
  OTHERS: 'others',
} as const;

// Helper to convert department/category name to tax category key
export const normalizeTaxCategory = (category: string): string => {
  // First check if it's a known fixed category
  const lowerCategory = category.toLowerCase();
  
  // Direct mappings for common names
  const directMappings: Record<string, string> = {
    'room charges': 'room_charges',
    'room_charges': 'room_charges',
    'bar': 'bar',
    'restaurant': 'restaurant',
    'kitchen': 'kitchen',
    'spa': 'spa',
    'spa & wellness': 'spa',
    'laundry': 'laundry',
    'parking': 'parking',
    'services': 'services',
    'amenities': 'amenities',
    'additional': 'others',
    'others': 'others',
  };
  
  if (directMappings[lowerCategory]) {
    return directMappings[lowerCategory];
  }
  
  // Convert to snake_case for dynamic matching
  return lowerCategory.replace(/\s+/g, '_');
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
    const taxCategory = normalizeTaxCategory(category);
    
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
