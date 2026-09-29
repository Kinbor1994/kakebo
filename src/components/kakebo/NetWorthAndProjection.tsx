'use client';

import React, { useState, useMemo } from 'react';
import {
  type FinancialProfile,
  type DebtOrLoan,
  type SavingsGoal,
  type FuelScenarioMode,
} from '@/types/kakebo';
import {
  calculateNetWorth,
  generateMultiMonthProjection,
} from '@/lib/financial-engine';
import { formatMonthLabel } from '@/lib/kakebo-engine';
import { formatCurrency } from '@/lib/utils';
import {
  Wallet,
  Lock,
  Landmark,
  ShieldCheck,
  ShieldAlert,
  Fuel,
  Zap,
  CalendarRange,
  Sparkles,
} from 'lucide-react';

interface NetWorthAndProjectionProps {
  profile: FinancialProfile;
  loans: DebtOrLoan[];
  savingsGoals: SavingsGoal[];
  currentMonth: string;
  currentMonthVariableAdjustments?: number;
  currency: string;
  compact?: boolean;
}

export function NetWorthAndProjection({
  profile,
  loans,
  savingsGoals,
  currentMonth,
  currency,
  compact = false,
}: NetWorthAndProjectionProps) {
  // Determine default start month for projection (if an active bank loan exists, use its start month or currentMonth)
  const activeBankLoan = loans.find((l) => l.type === 'bank_loan' && l.status === 'active');
  const defaultProjStart = activeBankLoan?.startDate
    ? activeBankLoan.startDate.slice(0, 7)
    : currentMonth;

  const [projStartMonth, setProjStartMonth] = useState<string>(defaultProjStart);
  const [monthsCount, setMonthsCount] = useState<number>(10); // 9 months loan + 1 month post-loan (e.g. Sept 2026 -> June 2027)
  const [selectedScenario, setSelectedScenario] = useState<FuelScenarioMode>(
    profile.fuelConfig.activeScenario
  );
  const [simFuelPrice, setSimFuelPrice] = useState<string>(
    String(profile.fuelConfig.pricePerLiter || 695)
  );
  const [simUnexpectedAmount, setSimUnexpectedAmount] = useState<string>('0');
  const [simUnexpectedMonth, setSimUnexpectedMonth] = useState<string>(defaultProjStart);

  // 1. Net Worth Calculation (Liquide vs Épargne bloquée vs Dettes)
  const netWorth = useMemo(() => {
    return calculateNetWorth({
      profile,
      loans,
      savingsGoals,
      targetMonth: currentMonth,
    });
  }, [profile, loans, savingsGoals, currentMonth]);

  // 2. Multi-month Projections (Scenario A Solo vs Scenario B Shared)
  const parsedFuelPrice = useMemo(() => {
    const n = Number(simFuelPrice.replace(/\s+/g, '').replace(',', '.'));
    return Number.isFinite(n) && n >= 0 ? Math.round(n) : profile.fuelConfig.pricePerLiter;
  }, [simFuelPrice, profile.fuelConfig.pricePerLiter]);

  const parsedUnexpected = useMemo(() => {
    const n = Number(simUnexpectedAmount.replace(/\s+/g, '').replace(',', '.'));
    return Number.isFinite(n) && n >= 0 ? Math.round(n) : 0;
  }, [simUnexpectedAmount]);

  const projectionResult = useMemo(() => {
    return generateMultiMonthProjection({
      profile,
      loans,
      savingsGoals,
      startMonth: projStartMonth,
      monthsCount,
      fuelPriceOverride: parsedFuelPrice,
      unexpectedExpenseAmount: parsedUnexpected,
      unexpectedExpenseMonth: simUnexpectedMonth,
    });
  }, [
    profile,
    loans,
    savingsGoals,
    projStartMonth,
    monthsCount,
    parsedFuelPrice,
    parsedUnexpected,
    simUnexpectedMonth,
  ]);

  const projectionSolo = projectionResult.scenarioA;
  const projectionShared = projectionResult.scenarioB;

  const activeProjection = selectedScenario === 'solo' ? projectionSolo : projectionShared;
  const lastSoloRow = projectionSolo[projectionSolo.length - 1];
  const lastSharedRow = projectionShared[projectionShared.length - 1];

  return (
    <div className="space-y-4">
      {/* PART 1: VUE ÉPARGNE & DETTES (3 BLOCS DISTINCTS + PATRIMOINE NET) */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
              Vue Épargne & Dettes (Patrimoine Net)
            </h2>
            <p className="text-[11px] text-slate-500">
              Séparation stricte entre réserve liquide, épargne bloquée et dettes actives
            </p>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-xs font-extrabold">
            Patrimoine net :{' '}
            <span className={netWorth.netWorth >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
              {formatCurrency(netWorth.netWorth, currency)}
            </span>
          </div>
        </div>

        {/* 3 Distinct Blocks */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* Block 1: Liquide */}
          <div className="rounded-xl border border-emerald-200/80 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20 p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center space-x-1 text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-400">
                <Wallet className="h-3.5 w-3.5" />
                <span>1. Liquide disponible</span>
              </span>
              {netWorth.isLiquidBelowSafety ? (
                <span className="inline-flex items-center space-x-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                  <ShieldAlert className="h-3 w-3" />
                  <span>&lt; Seuil</span>
                </span>
              ) : (
                <span className="inline-flex items-center space-x-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                  <ShieldCheck className="h-3 w-3" />
                  <span>Sécurisé</span>
                </span>
              )}
            </div>

            <p className="text-base font-extrabold text-slate-900 dark:text-white">
              {formatCurrency(netWorth.totalLiquidAssets, currency)}
            </p>

            <div className="text-[10px] text-slate-500 dark:text-slate-400 space-y-0.5">
              <p>Réserve : {formatCurrency(netWorth.liquidReserve, currency)}</p>
              {netWorth.cagnottesTotal > 0 && (
                <p>Cagnottes : {formatCurrency(netWorth.cagnottesTotal, currency)}</p>
              )}
              <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                Seuil sécurité : {formatCurrency(profile.safetyThreshold, currency)} (liquide seul)
              </p>
            </div>
          </div>

          {/* Block 2: Épargne Bloquée */}
          <div className="rounded-xl border border-teal-200/80 dark:border-teal-900/50 bg-teal-50/50 dark:bg-teal-950/20 p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center space-x-1 text-[10px] font-bold uppercase text-teal-700 dark:text-teal-400">
                <Lock className="h-3.5 w-3.5" />
                <span>2. Épargne bloquée</span>
              </span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200">
                Non liquide
              </span>
            </div>

            <p className="text-base font-extrabold text-slate-900 dark:text-white">
              {formatCurrency(netWorth.totalLockedSavings, currency)}
            </p>

            <div className="text-[10px] text-slate-500 dark:text-slate-400 space-y-0.5">
              <p>Initial ({profile.lockedSavingsStartMonth}) : {formatCurrency(netWorth.lockedSavingsInitial, currency)}</p>
              <p className="font-semibold text-teal-700 dark:text-teal-400">
                Cumul auto-épargne • Jamais mêlé au liquide
              </p>
            </div>
          </div>

          {/* Block 3: Dettes */}
          <div className="rounded-xl border border-rose-200/80 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center space-x-1 text-[10px] font-bold uppercase text-rose-700 dark:text-rose-400">
                <Landmark className="h-3.5 w-3.5" />
                <span>3. Dettes actives</span>
              </span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200">
                Passif
              </span>
            </div>

            <p className="text-base font-extrabold text-rose-600 dark:text-rose-400">
              -{formatCurrency(netWorth.totalDebtRemaining, currency)}
            </p>

            <div className="text-[10px] text-slate-500 dark:text-slate-400 space-y-0.5">
              <p>Solde restant des prêts actifs</p>
              <p className="font-semibold text-slate-600 dark:text-slate-300">
                Déduit du patrimoine net
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* PART 2: PROJECTION SUR 9+ MOIS & SIMULATEUR SCÉNARIO A VS B */}
      {!compact && (
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center space-x-2">
              <CalendarRange className="h-4 w-4 text-emerald-600" />
              <div>
                <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                  Projection Multi-Mois & Simulateur de Scénarios
                </h2>
                <p className="text-[11px] text-slate-500">
                  Comparaison Scénario A (Carburant Solo) vs Scénario B (Partagé) & Fin de prêt automatique
                </p>
              </div>
            </div>

            {/* Horizon selector */}
            <div className="flex items-center space-x-1">
              {[9, 10, 12, 18].map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setMonthsCount(h)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                    monthsCount === h
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {h} mois
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Simulation Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60 text-xs">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 flex items-center space-x-1">
                <span>Mois de départ</span>
              </label>
              <input
                type="month"
                value={projStartMonth}
                onChange={(e) => {
                  setProjStartMonth(e.target.value);
                  setSimUnexpectedMonth(e.target.value);
                }}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 flex items-center space-x-1">
                <Fuel className="h-3 w-3 text-amber-500" />
                <span>Prix carburant simulé ({currency}/L)</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={simFuelPrice}
                onChange={(e) => setSimFuelPrice(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-xs"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 flex items-center space-x-1">
                  <Zap className="h-3 w-3 text-rose-500" />
                  <span>Simuler un imprévu ({currency})</span>
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setSimUnexpectedAmount(simUnexpectedAmount === '15000' ? '0' : '15000')
                  }
                  className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  {simUnexpectedAmount === '15000' ? 'Retirer 15 000 F' : 'Tester 15 000 F'}
                </button>
              </div>
              <div className="flex space-x-1.5">
                <input
                  type="text"
                  inputMode="numeric"
                  value={simUnexpectedAmount}
                  onChange={(e) => setSimUnexpectedAmount(e.target.value)}
                  placeholder="Ex: 15000"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 font-bold text-xs"
                />
              </div>
            </div>
          </div>

          {/* Side-by-side Comparison Cards: Scenario A (Solo) vs Scenario B (Shared) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setSelectedScenario('solo')}
              className={`text-left p-3.5 rounded-2xl border transition space-y-1.5 ${
                selectedScenario === 'solo'
                  ? 'border-amber-500 bg-amber-50/40 dark:bg-amber-950/20 ring-2 ring-amber-500/20'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                  Scénario A — Carburant Solo ({profile.fuelConfig.litersPerWeekSolo}L/sem)
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                  {formatCurrency(projectionSolo[0]?.fuelCost ?? 0, currency)}/mois
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                <div>
                  <span className="text-slate-400 block text-[10px]">Marge / mois (pendant prêt)</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {formatCurrency(projectionSolo[0]?.monthlyMargin ?? 0, currency)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">
                    Liquide cumulé ({formatMonthLabel(lastSoloRow?.month ?? currentMonth)})
                  </span>
                  <span className="font-extrabold text-amber-600 dark:text-amber-400">
                    {formatCurrency(lastSoloRow?.cumulativeLiquidReserve ?? 0, currency)}
                  </span>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedScenario('shared')}
              className={`text-left p-3.5 rounded-2xl border transition space-y-1.5 ${
                selectedScenario === 'shared'
                  ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 ring-2 ring-emerald-500/20'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                  Scénario B — Carburant Partagé ({profile.fuelConfig.sharedWeekALiters}L/{profile.fuelConfig.sharedWeekBLiters}L)
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                  {formatCurrency(projectionShared[0]?.fuelCost ?? 0, currency)}/mois
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                <div>
                  <span className="text-slate-400 block text-[10px]">Marge / mois (pendant prêt)</span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-300">
                    {formatCurrency(projectionShared[0]?.monthlyMargin ?? 0, currency)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">
                    Liquide cumulé ({formatMonthLabel(lastSharedRow?.month ?? currentMonth)})
                  </span>
                  <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(lastSharedRow?.cumulativeLiquidReserve ?? 0, currency)}
                  </span>
                </div>
              </div>
            </button>
          </div>

          {/* Month-by-Month Projection Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                <tr>
                  <th className="py-2.5 px-2.5">Mois</th>
                  <th className="py-2.5 px-2.5">Net av. dép.</th>
                  <th className="py-2.5 px-2.5">Carburant</th>
                  <th className="py-2.5 px-2.5">Marge mois</th>
                  <th className="py-2.5 px-2.5">Réserve liquide</th>
                  <th className="py-2.5 px-2.5">Épargne bloquée</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {activeProjection.map((row) => {
                  const isLoanJustFinished = row.isLoanEndedThisMonth;

                  return (
                    <tr
                      key={row.month}
                      className={
                        isLoanJustFinished
                          ? 'bg-emerald-50/70 dark:bg-emerald-950/30 font-semibold'
                          : row.hasNegativeMarginAlert
                          ? 'bg-rose-50/60 dark:bg-rose-950/30'
                          : 'bg-white dark:bg-slate-900'
                      }
                    >
                      <td className="py-2 px-2.5 whitespace-nowrap">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-bold text-slate-900 dark:text-slate-100">
                            {formatMonthLabel(row.month)}
                          </span>
                          {isLoanJustFinished && (
                            <span className="inline-flex items-center space-x-0.5 px-1.5 py-0.5 rounded-md bg-emerald-600 text-white text-[9px] font-bold">
                              <Sparkles className="h-2.5 w-2.5" />
                              <span>Prêt soldé !</span>
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-2.5 whitespace-nowrap font-semibold text-slate-700 dark:text-slate-300">
                        {formatCurrency(row.netBeforeExpenses, currency)}
                      </td>
                      <td className="py-2 px-2.5 whitespace-nowrap text-amber-600 dark:text-amber-400">
                        -{formatCurrency(row.fuelCost, currency)}
                        {row.unexpectedExpense > 0 && (
                          <span className="block text-[10px] text-rose-500 font-bold">
                            -{formatCurrency(row.unexpectedExpense, currency)} imprévu
                          </span>
                        )}
                      </td>
                      <td
                        className={`py-2 px-2.5 whitespace-nowrap font-bold ${
                          row.monthlyMargin >= 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {row.monthlyMargin >= 0 ? '+' : ''}
                        {formatCurrency(row.monthlyMargin, currency)}
                      </td>
                      <td className="py-2 px-2.5 whitespace-nowrap font-extrabold text-slate-900 dark:text-white">
                        {formatCurrency(row.cumulativeLiquidReserve, currency)}
                        {row.hasBelowSafetyAlert && (
                          <span className="block text-[9px] text-amber-600 dark:text-amber-400 font-bold">
                            ⚠️ &lt; Seuil
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-2.5 whitespace-nowrap font-bold text-teal-600 dark:text-teal-400">
                        {formatCurrency(row.cumulativeLockedSavings, currency)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
