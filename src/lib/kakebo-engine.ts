import {
  type MonthlyBudget,
  type Transaction,
  type MonthlyStats,
  type KakeiboPillar,
} from '@/types/kakebo';
import { format, parseISO, startOfMonth, endOfMonth, eachWeekOfInterval, endOfWeek, isSameMonth, getDaysInMonth } from 'date-fns';
import { fr } from 'date-fns/locale';

export function getCurrentMonth(): string {
  return format(new Date(), 'yyyy-MM');
}

export function formatMonthLabel(monthStr: string): string {
  try {
    const date = parseISO(`${monthStr}-01`);
    const label = format(date, 'MMMM yyyy', { locale: fr });
    return label.charAt(0).toUpperCase() + label.slice(1);
  } catch {
    return monthStr;
  }
}

export function getWeekIndexForDate(dateStr: string): number {
  const day = parseInt(dateStr.split('-')[2], 10);
  if (day <= 7) return 1;
  if (day <= 14) return 2;
  if (day <= 21) return 3;
  if (day <= 28) return 4;
  return 5;
}

export function calculateMonthlyStats(
  budget: MonthlyBudget | null | undefined,
  transactions: Transaction[]
): MonthlyStats {
  const fixedIncomes = budget ? budget.fixedIncomes : 0;
  const extraIncomes = budget ? budget.extraIncomes : 0;
  const fixedExpenses = budget ? budget.fixedExpenses : 0;
  const targetSavings = budget ? budget.targetSavings : 0;

  // Extra income transactions entered during the month
  const additionalIncomes = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalIncome = fixedIncomes + extraIncomes + additionalIncomes;
  const totalFixedExpenses = fixedExpenses;

  // Allocated pocket money budget according to Kakeibo rule:
  // Available pocket money = Total Incomes - Fixed Expenses - Target Savings
  const allocatedBudget = Math.max(0, totalIncome - totalFixedExpenses - targetSavings);

  const spentByPillar: Record<KakeiboPillar, number> = {
    needs: 0,
    wants: 0,
    culture: 0,
    unexpected: 0,
  };

  let totalSpent = 0;

  for (const t of transactions) {
    if (t.type === 'expense') {
      totalSpent += t.amount;
      if (t.pillar && t.pillar in spentByPillar) {
        spentByPillar[t.pillar] += t.amount;
      }
    }
  }

  const remainingToSpend = allocatedBudget - totalSpent;
  const currentSavings = Math.max(0, totalIncome - totalFixedExpenses - totalSpent);
  const savingsRatePercentage = totalIncome > 0 ? Math.round((currentSavings / totalIncome) * 100) : 0;

  const percentageByPillar: Record<KakeiboPillar, number> = {
    needs: totalSpent > 0 ? Math.round((spentByPillar.needs / totalSpent) * 100) : 0,
    wants: totalSpent > 0 ? Math.round((spentByPillar.wants / totalSpent) * 100) : 0,
    culture: totalSpent > 0 ? Math.round((spentByPillar.culture / totalSpent) * 100) : 0,
    unexpected: totalSpent > 0 ? Math.round((spentByPillar.unexpected / totalSpent) * 100) : 0,
  };

  // 4 to 5 weeks breakdown
  const weeklyBudget = allocatedBudget / 4.33; // Average 4.33 weeks per month
  const weeklyBreakdown: MonthlyStats['weeklyBreakdown'] = [
    { weekIndex: 1, weekLabel: 'Semaine 1 (J1 - J7)', spent: 0, budget: weeklyBudget },
    { weekIndex: 2, weekLabel: 'Semaine 2 (J8 - J14)', spent: 0, budget: weeklyBudget },
    { weekIndex: 3, weekLabel: 'Semaine 3 (J15 - J21)', spent: 0, budget: weeklyBudget },
    { weekIndex: 4, weekLabel: 'Semaine 4 (J22 - J28)', spent: 0, budget: weeklyBudget },
    { weekIndex: 5, weekLabel: 'Semaine 5 (J29+)', spent: 0, budget: weeklyBudget },
  ];

  for (const t of transactions) {
    if (t.type === 'expense' && t.date) {
      const wIdx = getWeekIndexForDate(t.date);
      if (wIdx >= 1 && wIdx <= 5) {
        weeklyBreakdown[wIdx - 1].spent += t.amount;
      }
    }
  }

  return {
    totalIncome,
    totalFixedExpenses,
    targetSavings,
    allocatedBudget,
    totalSpent,
    remainingToSpend,
    currentSavings,
    savingsRatePercentage,
    spentByPillar,
    percentageByPillar,
    weeklyBreakdown,
  };
}

/**
 * Standard Bank Loan Monthly Amortization Formula:
 * M = Principal * (r * (1 + r)^n) / ((1 + r)^n - 1)
 * where r = annualInterestRate / 12 / 100, n = durationMonths
 */
export function calculateLoanMonthlyPayment(
  principal: number,
  annualInterestRate: number,
  durationMonths: number
): {
  monthlyPayment: number;
  totalPayment: number;
  totalInterest: number;
} {
  if (principal <= 0 || durationMonths <= 0) {
    return { monthlyPayment: 0, totalPayment: 0, totalInterest: 0 };
  }

  if (annualInterestRate <= 0) {
    const monthly = Math.round(principal / durationMonths);
    return {
      monthlyPayment: monthly,
      totalPayment: principal,
      totalInterest: 0,
    };
  }

  const monthlyRate = annualInterestRate / 100 / 12;
  const factor = Math.pow(1 + monthlyRate, durationMonths);
  const monthlyPayment = Math.round(principal * ((monthlyRate * factor) / (factor - 1)));
  const totalPayment = monthlyPayment * durationMonths;
  const totalInterest = Math.max(0, totalPayment - principal);

  return {
    monthlyPayment,
    totalPayment,
    totalInterest,
  };
}
