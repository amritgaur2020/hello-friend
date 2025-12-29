import { useState, useEffect, useCallback } from 'react';
import { startOfMonth, endOfMonth, format, addMonths, subMonths } from 'date-fns';

export interface ExpenseBudget {
  id: string;
  month: string;
  category: 'utilities' | 'salaries' | 'maintenance' | 'marketing' | 'insurance' | 'rent' | 'other' | 'total';
  budgetAmount: number;
  department?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseBudgetComparison {
  category: string;
  displayName: string;
  budgeted: number;
  actual: number;
  variance: number;
  percentUsed: number;
  status: 'under' | 'on-track' | 'over';
}

export interface MonthlyNetProfit {
  month: string;
  monthLabel: string;
  revenue: number;
  cogs: number;
  grossProfit: number;
  tax: number;
  operatingProfit: number;
  expenses: number;
  netProfit: number;
  netMargin: number;
}

const EXPENSE_BUDGET_STORAGE_KEY = 'hotel-expense-budgets';
const HISTORICAL_PL_STORAGE_KEY = 'hotel-historical-pl';

export function useExpenseBudgets() {
  const [expenseBudgets, setExpenseBudgets] = useState<ExpenseBudget[]>([]);
  const [historicalPL, setHistoricalPL] = useState<MonthlyNetProfit[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load from localStorage
  useEffect(() => {
    try {
      const storedBudgets = localStorage.getItem(EXPENSE_BUDGET_STORAGE_KEY);
      if (storedBudgets) {
        setExpenseBudgets(JSON.parse(storedBudgets));
      }

      const storedPL = localStorage.getItem(HISTORICAL_PL_STORAGE_KEY);
      if (storedPL) {
        setHistoricalPL(JSON.parse(storedPL));
      }
    } catch (error) {
      console.error('Error loading expense budgets:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save budgets to localStorage
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(EXPENSE_BUDGET_STORAGE_KEY, JSON.stringify(expenseBudgets));
    }
  }, [expenseBudgets, isLoading]);

  // Save historical PL to localStorage
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(HISTORICAL_PL_STORAGE_KEY, JSON.stringify(historicalPL));
    }
  }, [historicalPL, isLoading]);

  const saveExpenseBudget = useCallback((budget: Omit<ExpenseBudget, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    
    setExpenseBudgets(prev => {
      const existingIndex = prev.findIndex(
        b => b.month === budget.month && b.category === budget.category && b.department === budget.department
      );

      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          ...budget,
          updatedAt: now,
        };
        return updated;
      } else {
        return [...prev, {
          ...budget,
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
        }];
      }
    });
  }, []);

  const deleteExpenseBudget = useCallback((id: string) => {
    setExpenseBudgets(prev => prev.filter(b => b.id !== id));
  }, []);

  const getBudgetForMonth = useCallback((month: Date, category?: string, department?: string): ExpenseBudget | undefined => {
    const monthStr = format(startOfMonth(month), 'yyyy-MM-dd');
    return expenseBudgets.find(b => 
      b.month === monthStr && 
      (category ? b.category === category : true) &&
      (department ? b.department === department : !b.department)
    );
  }, [expenseBudgets]);

  const getTotalBudgetForMonth = useCallback((month: Date): number => {
    const monthStr = format(startOfMonth(month), 'yyyy-MM-dd');
    const totalBudget = expenseBudgets.find(b => b.month === monthStr && b.category === 'total' && !b.department);
    if (totalBudget) return totalBudget.budgetAmount;
    
    // Sum up individual category budgets
    return expenseBudgets
      .filter(b => b.month === monthStr && b.category !== 'total' && !b.department)
      .reduce((sum, b) => sum + b.budgetAmount, 0);
  }, [expenseBudgets]);

  const getBudgetsForMonth = useCallback((month: Date): ExpenseBudget[] => {
    const monthStr = format(startOfMonth(month), 'yyyy-MM-dd');
    return expenseBudgets.filter(b => b.month === monthStr);
  }, [expenseBudgets]);

  // Record monthly PL data for historical tracking
  const recordMonthlyPL = useCallback((data: Omit<MonthlyNetProfit, 'monthLabel'>) => {
    setHistoricalPL(prev => {
      const existingIndex = prev.findIndex(p => p.month === data.month);
      const monthLabel = format(new Date(data.month), 'MMM yyyy');
      
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = { ...data, monthLabel };
        return updated;
      }
      
      const newList = [...prev, { ...data, monthLabel }];
      // Keep last 12 months
      return newList.slice(-12);
    });
  }, []);

  const getHistoricalPL = useCallback((months: number = 6): MonthlyNetProfit[] => {
    return historicalPL.slice(-months);
  }, [historicalPL]);

  return {
    expenseBudgets,
    historicalPL,
    isLoading,
    saveExpenseBudget,
    deleteExpenseBudget,
    getBudgetForMonth,
    getTotalBudgetForMonth,
    getBudgetsForMonth,
    recordMonthlyPL,
    getHistoricalPL,
  };
}

export const EXPENSE_CATEGORY_LABELS: Record<string, string> = {
  utilities: 'Utilities',
  salaries: 'Salaries & Wages',
  maintenance: 'Maintenance',
  marketing: 'Marketing',
  insurance: 'Insurance',
  rent: 'Rent/Lease',
  other: 'Other',
  total: 'Total Budget',
};
