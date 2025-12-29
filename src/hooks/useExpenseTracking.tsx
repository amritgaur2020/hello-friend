import { useState, useEffect } from 'react';
import { startOfMonth, endOfMonth, format } from 'date-fns';

export interface Expense {
  id: string;
  category: 'utilities' | 'salaries' | 'maintenance' | 'marketing' | 'insurance' | 'rent' | 'other';
  description: string;
  amount: number;
  date: string;
  department?: string;
  recurring: boolean;
  createdAt: string;
}

export interface ExpenseSummary {
  utilities: number;
  salaries: number;
  maintenance: number;
  marketing: number;
  insurance: number;
  rent: number;
  other: number;
  total: number;
}

export interface UseExpenseTrackingResult {
  expenses: Expense[];
  summary: ExpenseSummary;
  addExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => void;
  updateExpense: (id: string, expense: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;
  getExpensesByDateRange: (startDate: Date, endDate: Date) => Expense[];
  isLoading: boolean;
}

const EXPENSE_STORAGE_KEY = 'hotel-expenses';

export function useExpenseTracking(): UseExpenseTrackingResult {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load expenses from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(EXPENSE_STORAGE_KEY);
      if (stored) {
        setExpenses(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading expenses:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save expenses to localStorage
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(EXPENSE_STORAGE_KEY, JSON.stringify(expenses));
    }
  }, [expenses, isLoading]);

  const addExpense = (expense: Omit<Expense, 'id' | 'createdAt'>) => {
    const newExpense: Expense = {
      ...expense,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    setExpenses(prev => [...prev, newExpense]);
  };

  const updateExpense = (id: string, updates: Partial<Expense>) => {
    setExpenses(prev => prev.map(exp => 
      exp.id === id ? { ...exp, ...updates } : exp
    ));
  };

  const deleteExpense = (id: string) => {
    setExpenses(prev => prev.filter(exp => exp.id !== id));
  };

  const getExpensesByDateRange = (startDate: Date, endDate: Date): Expense[] => {
    const startStr = format(startDate, 'yyyy-MM-dd');
    const endStr = format(endDate, 'yyyy-MM-dd');
    return expenses.filter(exp => exp.date >= startStr && exp.date <= endStr);
  };

  // Calculate summary for current month
  const currentMonthExpenses = getExpensesByDateRange(
    startOfMonth(new Date()),
    endOfMonth(new Date())
  );

  const summary: ExpenseSummary = {
    utilities: currentMonthExpenses.filter(e => e.category === 'utilities').reduce((sum, e) => sum + e.amount, 0),
    salaries: currentMonthExpenses.filter(e => e.category === 'salaries').reduce((sum, e) => sum + e.amount, 0),
    maintenance: currentMonthExpenses.filter(e => e.category === 'maintenance').reduce((sum, e) => sum + e.amount, 0),
    marketing: currentMonthExpenses.filter(e => e.category === 'marketing').reduce((sum, e) => sum + e.amount, 0),
    insurance: currentMonthExpenses.filter(e => e.category === 'insurance').reduce((sum, e) => sum + e.amount, 0),
    rent: currentMonthExpenses.filter(e => e.category === 'rent').reduce((sum, e) => sum + e.amount, 0),
    other: currentMonthExpenses.filter(e => e.category === 'other').reduce((sum, e) => sum + e.amount, 0),
    total: currentMonthExpenses.reduce((sum, e) => sum + e.amount, 0),
  };

  return {
    expenses,
    summary,
    addExpense,
    updateExpense,
    deleteExpense,
    getExpensesByDateRange,
    isLoading,
  };
}

export const EXPENSE_CATEGORIES = [
  { value: 'utilities', label: 'Utilities', description: 'Electricity, water, gas, internet' },
  { value: 'salaries', label: 'Salaries & Wages', description: 'Staff salaries and benefits' },
  { value: 'maintenance', label: 'Maintenance', description: 'Repairs and upkeep' },
  { value: 'marketing', label: 'Marketing', description: 'Advertising and promotions' },
  { value: 'insurance', label: 'Insurance', description: 'Property and liability insurance' },
  { value: 'rent', label: 'Rent/Lease', description: 'Property rent or lease payments' },
  { value: 'other', label: 'Other', description: 'Miscellaneous expenses' },
] as const;
