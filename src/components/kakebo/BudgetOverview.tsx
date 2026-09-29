'use client';

import React from 'react';
import { type MonthlyStats, type MonthlyBudget } from '@/types/kakebo';
import { formatCurrency } from '@/lib/utils';
import {
  PiggyBank,
  Calendar,
  AlertCircle,
  TrendingUp,
  Sparkles,
  ArrowRight,
  Fuel,
  CalendarDays,
  CheckCircle2,
} from 'lucide-react';

interface BudgetOverviewProps {
  stats: MonthlyStats;
  budget: MonthlyBudget | null | undefined;
  currency: string;
  onOpenSetup: () => void;
  onLoadDemo?: () => Promise<void>;
}

export function BudgetOverview({
  stats,
  budget,
  currency,
  onOpenSetup,
  onLoadDemo,
}: BudgetOverviewProps) {
  const isBudgetConfigured = Boolean(
    (budget && budget.fixedIncomes > 0) || stats.totalIncome > 0
  );

  if (!isBudgetConfigured) {
    return (
      <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 text-center space-y-3.5 shadow-xs">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
          <Calendar className="h-5 w-5" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
            Configurez votre budget ou profil financier
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
            Renseignez vos revenus, prélèvements automatiques et charges fixes pour calculer votre reste à vivre réel.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={onOpenSetup}
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition shadow-sm shadow-emerald-600/20 active:scale-98 min-h-[44px]"
          >
            <Sparkles className="h-4 w-4" />
            <span>Configurer mon budget</span>
            <ArrowRight className="h-3.5 w-3.5 ml-0.5" />
          </button>

          {onLoadDemo && (
            <button
              type="button"
              onClick={onLoadDemo}
              className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-100 transition min-h-[44px]"
            >
              <span>Charger les données démo</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  const remainingPercent =
    stats.allocatedBudget > 0
      ? Math.max(0, Math.min(100, Math.round((stats.remainingToSpend / stats.allocatedBudget) * 100)))
      : 0;

  const isOverBudget = stats.remainingToSpend < 0;
  const autoDebitsTotal =
    (stats.autoChargesTotal ?? 0) +
    (stats.debtRepaymentsTotal ?? 0) +
    (stats.autoSavingsTotal ?? 0);
  const autoSavingsIncluded = stats.autoSavingsTotal ?? 0;
  const weeklyFuel = stats.weeklyFuelBudget ?? 0;
  const weeklyNonFuel =
    stats.weeklyNonFuelBudget ??
    Math.max(0, Math.round(stats.allocatedBudget / 4.33) - weeklyFuel);
  const weeklyEnvelope = weeklyFuel + weeklyNonFuel;

  return (
    <div className="space-y-3">
      {/* Central Real Living Budget Card (Emerald Gradient Theme) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-800 p-5 sm:p-6 text-white shadow-lg shadow-emerald-900/10">
        <div className="flex items-center justify-between">
          <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-emerald-100">
            Reste à vivre réel
          </span>
          <span
            className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-bold ${
              isOverBudget
                ? 'bg-rose-500/20 text-rose-200 border border-rose-400/30'
                : 'bg-white/20 text-white backdrop-blur-xs'
            }`}
          >
            {isOverBudget ? (
              <>
                <AlertCircle className="h-3 w-3" />
                <span>Dépassement</span>
              </>
            ) : (
              <>
                <TrendingUp className="h-3 w-3" />
                <span>{remainingPercent}% disponible</span>
              </>
            )}
          </span>
        </div>

        <div className="mt-2.5 flex items-baseline space-x-2">
          <span
            className={`text-2xl sm:text-4xl font-extrabold tracking-tight ${
              isOverBudget ? 'text-rose-300' : 'text-white'
            }`}
          >
            {formatCurrency(stats.remainingToSpend, currency)}
          </span>
          <span className="text-[11px] sm:text-xs font-medium text-emerald-100/80 truncate">
            / {formatCurrency(stats.allocatedBudget, currency)} net avant variables
          </span>
        </div>

        {/* Formula breakdown line */}
        {autoDebitsTotal > 0 && (
          <p className="mt-1.5 text-[11px] text-emerald-100/90">
            Revenus {formatCurrency(stats.totalIncome, currency)} − Prélèvements auto{' '}
            {formatCurrency(autoDebitsTotal, currency)} − Dépenses saisies{' '}
            {formatCurrency(stats.totalSpent, currency)}
          </p>
        )}

        {/* Balance Progress Bar */}
        <div className="mt-3.5 space-y-1">
          <div className="h-2 w-full overflow-hidden rounded-full bg-black/20">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isOverBudget ? 'bg-rose-400' : 'bg-white'
              }`}
              style={{ width: `${Math.min(100, Math.max(2, remainingPercent))}%` }}
            />
          </div>
        </div>

        {/* Stats Grid Footer */}
        <div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/15 pt-3.5 text-xs">
          <div className="space-y-0.5">
            <div className="flex items-center space-x-1 text-emerald-100 text-[11px]">
              <PiggyBank className="h-3.5 w-3.5" />
              <span>Épargne du mois :</span>
            </div>
            <p className="font-bold text-white text-xs sm:text-sm truncate">
              {formatCurrency(stats.targetSavings, currency)}
            </p>
            {autoSavingsIncluded > 0 && (
              <span className="inline-flex items-center space-x-1 text-[10px] text-emerald-200">
                <CheckCircle2 className="h-3 w-3" />
                <span>Dont {formatCurrency(autoSavingsIncluded, currency)} prélevés à la source</span>
              </span>
            )}
          </div>

          <div className="space-y-0.5 text-right">
            <span className="text-emerald-100 text-[11px]">Variables saisies :</span>
            <p className="font-bold text-white text-xs sm:text-sm truncate">
              {formatCurrency(stats.totalSpent, currency)}
            </p>
            <span className="block text-[10px] text-emerald-200">
              Marge fin de mois : {formatCurrency(stats.remainingToSpend, currency)}
            </span>
          </div>
        </div>
      </div>

      {/* Weekly Budget Envelope Card (with Fuel share clearly identified) */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 shadow-2xs">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-800 dark:text-slate-100">
            <CalendarDays className="h-4 w-4 text-emerald-600" />
            <span>Enveloppe Hebdomadaire (hors charges fixes)</span>
          </div>
          <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(weeklyEnvelope, currency)} / sem.
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/50">
            <div className="flex items-center space-x-1.5">
              <Fuel className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="text-[11px] font-semibold text-amber-900 dark:text-amber-200">
                Part Carburant
              </span>
            </div>
            <span className="font-extrabold text-amber-700 dark:text-amber-300">
              {formatCurrency(weeklyFuel, currency)}
            </span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/50">
            <span className="text-[11px] font-semibold text-emerald-900 dark:text-emerald-200">
              Reste / sem.
            </span>
            <span className="font-extrabold text-emerald-700 dark:text-emerald-300">
              {formatCurrency(weeklyNonFuel, currency)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
