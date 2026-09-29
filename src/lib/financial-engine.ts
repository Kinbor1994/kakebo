import type {
  DebtOrLoan,
  FinancialProfile,
  FuelConfig,
  FuelScenarioMode,
  KakeiboPillar,
  LoanInterestType,
  MonthlyBudget,
  MonthlyStats,
  SavingsGoal,
  Transaction,
} from '@/types/kakebo';
import { addMonths, format, parseISO } from 'date-fns';

export const WEEKS_PER_MONTH_FACTOR = 4.33;

export interface LoanScheduleRow {
  installmentNumber: number;
  month: string;                  // 'YYYY-MM'
  dueDate: string;                // 'YYYY-MM-DD'
  principalPart: number;          // Capital amorti sur cette échéance
  interestPart: number;           // Intérêt sur cette échéance
  feePart: number;                // Frais mensuels sur cette échéance
  basePayment: number;            // Mensualité hors frais (capital + intérêt)
  totalPayment: number;           // Prélèvement réel (mensualité + frais)
  remainingTotalAfter: number;    // Total prêt (capital + intérêts hors frais) restant après échéance
  remainingPrincipalAfter: number;// Capital pur restant dû après échéance
  isPaid: boolean;
}

export interface LoanCalculationResult {
  principal: number;
  interestRate: number;
  interestType: LoanInterestType;
  durationMonths: number;
  monthlyFee: number;
  baseMonthlyPayment: number;     // Mensualité hors frais (ex: 30 000 F)
  actualMonthlyPayment: number;   // Prélèvement réel frais inclus (ex: 30 674 F)
  totalInterest: number;          // Coût total des intérêts (ex: 20 000 F)
  totalFees: number;              // Coût total des frais mensuels (ex: 6 066 F)
  totalLoanRepayment: number;     // Capital + intérêts hors frais (ex: 270 000 F)
  totalWithFees: number;          // Total prélevé frais compris (ex: 276 066 F)
  startMonth: string;             // 'YYYY-MM'
  endMonth: string;               // 'YYYY-MM' (mois de la dernière échéance)
  endDate: string;                // 'YYYY-MM-DD'
  nextInstallment: LoanScheduleRow | null;
  remainingBalance: number;       // Restant à rembourser (hors frais)
  remainingPrincipal: number;     // Capital restant dû
  schedule: LoanScheduleRow[];
}

export interface LoanInputParams {
  principal: number;
  interestRate: number;
  durationMonths: number;
  interestType?: LoanInterestType;
  monthlyFee?: number;
  startDate?: string;             // 'YYYY-MM-DD'
  paidAmount?: number;            // Montant déjà remboursé (hors frais)
  referenceMonth?: string;        // 'YYYY-MM' pour déterminer la prochaine échéance
}

/**
 * Calcule les mensualités et génère l'échéancier complet d'un prêt
 * Supporte l'intérêt simple forfaitaire ('flat', appliqué une seule fois sur le capital)
 * et le taux annuel dégressif ('declining'). Tous les montants sont en entiers F CFA.
 */
