'use client';

import React from 'react';
import { formatCurrency } from '@/lib/utils';
import { formatMonthLabel } from '@/lib/kakebo-engine';
import { TrendingUp, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

export interface MonthTrendData {
  month: string; // 'YYYY-MM'
  totalIncome: number;
  totalSpent: number;
  savings: number;
  savingsRate: number;
}

interface MonthlyTrendBarProps {
  trendData: MonthTrendData[];
  currency: string;
}

export function MonthlyTrendBar({ trendData, currency }: MonthlyTrendBarProps) {
  // Find max value to scale bars
  const maxVal = Math.max(
    ...trendData.flatMap((d) => [d.totalIncome, d.totalSpent]),
    100000
  );

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-slate-800 dark:text-slate-200">
          <TrendingUp className="h-4 w-4 text-emerald-600" />
          <h3 className="text-xs font-bold uppercase tracking-wider">
            Évolution & Taux d&apos;Épargne (6 Mois)
          </h3>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center space-x-4 text-xs font-semibold text-slate-500">
        <div className="flex items-center space-x-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
          <span>Revenus</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-700 dark:bg-slate-400" />
          <span>Dépenses</span>
        </div>
      </div>

      {/* Bars container */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 pt-4 items-end min-h-[160px]">
        {trendData.map((d) => {
          const incomeHeight = Math.max(8, Math.round((d.totalIncome / maxVal) * 120));
          const expenseHeight = Math.max(8, Math.round((d.totalSpent / maxVal) * 120));

          return (
            <div key={d.month} className="flex flex-col items-center space-y-2 group">
              {/* Savings rate pill */}
              <span className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded-md">
                {d.savingsRate}%
              </span>

              {/* Dual Bar */}
              <div className="flex items-end space-x-1.5 h-[120px]">
                {/* Income */}
                <div
                  className="w-3 sm:w-4 rounded-t-md bg-emerald-600 transition-all duration-500 group-hover:opacity-80"
                  style={{ height: `${incomeHeight}px` }}
                  title={`Revenus: ${formatCurrency(d.totalIncome, currency)}`}
                />
                {/* Spent */}
                <div
                  className="w-3 sm:w-4 rounded-t-md bg-slate-700 dark:bg-slate-400 transition-all duration-500 group-hover:opacity-80"
                  style={{ height: `${expenseHeight}px` }}
                  title={`Dépenses: ${formatCurrency(d.totalSpent, currency)}`}
                />
              </div>

              {/* Month label */}
              <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                {d.month.split('-')[1]}/{d.month.split('-')[0].slice(2)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
