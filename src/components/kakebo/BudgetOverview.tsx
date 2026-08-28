'use client';

import React from 'react';
import { type MonthlyStats, type MonthlyBudget } from '@/types/kakebo';
import { formatCurrency } from '@/lib/utils';
import { PiggyBank, Wallet, Calendar, AlertCircle, TrendingUp, Sparkles } from 'lucide-react';

interface BudgetOverviewProps {
  stats: MonthlyStats;
  budget: MonthlyBudget | null | undefined;
  currency: string;
  onOpenSetup: () => void;
}

export function BudgetOverview({
  stats,
  budget,
  currency,
  onOpenSetup,
}: BudgetOverviewProps) {
  const isBudgetConfigured = Boolean(budget && budget.fixedIncomes > 0);

  if (!isBudgetConfigured) {
    return (
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-center space-y-4 shadow-sm">
        <div className="mx-auto flex h-13 w-13 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
          <Calendar className="h-6 w-6" />
        </div>
        <div className="space-y-1.5">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Rituel de début de mois à compléter
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
            Renseignez vos revenus, charges fixes et votre objectif d&apos;épargne prioritaire pour activer le calcul de votre budget Kakeibo.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenSetup}
          className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition shadow-sm shadow-emerald-600/20 active:scale-98"
        >
          <Sparkles className="h-4 w-4" />
          <span>Configurer le budget du mois</span>
        </button>
      </div>
    );
  }

  const remainingPercent =
    stats.allocatedBudget > 0
      ? Math.max(0, Math.min(100, Math.round((stats.remainingToSpend / stats.allocatedBudget) * 100)))
      : 0;

  const isOverBudget = stats.remainingToSpend < 0;

  return (
    <div className="space-y-3.5">
      {/* Central Pocket Money Card (Emerald Gradient Theme) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-800 p-6 text-white shadow-lg shadow-emerald-900/10">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-100">
            Reste à vivre disponible
          </span>
          <span
            className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
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
                <span>{remainingPercent}% restant</span>
              </>
            )}
          </span>
        </div>

        <div className="mt-3 flex items-baseline space-x-2">
          <span
            className={`text-3xl sm:text-4xl font-extrabold tracking-tight ${
              isOverBudget ? 'text-rose-300' : 'text-white'
            }`}
          >
            {formatCurrency(stats.remainingToSpend, currency)}
          </span>
          <span className="text-xs font-medium text-emerald-100/80">
            / {formatCurrency(stats.allocatedBudget, currency)}
          </span>
        </div>

        {/* Balance Progress Bar */}
        <div className="mt-4 space-y-1.5">
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-black/20">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isOverBudget ? 'bg-rose-400' : 'bg-white'
              }`}
              style={{ width: `${Math.min(100, Math.max(2, remainingPercent))}%` }}
            />
          </div>
        </div>

        {/* Stats Grid Footer */}
        <div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/15 pt-4 text-xs">
          <div className="space-y-0.5">
            <div className="flex items-center space-x-1 text-emerald-100">
              <PiggyBank className="h-3.5 w-3.5" />
              <span>Épargne prioritaire :</span>
            </div>
            <p className="font-bold text-white text-sm">
              {formatCurrency(stats.targetSavings, currency)}
            </p>
          </div>

          <div className="space-y-0.5">
            <div className="flex items-center space-x-1 text-emerald-100">
              <Wallet className="h-3.5 w-3.5" />
              <span>Dépenses cumulées :</span>
            </div>
            <p className="font-bold text-white text-sm">
              {formatCurrency(stats.totalSpent, currency)}
            </p>
          </div>
        </div>
      </div>

      {/* Weekly Breakdown Strip */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
            Rythme hebdomadaire conseillé
          </span>
          <span className="text-xs font-medium text-slate-500">
            ~ {formatCurrency(stats.allocatedBudget / 4.33, currency)} / sem.
          </span>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {stats.weeklyBreakdown.map((w) => {
            const isWeekOver = w.spent > w.budget && w.budget > 0;
            return (
              <div
                key={w.weekIndex}
                className="flex flex-col items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/50 text-center"
              >
                <span className="text-[11px] font-semibold text-slate-500">Sem. {w.weekIndex}</span>
                <span
                  className={`text-xs font-bold mt-1 ${
                    isWeekOver ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-slate-100'
                  }`}
                >
                  {formatCurrency(w.spent, currency)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