export function calculateLoanSchedule(params: LoanInputParams): LoanCalculationResult {
  const principal = Math.max(0, Math.round(params.principal));
  const durationMonths = Math.max(1, Math.round(params.durationMonths));
  const interestRate = Math.max(0, params.interestRate);
  const interestType: LoanInterestType = params.interestType || 'declining';
  const monthlyFee = Math.max(0, Math.round(params.monthlyFee || 0));
  const paidAmount = Math.max(0, Math.round(params.paidAmount || 0));

  const rawStartDate = params.startDate && /^\d{4}-\d{2}-\d{2}$/.test(params.startDate)
    ? params.startDate
    : `${format(new Date(), 'yyyy-MM')}-25`;

  if (principal <= 0) {
    return {
      principal: 0,
      interestRate,
      interestType,
      durationMonths,
      monthlyFee,
      baseMonthlyPayment: 0,
      actualMonthlyPayment: 0,
      totalInterest: 0,
      totalFees: 0,
      totalLoanRepayment: 0,
      totalWithFees: 0,
      startMonth: rawStartDate.substring(0, 7),
      endMonth: rawStartDate.substring(0, 7),
      endDate: rawStartDate,
      nextInstallment: null,
      remainingBalance: 0,
      remainingPrincipal: 0,
      schedule: [],
    };
  }

  let totalInterest = 0;
  let totalLoanRepayment = principal;
  let baseMonthlyPayment = 0;

  if (interestRate <= 0) {
    baseMonthlyPayment = Math.round(principal / durationMonths);
    totalLoanRepayment = principal;
    totalInterest = 0;
  } else if (interestType === 'flat') {
    // Intérêt simple forfaitaire appliqué une seule fois sur le capital
    totalInterest = Math.round(principal * (interestRate / 100));
    totalLoanRepayment = principal + totalInterest;
    baseMonthlyPayment = Math.round(totalLoanRepayment / durationMonths);
  } else {
    // Taux annuel dégressif (amortissement constant)
    const monthlyRate = interestRate / 100 / 12;
    const factor = Math.pow(1 + monthlyRate, durationMonths);
    baseMonthlyPayment = Math.round(principal * ((monthlyRate * factor) / (factor - 1)));
    totalLoanRepayment = baseMonthlyPayment * durationMonths;
    totalInterest = Math.max(0, totalLoanRepayment - principal);
  }

  const actualMonthlyPayment = baseMonthlyPayment + monthlyFee;
  const totalFees = monthlyFee * durationMonths;
  const totalWithFees = totalLoanRepayment + totalFees;

  const startDateObj = parseISO(rawStartDate);
  const schedule: LoanScheduleRow[] = [];

  let remainingTotal = totalLoanRepayment;
  let remainingPrincipal = principal;
  let cumulativePaidCapacity = paidAmount;

  for (let i = 0; i < durationMonths; i++) {
    const installmentDateObj = addMonths(startDateObj, i);
    const dueDateStr = format(installmentDateObj, 'yyyy-MM-dd');
    const monthStr = format(installmentDateObj, 'yyyy-MM');
    const isLast = i === durationMonths - 1;

    let rowBasePayment = isLast ? remainingTotal : Math.min(remainingTotal, baseMonthlyPayment);
    let rowInterest = 0;
    let rowPrincipal = 0;

    if (interestType === 'flat' || interestRate <= 0) {
      rowPrincipal = isLast ? remainingPrincipal : Math.round(principal / durationMonths);
      rowInterest = Math.max(0, rowBasePayment - rowPrincipal);
    } else {
      const monthlyRate = interestRate / 100 / 12;
      rowInterest = Math.round(remainingPrincipal * monthlyRate);
      rowPrincipal = isLast ? remainingPrincipal : Math.max(0, rowBasePayment - rowInterest);
      rowBasePayment = rowPrincipal + rowInterest;
    }

    remainingTotal = Math.max(0, remainingTotal - rowBasePayment);
    remainingPrincipal = Math.max(0, remainingPrincipal - rowPrincipal);

    const isPaid = cumulativePaidCapacity >= rowBasePayment && rowBasePayment > 0;
    if (isPaid) {
      cumulativePaidCapacity -= rowBasePayment;
    }

    schedule.push({
      installmentNumber: i + 1,
      month: monthStr,
      dueDate: dueDateStr,
      principalPart: rowPrincipal,
      interestPart: rowInterest,
      feePart: monthlyFee,
      basePayment: rowBasePayment,
      totalPayment: rowBasePayment + monthlyFee,
      remainingTotalAfter: remainingTotal,
      remainingPrincipalAfter: remainingPrincipal,
      isPaid,
    });
  }

  const startMonth = schedule[0]?.month || rawStartDate.substring(0, 7);
  const lastRow = schedule[schedule.length - 1];
  const endMonth = lastRow?.month || startMonth;
  const endDate = lastRow?.dueDate || rawStartDate;

  const unpaidRows = schedule.filter((r) => !r.isPaid);
  const nextInstallment = params.referenceMonth
    ? unpaidRows.find((r) => r.month >= params.referenceMonth!) || unpaidRows[0] || null
    : unpaidRows[0] || null;

  const remainingBalance = Math.max(0, totalLoanRepayment - paidAmount);
  const currentRemainingPrincipal = Math.max(
    0,
    Math.round(principal * (remainingBalance / (totalLoanRepayment || 1)))
  );

  return {
    principal,
    interestRate,
    interestType,
    durationMonths,
    monthlyFee,
    baseMonthlyPayment,
    actualMonthlyPayment,
    totalInterest,
    totalFees,
    totalLoanRepayment,
    totalWithFees,
    startMonth,
    endMonth,
    endDate,
    nextInstallment,
    remainingBalance,
    remainingPrincipal: currentRemainingPrincipal,
    schedule,
  };
}

export interface FuelCalculationResult {
  enabled: boolean;
  pricePerLiter: number;
  scenario: FuelScenarioMode;
  weeklyLitersAverage: number;
  weekALiters: number;
  weekBLiters: number;
  weekACost: number;
  weekBCost: number;
  weeklyAverageCost: number;
  monthlyCost: number;
  soloWeeklyCost: number;
  soloMonthlyCost: number;
  sharedWeeklyAverageCost: number;
  sharedMonthlyCost: number;
  monthlySavingsInSharedMode: number;
}

/**
 * Calcule les coûts hebdomadaires et mensuels du carburant pour les scénarios Seul et Partagé.
 * Tous les calculs retournent des entiers en F CFA.
 */
