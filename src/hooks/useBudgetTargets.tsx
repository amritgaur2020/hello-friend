import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth } from 'date-fns';

export interface DepartmentBudget {
  id: string;
  department: string;
  month: string;
  revenue_target: number;
  cogs_budget: number;
  profit_target: number;
  created_at: string;
  updated_at: string;
}

export interface BudgetComparison {
  department: string;
  displayName: string;
  revenueTarget: number;
  revenueActual: number;
  revenueVariance: number;
  revenuePercent: number;
  cogsTarget: number;
  cogsActual: number;
  cogsVariance: number;
  cogsPercent: number;
  profitTarget: number;
  profitActual: number;
  profitVariance: number;
  profitPercent: number;
}

interface UseBudgetTargetsResult {
  budgets: DepartmentBudget[];
  isLoading: boolean;
  error: Error | null;
  saveBudget: (budget: Omit<DepartmentBudget, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;
  getBudgetForMonth: (department: string, month: Date) => DepartmentBudget | undefined;
  refetch: () => Promise<void>;
}

// Use localStorage as a simple budget storage since we don't have a database table yet
const STORAGE_KEY = 'hotel_department_budgets';

export function useBudgetTargets(): UseBudgetTargetsResult {
  const [budgets, setBudgets] = useState<DepartmentBudget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchBudgets = async () => {
    setIsLoading(true);
    try {
      // Try to load from localStorage
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setBudgets(JSON.parse(stored));
      }
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveBudgets = (newBudgets: DepartmentBudget[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newBudgets));
    setBudgets(newBudgets);
  };

  const saveBudget = async (budget: Omit<DepartmentBudget, 'id' | 'created_at' | 'updated_at'>) => {
    const now = new Date().toISOString();
    const existingIndex = budgets.findIndex(
      b => b.department === budget.department && b.month === budget.month
    );

    if (existingIndex >= 0) {
      // Update existing
      const updated = [...budgets];
      updated[existingIndex] = {
        ...updated[existingIndex],
        ...budget,
        updated_at: now,
      };
      saveBudgets(updated);
    } else {
      // Create new
      const newBudget: DepartmentBudget = {
        ...budget,
        id: crypto.randomUUID(),
        created_at: now,
        updated_at: now,
      };
      saveBudgets([...budgets, newBudget]);
    }
  };

  const deleteBudget = async (id: string) => {
    const updated = budgets.filter(b => b.id !== id);
    saveBudgets(updated);
  };

  const getBudgetForMonth = (department: string, month: Date): DepartmentBudget | undefined => {
    const monthStr = format(startOfMonth(month), 'yyyy-MM-dd');
    return budgets.find(b => b.department === department && b.month === monthStr);
  };

  useEffect(() => {
    fetchBudgets();
  }, []);

  return {
    budgets,
    isLoading,
    error,
    saveBudget,
    deleteBudget,
    getBudgetForMonth,
    refetch: fetchBudgets,
  };
}

// Helper to calculate budget vs actual comparisons
export function calculateBudgetComparisons(
  departments: Array<{ department: string; displayName: string; revenue: number; cogs: number; grossProfit: number }>,
  getBudgetForMonth: (department: string, month: Date) => DepartmentBudget | undefined,
  month: Date
): BudgetComparison[] {
  return departments.map(dept => {
    const budget = getBudgetForMonth(dept.department, month);
    
    const revenueTarget = budget?.revenue_target || 0;
    const cogsTarget = budget?.cogs_budget || 0;
    const profitTarget = budget?.profit_target || 0;
    
    return {
      department: dept.department,
      displayName: dept.displayName,
      revenueTarget,
      revenueActual: dept.revenue,
      revenueVariance: dept.revenue - revenueTarget,
      revenuePercent: revenueTarget > 0 ? (dept.revenue / revenueTarget) * 100 : 0,
      cogsTarget,
      cogsActual: dept.cogs,
      cogsVariance: dept.cogs - cogsTarget,
      cogsPercent: cogsTarget > 0 ? (dept.cogs / cogsTarget) * 100 : 0,
      profitTarget,
      profitActual: dept.grossProfit,
      profitVariance: dept.grossProfit - profitTarget,
      profitPercent: profitTarget > 0 ? (dept.grossProfit / profitTarget) * 100 : 0,
    };
  });
}
