import type {
  MonthlyBudget,
  Transaction,
  MonthlyStats,
  KakeiboPillar,
  FinancialProfile,
  DebtOrLoan,
  FuelScenarioMode,
  LoanInterestType,
} from '@/types/kakebo';
import {
  calculateAutoDebitsForMonth,
  calculateFuelCosts,
  calculateLoanSchedule,
  WEEKS_PER_MONTH_FACTOR,
} from '@/lib/financial-engine';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

export function getCurrentMonth(): string {
  const nowMonth = format(new Date(), 'yyyy-MM');
  return nowMonth < '2026-10' ? '2026-10' : nowMonth;
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

export interface CalculateMonthlyStatsOptions {
  financialProfile?: FinancialProfile;
  loans?: DebtOrLoan[];
  month?: string;
  scenarioOverride?: FuelScenarioMode;
}

export function calculateMonthlyStats(
  budget: MonthlyBudget | null | undefined,
  transactions: Transaction[],
  options?: CalculateMonthlyStatsOptions
): MonthlyStats {
  const profile = options?.financialProfile;
  const loans = options?.loans || [];
  const targetMonth = options?.month || budget?.month || getCurrentMonth();

  const hasProfileConfigured = Boolean(
    profile &&
      (profile.recurringMonthlyIncome > 0 ||
        profile.monthlyFixedCharges > 0 ||
        profile.autoDebits.length > 0)
  );

  const fixedIncomes = Math.round(
    hasProfileConfigured && profile!.recurringMonthlyIncome > 0
      ? profile!.recurringMonthlyIncome
      : budget
      ? budget.fixedIncomes
      : 0
  );
  const extraIncomes = Math.round(budget ? budget.extraIncomes : 0);

  // Revenus additionnels saisis dans le journal ce mois
  const additionalIncomes = Math.round(
    transactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0)
  );

  const totalIncome = fixedIncomes + extraIncomes + additionalIncomes;

  // Prélèvements automatiques du mois (charges, dette, épargne auto)
  const autoDebits = calculateAutoDebitsForMonth(profile, loans, targetMonth);
  const autoChargesTotal = autoDebits.autoChargesTotal;
  const debtRepaymentsTotal = autoDebits.debtRepaymentsTotal;
  const autoSavingsTotal = autoDebits.autoSavingsTotal;

  // Charges fixes mensuelles (hors prélèvements automatiques)
  const baseFixedCharges = Math.round(
    hasProfileConfigured
      ? profile!.monthlyFixedCharges
      : budget
      ? budget.fixedExpenses
      : 0
  );

  // Total des charges et engagements fixes non-épargne (pour affichage global)
  const totalFixedExpenses = baseFixedCharges + autoChargesTotal + debtRepaymentsTotal;

  // Épargne cible supplémentaire (ne compte jamais deux fois l'épargne automatique)
  const extraTargetSavings = Math.round(
    hasProfileConfigured
      ? profile!.extraTargetSavings || 0
      : budget
      ? budget.targetSavings
      : 0
  );

  // L'épargne automatique compte comme épargne réalisée dans "Épargne cible"
  const targetSavings = autoSavingsTotal + extraTargetSavings;

  // Revenu net disponible après prélèvements automatiques (tous types)
  const netAvailableAfterAutoDebits =
    totalIncome - autoDebits.totalAutoDebits;

  // Enveloppe mensuelle disponible avant dépenses variables
  // = Revenus - Prélèvements auto (tous types) - Charges fixes - Épargne cible supplémentaire
  const disposableBeforeVariable =
    totalIncome -
    autoDebits.totalAutoDebits -
    baseFixedCharges -
    extraTargetSavings;

  const allocatedBudget = Math.max(0, disposableBeforeVariable);

  // Calcul Carburant si activé dans le profil
  const fuelCalc = profile?.fuelConfig
    ? calculateFuelCosts(profile.fuelConfig, options?.scenarioOverride)
    : null;
  const estimatedMonthlyFuelCost = fuelCalc?.enabled ? fuelCalc.monthlyCost : 0;
  const fuelDefaultCategory =
    profile?.fuelConfig?.defaultCategory || 'Transport & Carburant';

  const spentByPillar: Record<KakeiboPillar, number> = {
    needs: 0,
    wants: 0,
    culture: 0,
    unexpected: 0,
  };

  let totalSpent = 0;
  let fuelSpentThisMonth = 0;
  let otherVariableSpent = 0;

  for (const t of transactions) {
    if (t.type === 'expense') {
      const amt = Math.round(t.amount);
      totalSpent += amt;
      if (t.pillar && t.pillar in spentByPillar) {
        spentByPillar[t.pillar] += amt;
      }
      const isFuelTx =
        t.category === fuelDefaultCategory ||
        t.category.toLowerCase().includes('carburant') ||
        (t.description || '').toLowerCase().includes('carburant');
      if (isFuelTx) {
        fuelSpentThisMonth += amt;
      } else {
        otherVariableSpent += amt;
      }
    }
  }

  // Si le module carburant est actif, la part carburant budgétée est provisionnée dans les besoins,
  // et tout dépassement ou autre dépense variable réduit immédiatement le reste à vivre réel.
  const effectiveFuelDeduction = fuelCalc?.enabled
    ? Math.max(estimatedMonthlyFuelCost, fuelSpentThisMonth)
    : fuelSpentThisMonth;

  // Si le carburant est actif mais non encore saisi en transaction individuelle, on l'affiche dans le pilier Besoins
  if (fuelCalc?.enabled && fuelSpentThisMonth < estimatedMonthlyFuelCost) {
    const unloggedFuelProvision = estimatedMonthlyFuelCost - fuelSpentThisMonth;
    spentByPillar.needs += unloggedFuelProvision;
    totalSpent += unloggedFuelProvision;
  }

  const remainingToSpend =
    disposableBeforeVariable - effectiveFuelDeduction - otherVariableSpent;

  // L'épargne réalisée inclut l'épargne automatique (actif) + l'épargne supplémentaire + le solde positif non dépensé
  const currentSavings =
    autoSavingsTotal + Math.max(0, extraTargetSavings + remainingToSpend);

  const savingsRatePercentage =
    totalIncome > 0 ? Math.round((currentSavings / totalIncome) * 100) : 0;

  const percentageByPillar: Record<KakeiboPillar, number> = {
    needs: totalSpent > 0 ? Math.round((spentByPillar.needs / totalSpent) * 100) : 0,
    wants: totalSpent > 0 ? Math.round((spentByPillar.wants / totalSpent) * 100) : 0,
    culture: totalSpent > 0 ? Math.round((spentByPillar.culture / totalSpent) * 100) : 0,
    unexpected: totalSpent > 0 ? Math.round((spentByPillar.unexpected / totalSpent) * 100) : 0,
  };

  // Enveloppes par pilier (pour les alertes 80% et 100%)
  const ratios = profile?.pillarRatios || {
    needs: 60,
    wants: 15,
    culture: 10,
    unexpected: 15,
  };
  const pillarAllocatedBudgets: Record<KakeiboPillar, number> = {
    needs: Math.max(
      estimatedMonthlyFuelCost,
      Math.round((allocatedBudget * ratios.needs) / 100)
    ),
    wants: Math.round((allocatedBudget * ratios.wants) / 100),
    culture: Math.round((allocatedBudget * ratios.culture) / 100),
    unexpected: Math.round((allocatedBudget * ratios.unexpected) / 100),
  };

  const pillarUsagePercentage: Record<KakeiboPillar, number> = {
    needs:
      pillarAllocatedBudgets.needs > 0
        ? Math.round((spentByPillar.needs / pillarAllocatedBudgets.needs) * 100)
        : 0,
    wants:
      pillarAllocatedBudgets.wants > 0
        ? Math.round((spentByPillar.wants / pillarAllocatedBudgets.wants) * 100)
        : 0,
    culture:
      pillarAllocatedBudgets.culture > 0
        ? Math.round((spentByPillar.culture / pillarAllocatedBudgets.culture) * 100)
        : 0,
    unexpected:
      pillarAllocatedBudgets.unexpected > 0
        ? Math.round((spentByPillar.unexpected / pillarAllocatedBudgets.unexpected) * 100)
        : 0,
  };

  // Budget hebdomadaire (hors charges fixes) avec part carburant clairement identifiée
  const weeklyBudget = Math.round(allocatedBudget / WEEKS_PER_MONTH_FACTOR);
  const weeklyFuelBudget = fuelCalc?.enabled ? fuelCalc.weeklyAverageCost : 0;
  const weeklyNonFuelBudget = Math.max(0, weeklyBudget - weeklyFuelBudget);

  const getWeekFuelBudget = (weekIdx: number): number => {
    if (!fuelCalc?.enabled) return 0;
    if (fuelCalc.scenario === 'solo') return fuelCalc.soloWeeklyCost;
    return weekIdx % 2 === 1 ? fuelCalc.weekACost : fuelCalc.weekBCost;
  };

  const weeklyBreakdown: MonthlyStats['weeklyBreakdown'] = [
    {
      weekIndex: 1,
      weekLabel: 'Semaine 1 (J1 - J7)',
      spent: 0,
      budget: weeklyBudget,
      fuelBudget: getWeekFuelBudget(1),
      nonFuelBudget: Math.max(0, weeklyBudget - getWeekFuelBudget(1)),
      fuelSpent: 0,
    },
    {
      weekIndex: 2,
      weekLabel: 'Semaine 2 (J8 - J14)',
      spent: 0,
      budget: weeklyBudget,
      fuelBudget: getWeekFuelBudget(2),
      nonFuelBudget: Math.max(0, weeklyBudget - getWeekFuelBudget(2)),
      fuelSpent: 0,
    },
    {
      weekIndex: 3,
      weekLabel: 'Semaine 3 (J15 - J21)',
      spent: 0,
      budget: weeklyBudget,
      fuelBudget: getWeekFuelBudget(3),
      nonFuelBudget: Math.max(0, weeklyBudget - getWeekFuelBudget(3)),
      fuelSpent: 0,
    },
    {
      weekIndex: 4,
      weekLabel: 'Semaine 4 (J22 - J28)',
      spent: 0,
      budget: weeklyBudget,
      fuelBudget: getWeekFuelBudget(4),
      nonFuelBudget: Math.max(0, weeklyBudget - getWeekFuelBudget(4)),
      fuelSpent: 0,
    },
    {
      weekIndex: 5,
      weekLabel: 'Semaine 5 (J29+)',
      spent: 0,
      budget: weeklyBudget,
      fuelBudget: getWeekFuelBudget(5),
      nonFuelBudget: Math.max(0, weeklyBudget - getWeekFuelBudget(5)),
      fuelSpent: 0,
    },
  ];

  for (const t of transactions) {
    if (t.type === 'expense' && t.date) {
      const wIdx = getWeekIndexForDate(t.date);
      if (wIdx >= 1 && wIdx <= 5) {
        const amt = Math.round(t.amount);
        weeklyBreakdown[wIdx - 1].spent += amt;
        const isFuelTx =
          t.category === fuelDefaultCategory ||
          t.category.toLowerCase().includes('carburant') ||
          (t.description || '').toLowerCase().includes('carburant');
        if (isFuelTx) {
          weeklyBreakdown[wIdx - 1].fuelSpent =
            (weeklyBreakdown[wIdx - 1].fuelSpent || 0) + amt;
        }
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
    autoChargesTotal,
    debtRepaymentsTotal,
    autoSavingsTotal,
    extraTargetSavings,
    netAvailableAfterAutoDebits,
    disposableBeforeVariable,
    estimatedMonthlyFuelCost,
    fuelSpentThisMonth,
    otherVariableSpent,
    weeklyFuelBudget,
    weeklyNonFuelBudget,
    pillarAllocatedBudgets,
    pillarUsagePercentage,
  };
}

/**
 * Calcul de mensualité de prêt (rétrocompatible + support intérêt forfaitaire et frais mensuels)
 */
export function calculateLoanMonthlyPayment(
  principal: number,
  annualInterestRate: number,
  durationMonths: number,
  interestType: LoanInterestType = 'declining',
  monthlyFee: number = 0
): {
  monthlyPayment: number;
  actualMonthlyPayment: number;
  totalPayment: number;
  totalWithFees: number;
  totalInterest: number;
} {
  const res = calculateLoanSchedule({
    principal,
    interestRate: annualInterestRate,
    durationMonths,
    interestType,
    monthlyFee,
  });

  return {
    monthlyPayment: res.baseMonthlyPayment,
    actualMonthlyPayment: res.actualMonthlyPayment,
    totalPayment: res.totalLoanRepayment,
    totalWithFees: res.totalWithFees,
    totalInterest: res.totalInterest,
  };
}