export function calculateFuelCosts(
  config: FuelConfig,
  scenarioOverride?: FuelScenarioMode,
  priceOverride?: number
): FuelCalculationResult {
  const pricePerLiter = Math.max(
    0,
    Math.round(priceOverride !== undefined ? priceOverride : config.pricePerLiter)
  );
  const scenario = scenarioOverride || config.activeScenario;
  const soloLiters = Math.max(0, config.litersPerWeekSolo);
  const weekALiters = Math.max(0, config.sharedWeekALiters);
  const weekBLiters = Math.max(0, config.sharedWeekBLiters);

  if (!config.enabled || pricePerLiter <= 0) {
    return {
      enabled: false,
      pricePerLiter,
      scenario,
      weeklyLitersAverage: 0,
      weekALiters: 0,
      weekBLiters: 0,
      weekACost: 0,
      weekBCost: 0,
      weeklyAverageCost: 0,
      monthlyCost: 0,
      soloWeeklyCost: 0,
      soloMonthlyCost: 0,
      sharedWeeklyAverageCost: 0,
      sharedMonthlyCost: 0,
      monthlySavingsInSharedMode: 0,
    };
  }

  const soloWeeklyCost = Math.round(soloLiters * pricePerLiter);
  const soloMonthlyCost = Math.round(soloWeeklyCost * WEEKS_PER_MONTH_FACTOR);

  const sharedAvgLiters = (weekALiters + weekBLiters) / 2;
  const weekACost = Math.round(weekALiters * pricePerLiter);
  const weekBCost = Math.round(weekBLiters * pricePerLiter);
  const sharedWeeklyAverageCost = Math.round(sharedAvgLiters * pricePerLiter);
  const sharedMonthlyCost = Math.round(sharedWeeklyAverageCost * WEEKS_PER_MONTH_FACTOR);

  const isSolo = scenario === 'solo';
  const weeklyLitersAverage = isSolo ? soloLiters : sharedAvgLiters;
  const weeklyAverageCost = isSolo ? soloWeeklyCost : sharedWeeklyAverageCost;
  const monthlyCost = isSolo ? soloMonthlyCost : sharedMonthlyCost;

  return {
    enabled: true,
    pricePerLiter,
    scenario,
    weeklyLitersAverage,
    weekALiters: isSolo ? soloLiters : weekALiters,
    weekBLiters: isSolo ? soloLiters : weekBLiters,
    weekACost: isSolo ? soloWeeklyCost : weekACost,
    weekBCost: isSolo ? soloWeeklyCost : weekBCost,
    weeklyAverageCost,
    monthlyCost,
    soloWeeklyCost,
    soloMonthlyCost,
    sharedWeeklyAverageCost,
    sharedMonthlyCost,
    monthlySavingsInSharedMode: Math.max(0, soloMonthlyCost - sharedMonthlyCost),
  };
}

/**
 * Vérifie si un mois 'YYYY-MM' est compris dans la plage [startMonth, endMonth]
 */
export function isMonthInRange(
  month: string,
  startMonth?: string,
  endMonth?: string
): boolean {
  if (startMonth && month < startMonth) return false;
  if (endMonth && month > endMonth) return false;
  return true;
}

/**
 * Calcule le nombre de mois écoulés (inclusif) entre startMonth et targetMonth
 * Exemple : startMonth = '2026-09', targetMonth = '2026-09' => 1 mois
 *           startMonth = '2026-09', targetMonth = '2027-05' => 9 mois
 */
export function getElapsedMonthsInclusive(startMonth: string, targetMonth: string): number {
  if (!/^\d{4}-\d{2}$/.test(startMonth) || !/^\d{4}-\d{2}$/.test(targetMonth)) {
    return 0;
  }
  if (targetMonth < startMonth) return 0;

  const [startYear, startM] = startMonth.split('-').map(Number);
  const [targetYear, targetM] = targetMonth.split('-').map(Number);

  return (targetYear - startYear) * 12 + (targetM - startM) + 1;
}

export interface MonthlyAutoDebitsBreakdown {
  autoChargesTotal: number;       // Assurances décès, frais bancaires, etc.
  debtRepaymentsTotal: number;    // Échéances de prêts actifs ce mois
  autoSavingsTotal: number;       // Assurance épargne / épargne automatique (actif, jamais dépense)
  totalAutoDebits: number;        // Somme de tous les prélèvements automatiques du mois
  activeItems: Array<{
    title: string;
    amount: number;
    type: 'charge' | 'debt_repayment' | 'auto_savings';
  }>;
}

/**
 * Détermine les prélèvements automatiques actifs pour un mois donné,
 * en résolvant automatiquement les échéances des prêts actifs sans double comptage.
 */
