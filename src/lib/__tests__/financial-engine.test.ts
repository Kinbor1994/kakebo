import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateLoanSchedule,
  calculateFuelCosts,
  calculateAutoDebitsForMonth,
  calculateNetWorth,
  generateMultiMonthProjection,
  evaluateFinancialAlerts,
  createDefaultFinancialProfile,
  createDemoReferenceData,
  calculateMonthlyStats,
} from '../financial-engine.ts';
import type { DebtOrLoan, Transaction } from '../../types/kakebo.ts';

describe('Financial Engine — Generic & Reference Test Suite', () => {
  it('1. Échéancier du prêt : 9 mensualités de sept. 2026 à mai 2027, total 270 000 F (30 674 F/mois frais inclus)', () => {
    const { demoLoan } = createDemoReferenceData();
    const res = calculateLoanSchedule({
      principal: demoLoan.totalAmount,
      interestRate: demoLoan.interestRate || 8,
      durationMonths: demoLoan.durationMonths || 9,
      interestType: demoLoan.interestType || 'flat',
      monthlyFee: demoLoan.monthlyFee || 674,
      startDate: demoLoan.startDate || '2026-09-25',
      paidAmount: 0,
    });

    assert.equal(res.schedule.length, 9);
    assert.equal(res.startMonth, '2026-09');
    assert.equal(res.endMonth, '2027-05');
    assert.equal(res.totalInterest, 20000);
    assert.equal(res.totalLoanRepayment, 270000);
    assert.equal(res.baseMonthlyPayment, 30000);
    assert.equal(res.actualMonthlyPayment, 30674);
    assert.equal(res.schedule[8].remainingTotalAfter, 0);
  });

  it('2. Reste à vivre d’octobre 2026 — Scénario A (~350 F ±100 F) et Scénario B (~5 850 F ±100 F)', () => {
    const { profile, demoLoan } = createDemoReferenceData();
    const activeLoans: DebtOrLoan[] = [{ ...demoLoan, id: 1 }];
    const emptyTx: Transaction[] = [];

    const statsScenarioA = calculateMonthlyStats(null, emptyTx, {
      financialProfile: profile,
      loans: activeLoans,
      month: '2026-10',
      scenarioOverride: 'solo',
    });

    const statsScenarioB = calculateMonthlyStats(null, emptyTx, {
      financialProfile: profile,
      loans: activeLoans,
      month: '2026-10',
      scenarioOverride: 'shared',
    });

    // Tolérance ±100 F autour de 350 F (Scénario A) et 5 850 F (Scénario B)
    assert.ok(
      Math.abs(statsScenarioA.remainingToSpend - 350) <= 100,
      `Attendu ~350 F (±100), obtenu ${statsScenarioA.remainingToSpend} F`
    );
    assert.ok(
      Math.abs(statsScenarioB.remainingToSpend - 5850) <= 100,
      `Attendu ~5 850 F (±100), obtenu ${statsScenarioB.remainingToSpend} F`
    );

    // L'épargne automatique (10 000 F) compte comme épargne cible réalisée sans être comptée deux fois
    assert.equal(statsScenarioA.targetSavings, 10000);
    assert.equal(statsScenarioA.autoSavingsTotal, 10000);

    // Mise à jour immédiate à chaque dépense saisie
    const txWithExpense: Transaction[] = [
      {
        id: 1,
        month: '2026-10',
        date: '2026-10-12',
        amount: 200,
        type: 'expense',
        pillar: 'wants',
        category: 'Sorties & Détente',
        createdAt: '2026-10-12T10:00:00Z',
      },
    ];
    const statsAfterExpense = calculateMonthlyStats(null, txWithExpense, {
      financialProfile: profile,
      loans: activeLoans,
      month: '2026-10',
      scenarioOverride: 'solo',
    });
    assert.equal(statsAfterExpense.remainingToSpend, statsScenarioA.remainingToSpend - 200);
  });

  it('3. Projection sept. 2026 à mai 2027 + juin 2027 (fin du prêt)', () => {
    const { profile, demoLoan } = createDemoReferenceData();
    const activeLoans: DebtOrLoan[] = [{ ...demoLoan, id: 1 }];

    const projection = generateMultiMonthProjection({
      profile,
      loans: activeLoans,
      startMonth: '2026-09',
      monthsCount: 10, // sept 2026 (index 0) -> mai 2027 (index 8) -> juin 2027 (index 9)
      excludeBankFeesInProjection: true,
    });

    const may2027A = projection.scenarioA[8];
    const may2027B = projection.scenarioB[8];

    assert.equal(may2027A.month, '2027-05');
    assert.equal(may2027B.month, '2027-05');

    // Réserve liquide projetée en mai 2027 : ~83 000 F (scénario A) et ~132 000 F (scénario B)
    assert.ok(
      Math.abs(may2027A.cumulativeLiquidReserve - 83000) <= 1000,
      `Attendu ~83 000 F en mai 2027 (Scénario A), obtenu ${may2027A.cumulativeLiquidReserve} F`
    );
    assert.ok(
      Math.abs(may2027B.cumulativeLiquidReserve - 132000) <= 1000,
      `Attendu ~132 000 F en mai 2027 (Scénario B), obtenu ${may2027B.cumulativeLiquidReserve} F`
    );

    // Épargne bloquée : +10 000 F/mois, soit +90 000 F entre sept 2026 et mai 2027
    assert.equal(may2027A.cumulativeLockedSavings, 90000);
    assert.equal(may2027B.cumulativeLockedSavings, 90000);

    // Dette soldée en mai 2027 (0 F) et patrimoine net = réserve liquide + épargne bloquée
    assert.equal(may2027A.remainingDebt, 0);
    assert.equal(
      may2027A.netWorth,
      may2027A.cumulativeLiquidReserve + may2027A.cumulativeLockedSavings
    );

    // À partir de juin 2027, sans le prêt, il reste 69 427 F/mois avant dépenses (dont 10 000 F d'épargne auto)
    const june2027A = projection.scenarioA[9];
    assert.equal(june2027A.month, '2027-06');
    assert.equal(june2027A.debtRepayment, 0);
    assert.equal(june2027A.autoSavings, 10000);
    assert.equal(june2027A.netBeforeExpenses, 69427);
    assert.equal(june2027A.isLoanEndedThisMonth, true);
  });

  it('4. Imprévu de 15 000 F en scénario A déclenche l’alerte sans passer sous le seuil de sécurité (40 000 F)', () => {
    const { profile, demoLoan } = createDemoReferenceData();
    const activeLoans: DebtOrLoan[] = [{ ...demoLoan, id: 1 }];

    const projectionWithUnexpected = generateMultiMonthProjection({
      profile,
      loans: activeLoans,
      startMonth: '2026-09',
      monthsCount: 9,
      unexpectedExpenseAmount: 15000,
      unexpectedExpenseMonth: '2026-10',
      excludeBankFeesInProjection: true,
    });

    const octRowA = projectionWithUnexpected.scenarioA.find((r) => r.month === '2026-10');
    assert.ok(octRowA);
    assert.equal(octRowA.hasNegativeMarginAlert, true);
    assert.equal(octRowA.hasBelowSafetyAlert, false);
    assert.ok(
      octRowA.cumulativeLiquidReserve >= 40000,
      `La réserve liquide (${octRowA.cumulativeLiquidReserve} F) doit rester >= 40 000 F`
    );

    // Vérification via evaluateFinancialAlerts
    const alerts = evaluateFinancialAlerts({
      remainingToSpend: octRowA.monthlyMargin,
      liquidReserve: octRowA.cumulativeLiquidReserve,
      safetyThreshold: profile.safetyThreshold,
      spentByPillar: { needs: 18403, wants: 0, culture: 0, unexpected: 15000 },
      pillarAllocatedBudgets: { needs: 18403, wants: 2000, culture: 2000, unexpected: 2000 },
      weeklyBreakdown: [],
    });

    assert.ok(alerts.some((a) => a.type === 'negative_balance_overdraft_risk'));
    assert.ok(!alerts.some((a) => a.type === 'liquid_below_safety_threshold'));
    assert.ok(alerts.some((a) => a.type === 'pillar_100_percent' && a.pillar === 'unexpected'));
  });

  it('5. Généricité universelle : fonctionne pour n’importe quel profil (sans prêt, sans véhicule, prêt dégressif)', () => {
    const genericProfile = createDefaultFinancialProfile('2026-09');
    genericProfile.recurringMonthlyIncome = 250000;
    genericProfile.monthlyFixedCharges = 85000;
    genericProfile.extraTargetSavings = 40000;
    genericProfile.fuelConfig.enabled = false;

    const stats = calculateMonthlyStats(null, [], {
      financialProfile: genericProfile,
      loans: [],
      month: '2026-09',
    });

    assert.equal(stats.totalIncome, 250000);
    assert.equal(stats.totalFixedExpenses, 85000);
    assert.equal(stats.targetSavings, 40000);
    assert.equal(stats.remainingToSpend, 125000);
    assert.equal(stats.estimatedMonthlyFuelCost, 0);

    // Prêt dégressif classique sur 12 mois
    const decliningLoan = calculateLoanSchedule({
      principal: 1200000,
      interestRate: 10,
      durationMonths: 12,
      interestType: 'declining',
      monthlyFee: 1500,
      startDate: '2026-01-10',
    });
    assert.equal(decliningLoan.schedule.length, 12);
    assert.ok(decliningLoan.totalInterest > 0);
    assert.equal(decliningLoan.actualMonthlyPayment, decliningLoan.baseMonthlyPayment + 1500);

    // Vérification calculateAutoDebitsForMonth et calculateFuelCosts
    const fuelDisabled = calculateFuelCosts(genericProfile.fuelConfig);
    assert.equal(fuelDisabled.monthlyCost, 0);
    const debitsEmpty = calculateAutoDebitsForMonth(genericProfile, [], '2026-09');
    assert.equal(debitsEmpty.totalAutoDebits, 0);
    const nw = calculateNetWorth({
      profile: genericProfile,
      loans: [],
      savingsGoals: [],
      targetMonth: '2026-09',
    });
    assert.equal(nw.netWorth, 0);
  });
});
