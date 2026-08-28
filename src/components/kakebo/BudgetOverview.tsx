'use client';

import React from 'react';
import { type MonthlyStats, type MonthlyBudget } from '@/types/kakebo';
import { formatCurrency } from '@/lib/utils';
import { PiggyBank, Calendar, AlertCircle, TrendingUp, Sparkles, ArrowRight } from 'lucide-react';

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
      <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 text-center space-y-3.5 shadow-xs">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
          <Calendar className="h-5 w-5" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
            Rituel de début de mois à compléter
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
            Renseignez vos revenus, charges fixes et épargne cible pour calculer votre budget disponible.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenSetup}
          className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition shadow-sm shadow-emerald-600/20 active:scale-98"
        >
          <Sparkles className="h-4 w-4" />
          <span>Configurer le budget du mois</span>
          <ArrowRight className="h-3.5 w-3.5 ml-0.5" />
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
    <div className="space-y-3">
      {/* Central Pocket Money Card (Emerald Gradient Theme) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-800 p-5 sm:p-6 text-white shadow-lg shadow-emerald-900/10">
        <div className="flex items-center justify-between">
          <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-emerald-100">
            Reste à vivre disponible
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
                <span>{remainingPercent}% restant</span>
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
            / {formatCurrency(stats.allocatedBudget, currency)}
          </span>
        </div>

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
              <span>Épargne cible :</span>
            </div>
            <p className="font-bold text-white text-xs sm:text-sm truncate">
              {formatCurrency(stats.targetSavings, currency)}
            </p>
          </div>

          <div className="space-y-0.5 text-right">
            <span className="text-emerald-100 text-[11px]">Total dépensé :</span>
            <p className="font-bold text-white text-xs sm:text-sm truncate">
              {formatCurrency(stats.totalSpent, currency)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