export function calculateAutoDebitsForMonth(
  profile: FinancialProfile | undefined,
  loans: DebtOrLoan[],
  month: string,
  options?: { excludeBankFees?: boolean }
): MonthlyAutoDebitsBreakdown {
  if (!profile) {
    return {
      autoChargesTotal: 0,
      debtRepaymentsTotal: 0,
      autoSavingsTotal: 0,
      totalAutoDebits: 0,
      activeItems: [],
    };
  }

  let autoChargesTotal = 0;
  let debtRepaymentsTotal = 0;
  let autoSavingsTotal = 0;
  const activeItems: MonthlyAutoDebitsBreakdown['activeItems'] = [];
  const handledLoanIds = new Set<number>();
  const handledLoanTitles = new Set<string>();

  for (const item of profile.autoDebits) {
    if (!item.isActive) continue;

    if (
      options?.excludeBankFees &&
      item.type === 'charge' &&
      item.title.toLowerCase().includes('frais')
    ) {
      continue;
    }

    if (item.type === 'debt_repayment' && item.linkedLoanId) {
      const linkedLoan = loans.find((l) => l.id === item.linkedLoanId);
      if (linkedLoan) {
        handledLoanIds.add(item.linkedLoanId);
        handledLoanTitles.add(linkedLoan.title.toLowerCase().trim());
        const sched = calculateLoanSchedule({
          principal: linkedLoan.totalAmount,
          interestRate: linkedLoan.interestRate || 0,
          durationMonths: linkedLoan.durationMonths || 1,
          interestType: linkedLoan.interestType || 'flat',
          monthlyFee: linkedLoan.monthlyFee || 0,
          startDate: linkedLoan.startDate || linkedLoan.createdAt.substring(0, 10),
          paidAmount: linkedLoan.paidAmount,
        });
        const rowForMonth = sched.schedule.find((r) => r.month === month);
        if (rowForMonth) {
          const amt = Math.round(rowForMonth.totalPayment);
          debtRepaymentsTotal += amt;
          activeItems.push({ title: item.title, amount: amt, type: 'debt_repayment' });
        }
        continue;
      }
    }

    if (!isMonthInRange(month, item.startMonth, item.endMonth)) {
      continue;
    }

    const amt = Math.round(item.amount);
    if (item.type === 'charge') {
      autoChargesTotal += amt;
      activeItems.push({ title: item.title, amount: amt, type: 'charge' });
    } else if (item.type === 'debt_repayment') {
      debtRepaymentsTotal += amt;
      handledLoanTitles.add(item.title.toLowerCase().trim());
      activeItems.push({ title: item.title, amount: amt, type: 'debt_repayment' });
    } else if (item.type === 'auto_savings') {
      autoSavingsTotal += amt;
      activeItems.push({ title: item.title, amount: amt, type: 'auto_savings' });
    }
  }

  // Ajouter les échéances des prêts bancaires actifs pour ce mois s'ils ne sont pas déjà dans autoDebits
  for (const loan of loans) {
    if (loan.type !== 'bank_loan' || loan.status !== 'active') continue;
    if (loan.id && handledLoanIds.has(loan.id)) continue;
    if (handledLoanTitles.has(loan.title.toLowerCase().trim())) continue;

    // Un prêt sans startDate explicite utilise le mois de création
    const startDate = loan.startDate || (loan.createdAt ? loan.createdAt.substring(0, 10) : `${month}-25`);
    const sched = calculateLoanSchedule({
      principal: loan.totalAmount,
      interestRate: loan.interestRate || 0,
      durationMonths: loan.durationMonths || 1,
      interestType: loan.interestType || 'declining',
      monthlyFee: loan.monthlyFee || 0,
      startDate,
      paidAmount: loan.paidAmount,
    });

    const rowForMonth = sched.schedule.find((r) => r.month === month);
    if (rowForMonth) {
      const amt = Math.round(rowForMonth.totalPayment);
      debtRepaymentsTotal += amt;
      activeItems.push({
        title: loan.title,
        amount: amt,
        type: 'debt_repayment',
      });
    }
  }

  const totalAutoDebits = autoChargesTotal + debtRepaymentsTotal + autoSavingsTotal;

  return {
    autoChargesTotal,
    debtRepaymentsTotal,
    autoSavingsTotal,
    totalAutoDebits,
    activeItems,
  };
}

export interface NetWorthBreakdown {
  liquidReserve: number;          // Réserve liquide disponible
  cagnottesTotal: number;         // Total des cagnottes d'épargne liquide
  totalLiquidAssets: number;      // Réserve disponible + cagnottes
  safetyThreshold: number;        // Seuil de sécurité liquide (ex: 40 000 F)
  isLiquidBelowSafety: boolean;   // Alerte seuil de sécurité
  lockedSavingsInitial: number;   // Solde initial de l'assurance épargne
  lockedSavingsAccumulated: number;// Cumul des mensualités d'épargne auto
  totalLockedSavings: number;     // Total épargne bloquée (jamais ajouté au liquide)
  totalDebtRemaining: number;     // Capital / total restant dû des prêts actifs
  netWorth: number;               // Liquide + Épargne bloquée - Dettes
}

/**
 * Calcule la Vue Épargne & Dettes en 3 blocs distincts :
 * 1. Liquide (réserve disponible + cagnottes) — soumis au seuil de sécurité
 * 2. Épargne bloquée (solde initial + épargne auto × mois écoulés) — actif non liquide
 * 3. Dettes (capital/montant restant dû des prêts)
 * Patrimoine net = Liquide + Épargne bloquée − Dettes
 */
