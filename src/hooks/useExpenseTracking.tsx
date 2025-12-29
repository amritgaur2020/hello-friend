import { useState, useEffect, useCallback } from 'react';
import { startOfMonth, endOfMonth, format, addMonths, isSameMonth, isAfter } from 'date-fns';

export interface Expense {
  id: string;
  category: 'utilities' | 'salaries' | 'maintenance' | 'marketing' | 'insurance' | 'rent' | 'other';
  description: string;
  amount: number;
  date: string;
  department?: string; // Department allocation
  recurring: boolean;
  recurringFrequency?: 'monthly' | 'quarterly' | 'yearly';
  createdAt: string;
  parentId?: string; // For auto-generated recurring expenses
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

export interface DepartmentExpenseSummary {
  department: string;
  displayName: string;
  total: number;
  byCategory: ExpenseSummary;
}

export interface UseExpenseTrackingResult {
  expenses: Expense[];
  summary: ExpenseSummary;
  departmentSummaries: DepartmentExpenseSummary[];
  addExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => void;
  updateExpense: (id: string, expense: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;
  getExpensesByDateRange: (startDate: Date, endDate: Date) => Expense[];
  getExpensesByDepartment: (department: string, startDate?: Date, endDate?: Date) => Expense[];
  generateRecurringExpenses: () => void;
  isLoading: boolean;
}

const EXPENSE_STORAGE_KEY = 'hotel-expenses';
const RECURRING_GENERATED_KEY = 'hotel-expenses-recurring-generated';

const DEPARTMENT_NAMES: Record<string, string> = {
  bar: 'Bar',
  restaurant: 'Restaurant',
  kitchen: 'Kitchen',
  spa: 'Spa',
  housekeeping: 'Housekeeping',
  frontoffice: 'Front Office',
  general: 'General/Admin',
};

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

  // Auto-generate recurring expenses on mount and when expenses change
  useEffect(() => {
    if (!isLoading && expenses.length > 0) {
      generateRecurringExpenses();
    }
  }, [isLoading]);

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

  const getExpensesByDepartment = (department: string, startDate?: Date, endDate?: Date): Expense[] => {
    let filtered = expenses.filter(exp => exp.department === department);
    if (startDate && endDate) {
      const startStr = format(startDate, 'yyyy-MM-dd');
      const endStr = format(endDate, 'yyyy-MM-dd');
      filtered = filtered.filter(exp => exp.date >= startStr && exp.date <= endStr);
    }
    return filtered;
  };

  const generateRecurringExpenses = useCallback(() => {
    const now = new Date();
    const currentMonth = startOfMonth(now);
    
    // Get last generated month from storage
    const lastGeneratedStr = localStorage.getItem(RECURRING_GENERATED_KEY);
    const lastGenerated = lastGeneratedStr ? new Date(lastGeneratedStr) : null;
    
    // If already generated for current month, skip
    if (lastGenerated && isSameMonth(lastGenerated, now)) {
      return;
    }

    // Find all recurring expenses
    const recurringExpenses = expenses.filter(exp => exp.recurring && !exp.parentId);
    
    if (recurringExpenses.length === 0) return;

    const newExpenses: Expense[] = [];

    recurringExpenses.forEach(recurring => {
      const recurringDate = new Date(recurring.date);
      const frequency = recurring.recurringFrequency || 'monthly';
      
      // Determine next date based on frequency
      let nextDate = new Date(recurringDate);
      while (nextDate <= currentMonth) {
        if (frequency === 'monthly') {
          nextDate = addMonths(nextDate, 1);
        } else if (frequency === 'quarterly') {
          nextDate = addMonths(nextDate, 3);
        } else if (frequency === 'yearly') {
          nextDate = addMonths(nextDate, 12);
        }
      }
      
      // Check if we need to generate for current month
      if (isSameMonth(nextDate, currentMonth)) {
        // Check if already exists for this month
        const exists = expenses.some(exp => 
          exp.parentId === recurring.id && 
          isSameMonth(new Date(exp.date), currentMonth)
        );
        
        if (!exists) {
          newExpenses.push({
            id: crypto.randomUUID(),
            category: recurring.category,
            description: `${recurring.description} (Auto-generated)`,
            amount: recurring.amount,
            date: format(nextDate, 'yyyy-MM-dd'),
            department: recurring.department,
            recurring: false,
            parentId: recurring.id,
            createdAt: new Date().toISOString(),
          });
        }
      }
    });

    if (newExpenses.length > 0) {
      setExpenses(prev => [...prev, ...newExpenses]);
    }
    
    localStorage.setItem(RECURRING_GENERATED_KEY, now.toISOString());
  }, [expenses]);

  // Calculate summary for current month
  const currentMonthExpenses = getExpensesByDateRange(
    startOfMonth(new Date()),
    endOfMonth(new Date())
  );

  const calculateSummary = (expenseList: Expense[]): ExpenseSummary => ({
    utilities: expenseList.filter(e => e.category === 'utilities').reduce((sum, e) => sum + e.amount, 0),
    salaries: expenseList.filter(e => e.category === 'salaries').reduce((sum, e) => sum + e.amount, 0),
    maintenance: expenseList.filter(e => e.category === 'maintenance').reduce((sum, e) => sum + e.amount, 0),
    marketing: expenseList.filter(e => e.category === 'marketing').reduce((sum, e) => sum + e.amount, 0),
    insurance: expenseList.filter(e => e.category === 'insurance').reduce((sum, e) => sum + e.amount, 0),
    rent: expenseList.filter(e => e.category === 'rent').reduce((sum, e) => sum + e.amount, 0),
    other: expenseList.filter(e => e.category === 'other').reduce((sum, e) => sum + e.amount, 0),
    total: expenseList.reduce((sum, e) => sum + e.amount, 0),
  });

  const summary = calculateSummary(currentMonthExpenses);

  // Calculate department summaries
  const departmentSummaries: DepartmentExpenseSummary[] = Object.keys(DEPARTMENT_NAMES).map(dept => {
    const deptExpenses = currentMonthExpenses.filter(e => e.department === dept);
    return {
      department: dept,
      displayName: DEPARTMENT_NAMES[dept],
      total: deptExpenses.reduce((sum, e) => sum + e.amount, 0),
      byCategory: calculateSummary(deptExpenses),
    };
  }).filter(d => d.total > 0);

  return {
    expenses,
    summary,
    departmentSummaries,
    addExpense,
    updateExpense,
    deleteExpense,
    getExpensesByDateRange,
    getExpensesByDepartment,
    generateRecurringExpenses,
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

export const DEPARTMENTS_LIST = [
  { value: 'general', label: 'General/Admin' },
  { value: 'bar', label: 'Bar' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'spa', label: 'Spa' },
  { value: 'housekeeping', label: 'Housekeeping' },
  { value: 'frontoffice', label: 'Front Office' },
] as const;