export function calculateNetWorth(params: {
  profile: FinancialProfile | undefined;
  loans: DebtOrLoan[];
  savingsGoals: SavingsGoal[];
  targetMonth: string;            // 'YYYY-MM'
  currentLiquidReserveOverride?: number;
}): NetWorthBreakdown {
  const { profile, loans, savingsGoals, targetMonth, currentLiquidReserveOverride } = params;

  const liquidReserve = Math.round(
    currentLiquidReserveOverride !== undefined
      ? currentLiquidReserveOverride
      : profile?.initialLiquidReserve || 0
  );

  const cagnottesTotal = Math.round(
    savingsGoals.reduce((sum, g) => sum + (g.currentAmount || 0), 0)
  );

  // L'assurance épargne (épargne bloquée) n'est JAMAIS ajoutée à la réserve disponible
  const totalLiquidAssets = liquidReserve + cagnottesTotal;
  const safetyThreshold = Math.round(profile?.safetyThreshold || 0);
  const isLiquidBelowSafety = safetyThreshold > 0 && liquidReserve < safetyThreshold;

  const lockedSavingsInitial = Math.round(profile?.initialLockedSavings || 0);
  const startMonth = profile?.lockedSavingsStartMonth || targetMonth;
  const elapsedMonths = getElapsedMonthsInclusive(startMonth, targetMonth);

  const monthlyAutoSavings = Math.round(
    (profile?.autoDebits || [])
      .filter((d) => d.isActive && d.type === 'auto_savings')
      .reduce((sum, d) => sum + d.amount, 0)
  );

  const lockedSavingsAccumulated = elapsedMonths * monthlyAutoSavings;
  const totalLockedSavings = lockedSavingsInitial + lockedSavingsAccumulated;

  // Calcul des dettes restantes à targetMonth
  let totalDebtRemaining = 0;
  for (const loan of loans) {
    if (loan.status !== 'active') continue;
    if (loan.type === 'bank_loan') {
      const startDate = loan.startDate || (loan.createdAt ? loan.createdAt.substring(0, 10) : `${targetMonth}-25`);
      const sched = calculateLoanSchedule({
        principal: loan.totalAmount,
        interestRate: loan.interestRate || 0,
        durationMonths: loan.durationMonths || 1,
        interestType: loan.interestType || 'declining',
        monthlyFee: loan.monthlyFee || 0,
        startDate,
        paidAmount: loan.paidAmount,
      });

      const rowAtTarget = sched.schedule.find((r) => r.month === targetMonth);
      if (rowAtTarget) {
        totalDebtRemaining += rowAtTarget.remainingTotalAfter;
      } else if (targetMonth < sched.startMonth) {
        totalDebtRemaining += sched.remainingBalance;
      } else if (targetMonth > sched.endMonth) {
        totalDebtRemaining += 0;
      }
    } else if (loan.type === 'borrowed') {
      totalDebtRemaining += Math.max(0, Math.round(loan.totalAmount - loan.paidAmount));
    }
  }

  const netWorth = totalLiquidAssets + totalLockedSavings - totalDebtRemaining;

  return {
    liquidReserve,
    cagnottesTotal,
    totalLiquidAssets,
    safetyThreshold,
    isLiquidBelowSafety,
    lockedSavingsInitial,
    lockedSavingsAccumulated,
    totalLockedSavings,
    totalDebtRemaining,
    netWorth,
  };
}

export interface ScenarioProjectionRow {
  month: string;                  // 'YYYY-MM'
  income: number;
  autoSavings: number;            // Épargne automatique du mois (ex: 10 000 F)
  debtRepayment: number;          // Prêt prélevé ce mois (ex: 30 674 F puis 0 F en juin 2027)
  autoCharges: number;            // Assurance décès + frais éventuels
  netBeforeExpenses: number;      // Revenu disponible après assurances et prêt (ex: 38 753 F puis 69 427 F en juin 2027)
  fixedCharges: number;           // Dépenses fixes (ex: 20 000 F)
  extraSavings: number;           // Épargne cible supplémentaire
  fuelCost: number;               // Coût carburant du scénario
  unexpectedExpense: number;      // Imprévu ponctuel éventuel sur ce mois
  monthlyMargin: number;          // Marge mensuelle nette (peut être négative si imprévu)
  cumulativeLiquidReserve: number;// Évolution de la réserve liquide
  cumulativeLockedSavings: number;// Évolution de l'épargne bloquée (jamais mélangée au liquide)
  remainingDebt: number;          // Dette restante en fin de mois
  netWorth: number;               // Patrimoine net en fin de mois
  isLoanEndedThisMonth: boolean;  // Indique le premier mois après l'extinction du prêt
  hasNegativeMarginAlert: boolean;// Solde mensuel négatif (risque d'agios / ponction réserve)
  hasBelowSafetyAlert: boolean;   // Réserve liquide sous le seuil de sécurité
}

export interface MultiMonthProjectionResult {
  startMonth: string;
  monthsCount: number;
  fuelPriceUsed: number;
  unexpectedExpenseAmount: number;
  unexpectedExpenseMonth: string;
  scenarioA: ScenarioProjectionRow[]; // Carburant seul / standard
  scenarioB: ScenarioProjectionRow[]; // Carburant partagé / alterné
}

/**
 * Génère la projection mois par mois (9 mois et plus) comparant côte à côte
 * Scénario A (carburant seul) et Scénario B (carburant partagé), avec prise en compte
 * automatique de la fin des prêts, du prix du carburant et d'un imprévu ponctuel.
 */
export function generateMultiMonthProjection(params: {
  profile: FinancialProfile;
  loans: DebtOrLoan[];
  savingsGoals?: SavingsGoal[];
  startMonth: string;             // Ex: '2026-09'
  monthsCount?: number;           // Défaut: 10 (sept 2026 à juin 2027)
  fuelPriceOverride?: number;
  unexpectedExpenseAmount?: number;
  unexpectedExpenseMonth?: string;// Ex: '2026-10'
  excludeBankFeesInProjection?: boolean;
}): MultiMonthProjectionResult {
  const {
    profile,
    loans,
    savingsGoals = [],
    startMonth,
    monthsCount = 10,
    fuelPriceOverride,
    unexpectedExpenseAmount = 0,
    unexpectedExpenseMonth,
    excludeBankFeesInProjection = true,
  } = params;

  const fuelPriceUsed = Math.round(
    fuelPriceOverride !== undefined ? fuelPriceOverride : profile.fuelConfig.pricePerLiter
  );

  const fuelSolo = calculateFuelCosts(profile.fuelConfig, 'solo', fuelPriceUsed);
  const fuelShared = calculateFuelCosts(profile.fuelConfig, 'shared', fuelPriceUsed);

  const cagnottesTotal = Math.round(
    savingsGoals.reduce((sum, g) => sum + (g.currentAmount || 0), 0)
  );

  const buildScenario = (scenarioMode: FuelScenarioMode): ScenarioProjectionRow[] => {
    const rows: ScenarioProjectionRow[] = [];
    const monthlyFuel = scenarioMode === 'solo' ? fuelSolo.monthlyCost : fuelShared.monthlyCost;

    let currentLiquidReserve = Math.round(profile.initialLiquidReserve);
    const startDateObj = parseISO(`${startMonth}-01`);
    let previousHadDebt = false;

    for (let i = 0; i < monthsCount; i++) {
      const mStr = format(addMonths(startDateObj, i), 'yyyy-MM');
      const income = Math.round(profile.recurringMonthlyIncome);
      const fixedCharges = Math.round(profile.monthlyFixedCharges);
      const extraSavings = Math.round(profile.extraTargetSavings || 0);

      // Calcul des prélèvements hors frais bancaires de 100 F si demandé pour la projection de référence
      const debitsWithoutBankFees = calculateAutoDebitsForMonth(profile, loans, mStr, {
        excludeBankFees: true,
      });
      const debitsActual = calculateAutoDebitsForMonth(profile, loans, mStr, {
        excludeBankFees: excludeBankFeesInProjection,
      });

      // Reçu net disponible après assurances et prêt (ex: 38 753 F puis 69 427 F en juin 2027)
      const netBeforeExpenses =
        income -
        debitsWithoutBankFees.autoSavingsTotal -
        debitsWithoutBankFees.debtRepaymentsTotal -
        debitsWithoutBankFees.autoChargesTotal;

      const unexpectedThisMonth =
        unexpectedExpenseAmount > 0 &&
        (unexpectedExpenseMonth ? mStr === unexpectedExpenseMonth : i === 1)
          ? Math.round(unexpectedExpenseAmount)
          : 0;

      const monthlyMargin =
        income -
        debitsActual.totalAutoDebits -
        fixedCharges -
        extraSavings -
        monthlyFuel -
        unexpectedThisMonth;

      currentLiquidReserve = currentLiquidReserve + monthlyMargin;

      const netWorthSnapshot = calculateNetWorth({
        profile,
        loans,
        savingsGoals,
        targetMonth: mStr,
        currentLiquidReserveOverride: currentLiquidReserve,
      });

      const isLoanEndedThisMonth = previousHadDebt && debitsWithoutBankFees.debtRepaymentsTotal === 0;
      previousHadDebt = debitsWithoutBankFees.debtRepaymentsTotal > 0;

      rows.push({
        month: mStr,
        income,
        autoSavings: debitsActual.autoSavingsTotal,
        debtRepayment: debitsActual.debtRepaymentsTotal,
        autoCharges: debitsActual.autoChargesTotal,
        netBeforeExpenses,
        fixedCharges,
        extraSavings,
        fuelCost: monthlyFuel,
        unexpectedExpense: unexpectedThisMonth,
        monthlyMargin,
        cumulativeLiquidReserve: currentLiquidReserve,
        cumulativeLockedSavings: netWorthSnapshot.totalLockedSavings,
        remainingDebt: netWorthSnapshot.totalDebtRemaining,
        netWorth:
          currentLiquidReserve +
          cagnottesTotal +
          netWorthSnapshot.totalLockedSavings -
          netWorthSnapshot.totalDebtRemaining,
        isLoanEndedThisMonth,
        hasNegativeMarginAlert: monthlyMargin < 0,
        hasBelowSafetyAlert:
          profile.safetyThreshold > 0 && currentLiquidReserve < profile.safetyThreshold,
      });
    }

    return rows;
  };

  const defaultUnexpectedMonth =
    unexpectedExpenseMonth || format(addMonths(parseISO(`${startMonth}-01`), 1), 'yyyy-MM');

  return {
    startMonth,
    monthsCount,
    fuelPriceUsed,
    unexpectedExpenseAmount: Math.round(unexpectedExpenseAmount),
    unexpectedExpenseMonth: defaultUnexpectedMonth,
    scenarioA: buildScenario('solo'),
    scenarioB: buildScenario('shared'),
  };
}

export type FinancialAlertSeverity = 'warning' | 'danger';

export type FinancialAlertType =
  | 'negative_balance_overdraft_risk'
  | 'liquid_below_safety_threshold'
  | 'pillar_80_percent'
  | 'pillar_100_percent'
  | 'weekly_fuel_exceeded';

export interface FinancialAlert {
  id: string;
  type: FinancialAlertType;
  severity: FinancialAlertSeverity;
  title: string;
  message: string;
  pillar?: KakeiboPillar;
}

/**
 * Évalue toutes les alertes financières pour un mois et une situation donnés :
 * 1. Solde prévisionnel négatif (risque d'agios)
 * 2. Réserve liquide sous le seuil de sécurité
 * 3. Pilier dépassé à 80 % puis 100 %
 * 4. Carburant au-dessus de l'enveloppe hebdomadaire
 */
export function evaluateFinancialAlerts(params: {
  remainingToSpend: number;
  liquidReserve: number;
  safetyThreshold: number;
  spentByPillar: Record<KakeiboPillar, number>;
  pillarAllocatedBudgets: Record<KakeiboPillar, number>;
  weeklyBreakdown: Array<{
    weekIndex: number;
    weekLabel: string;
    spent: number;
    budget: number;
    fuelBudget?: number;
    fuelSpent?: number;
  }>;
  pillarNames?: Record<KakeiboPillar, string>;
}): FinancialAlert[] {
  const alerts: FinancialAlert[] = [];
  const {
    remainingToSpend,
    liquidReserve,
    safetyThreshold,
    spentByPillar,
    pillarAllocatedBudgets,
    weeklyBreakdown,
    pillarNames = {
      needs: 'Besoins essentiels',
      wants: 'Envies & Plaisirs',
      culture: 'Culture & Formation',
      unexpected: 'Imprévus & Extras',
    },
  } = params;

  // 1. Solde prévisionnel négatif (risque d'agios)
  if (remainingToSpend < 0) {
    alerts.push({
      id: 'alert-negative-balance',
      type: 'negative_balance_overdraft_risk',
      severity: 'danger',
      title: 'Solde prévisionnel négatif — Risque d’agios',
      message: `Déficit mensuel de ${Math.abs(Math.round(remainingToSpend)).toLocaleString('fr-FR')} F CFA. Risque de découvert bancaire (agios + taxes) ou ponction sur votre réserve liquide.`,
    });
  }

  // 2. Réserve liquide sous le seuil de sécurité
  if (safetyThreshold > 0 && liquidReserve < safetyThreshold) {
    alerts.push({
      id: 'alert-safety-threshold',
      type: 'liquid_below_safety_threshold',
      severity: 'danger',
      title: 'Réserve liquide sous le seuil de sécurité',
      message: `Votre réserve disponible (${Math.round(liquidReserve).toLocaleString('fr-FR')} F CFA) est passée sous votre seuil d'urgence intouchable (${Math.round(safetyThreshold).toLocaleString('fr-FR')} F CFA).`,
    });
  }

  // 3. Piliers dépassés à 80 % puis 100 %
  const pillars: KakeiboPillar[] = ['needs', 'wants', 'culture', 'unexpected'];
  for (const p of pillars) {
    const allocated = pillarAllocatedBudgets[p] || 0;
    const spent = spentByPillar[p] || 0;
    if (allocated <= 0 || spent <= 0) continue;

    const ratio = Math.round((spent / allocated) * 100);
    if (ratio >= 100) {
      alerts.push({
        id: `alert-pillar-100-${p}`,
        type: 'pillar_100_percent',
        severity: 'danger',
        pillar: p,
        title: `Pilier « ${pillarNames[p]} » dépassé (${ratio}%)`,
        message: `Vous avez dépensé ${Math.round(spent).toLocaleString('fr-FR')} F CFA sur une enveloppe de ${Math.round(allocated).toLocaleString('fr-FR')} F CFA.`,
      });
    } else if (ratio >= 80) {
      alerts.push({
        id: `alert-pillar-80-${p}`,
        type: 'pillar_80_percent',
        severity: 'warning',
        pillar: p,
        title: `Pilier « ${pillarNames[p]} » à ${ratio}%`,
        message: `Attention, vous approchez de la limite de votre enveloppe (${Math.round(spent).toLocaleString('fr-FR')} / ${Math.round(allocated).toLocaleString('fr-FR')} F CFA).`,
      });
    }
  }

  // 4. Carburant au-dessus de l'enveloppe hebdomadaire
  for (const w of weeklyBreakdown) {
    const fuelBudget = w.fuelBudget || 0;
    const fuelSpent = w.fuelSpent || 0;
    if (fuelBudget > 0 && fuelSpent > fuelBudget) {
      alerts.push({
        id: `alert-fuel-week-${w.weekIndex}`,
        type: 'weekly_fuel_exceeded',
        severity: 'warning',
        title: `Enveloppe carburant dépassée (${w.weekLabel})`,
        message: `Carburant dépensé : ${Math.round(fuelSpent).toLocaleString('fr-FR')} F CFA pour une enveloppe hebdomadaire de ${Math.round(fuelBudget).toLocaleString('fr-FR')} F CFA.`,
      });
    }
  }

  return alerts;
}

/**
 * Crée un profil financier vierge et générique pour tout nouvel utilisateur
 */
export function createDefaultFinancialProfile(currentMonth?: string): FinancialProfile {
  const defaultMonth = currentMonth || format(new Date(), 'yyyy-MM');
  return {
    recurringMonthlyIncome: 0,
    paydayDay: 25,
    monthlyFixedCharges: 0,
    extraTargetSavings: 0,
    initialLiquidReserve: 0,
    safetyThreshold: 0,
    initialLockedSavings: 0,
    lockedSavingsStartMonth: defaultMonth,
    autoDebits: [],
    fuelConfig: {
      enabled: false,
      pricePerLiter: 850,
      litersPerWeekSolo: 5,
      sharedWeekALiters: 5,
      sharedWeekBLiters: 2,
      activeScenario: 'solo',
      defaultPillar: 'needs',
      defaultCategory: 'Transport & Carburant',
    },
    pillarRatios: {
      needs: 60,
      wants: 15,
      culture: 10,
      unexpected: 15,
    },
  };
}

/**
 * Génère le jeu de données de démonstration / référence (utilisable en 1 clic dans Réglages ou dans les tests)
 */
export function createDemoReferenceData(): {
  profile: FinancialProfile;
  demoLoan: Omit<DebtOrLoan, 'id'>;
} {
  const profile: FinancialProfile = {
    recurringMonthlyIncome: 80000,
    paydayDay: 25,
    monthlyFixedCharges: 20000,
    extraTargetSavings: 0,
    initialLiquidReserve: 80000,
    safetyThreshold: 40000,
    initialLockedSavings: 0,
    lockedSavingsStartMonth: '2026-09',
    autoDebits: [
      {
        id: 'auto-nsia-epargne',
        title: 'Assurance Épargne (NSIA)',
        amount: 10000,
        type: 'auto_savings',
        dayOfMonth: 25,
        isActive: true,
      },
      {
        id: 'auto-nsia-deces',
        title: 'Assurance Décès de proche (NSIA)',
        amount: 573,
        type: 'charge',
        dayOfMonth: 25,
        isActive: true,
      },
      {
        id: 'auto-frais-bancaires',
        title: 'Frais bancaires (frais communication)',
        amount: 100,
        type: 'charge',
        dayOfMonth: 25,
        isActive: true,
      },
    ],
    fuelConfig: {
      enabled: true,
      pricePerLiter: 850,
      litersPerWeekSolo: 5,
      sharedWeekALiters: 5,
      sharedWeekBLiters: 2,
      activeScenario: 'solo',
      defaultPillar: 'needs',
      defaultCategory: 'Transport & Carburant',
    },
    pillarRatios: {
      needs: 70,
      wants: 10,
      culture: 10,
      unexpected: 10,
    },
  };

  const demoLoan: Omit<DebtOrLoan, 'id'> = {
    type: 'bank_loan',
    title: 'Prêt scolaire',
    contactName: 'Banque / Organisme',
    totalAmount: 250000,
    paidAmount: 0,
    monthlyPayment: 30000,
    monthlyFee: 674,
    interestType: 'flat',
    startDate: '2026-09-25',
    durationMonths: 9,
    interestRate: 8,
    totalInterest: 20000,
    dueDate: '2027-05-25',
    dayOfMonth: 25,
    notes: 'Capital 250 000 F, intérêt simple forfaitaire 8% (total 270 000 F sur 9 mois) + 674 F de frais mensuels (30 674 F/mois).',
    status: 'active',
    createdAt: '2026-09-01T00:00:00.000Z',
  };

  return { profile, demoLoan };
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
  const targetMonth = options?.month || budget?.month || format(new Date(), 'yyyy-MM');

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

  const additionalIncomes = Math.round(
    transactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0)
  );

  const totalIncome = fixedIncomes + extraIncomes + additionalIncomes;

  const autoDebits = calculateAutoDebitsForMonth(profile, loans, targetMonth);
  const autoChargesTotal = autoDebits.autoChargesTotal;
  const debtRepaymentsTotal = autoDebits.debtRepaymentsTotal;
  const autoSavingsTotal = autoDebits.autoSavingsTotal;

  const baseFixedCharges = Math.round(
    hasProfileConfigured
      ? profile!.monthlyFixedCharges
      : budget
      ? budget.fixedExpenses
      : 0
  );

  const totalFixedExpenses = baseFixedCharges + autoChargesTotal + debtRepaymentsTotal;

  const extraTargetSavings = Math.round(
    hasProfileConfigured
      ? profile!.extraTargetSavings || 0
      : budget
      ? budget.targetSavings
      : 0
  );

  // L'épargne automatique compte comme épargne réalisée dans "Épargne cible" sans double comptage
  const targetSavings = autoSavingsTotal + extraTargetSavings;
  const netAvailableAfterAutoDebits = totalIncome - autoDebits.totalAutoDebits;

  const disposableBeforeVariable =
    totalIncome -
    autoDebits.totalAutoDebits -
    baseFixedCharges -
    extraTargetSavings;

  const allocatedBudget = Math.max(0, disposableBeforeVariable);

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

  const effectiveFuelDeduction = fuelCalc?.enabled
    ? Math.max(estimatedMonthlyFuelCost, fuelSpentThisMonth)
    : fuelSpentThisMonth;

  if (fuelCalc?.enabled && fuelSpentThisMonth < estimatedMonthlyFuelCost) {
    const unloggedFuelProvision = estimatedMonthlyFuelCost - fuelSpentThisMonth;
    spentByPillar.needs += unloggedFuelProvision;
    totalSpent += unloggedFuelProvision;
  }

  const remainingToSpend =
    disposableBeforeVariable - effectiveFuelDeduction - otherVariableSpent;

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

