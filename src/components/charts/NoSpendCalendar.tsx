'use client';

import React from 'react';
import { type Transaction } from '@/types/kakebo';
import { formatCurrency } from '@/lib/utils';
import { parseISO, getDaysInMonth, startOfMonth, getDay } from 'date-fns';
import { Sparkles, Calendar as CalendarIcon, Check } from 'lucide-react';

interface NoSpendCalendarProps {
  month: string; // 'YYYY-MM'
  transactions: Transaction[];
  currency: string;
}

export function NoSpendCalendar({ month, transactions, currency }: NoSpendCalendarProps) {
  const monthDate = parseISO(`${month}-01`);
  const totalDays = getDaysInMonth(monthDate);
  const firstDayOfMonth = getDay(startOfMonth(monthDate)); // 0 = Sunday, 1 = Monday...
  // Shift so Monday is index 0
  const startOffset = (firstDayOfMonth + 6) % 7;

  // Aggregate daily expenses
  const dailySpent: Record<number, number> = {};
  for (let d = 1; d <= totalDays; d++) {
    dailySpent[d] = 0;
  }

  transactions.forEach((t) => {
    if (t.type === 'expense' && t.date) {
      const dayNum = parseInt(t.date.split('-')[2], 10);
      if (dayNum >= 1 && dayNum <= totalDays) {
        dailySpent[dayNum] = (dailySpent[dayNum] || 0) + t.amount;
      }
    }
  });

  const noSpendDaysCount = Object.values(dailySpent).filter((amt) => amt === 0).length;

  const weekDayHeaders = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-slate-800 dark:text-slate-200">
          <CalendarIcon className="h-4 w-4 text-emerald-600" />
          <h3 className="text-xs font-bold uppercase tracking-wider">
            Calendrier des Dépenses & Jours Zen
          </h3>
        </div>

        <span className="inline-flex items-center space-x-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full border border-emerald-200/80">
          <Sparkles className="h-3 w-3" />
          <span>{noSpendDaysCount} jours sans dépense</span>
        </span>
      </div>

      {/* Week Headers */}
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 uppercase">
        {weekDayHeaders.map((h) => (
          <div key={h} className="py-1">
            {h}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1.5">
        {/* Empty slots before day 1 */}
        {Array.from({ length: startOffset }).map((_, idx) => (
          <div key={`empty-${idx}`} className="h-11 rounded-xl bg-transparent" />
        ))}

        {/* Days of month */}
        {Array.from({ length: totalDays }).map((_, idx) => {
          const day = idx + 1;
          const spent = dailySpent[day] || 0;
          const isNoSpend = spent === 0;

          return (
            <div
              key={day}
              className={`flex flex-col items-center justify-between p-1 h-12 rounded-xl border text-center transition ${
                isNoSpend
                  ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200/80 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300'
                  : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <span className="text-[10px] font-bold">{day}</span>
              {isNoSpend ? (
                <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-600 text-white text-[8px]">
                  <Check className="h-2.5 w-2.5 stroke-[3]" />
                </span>
              ) : (
                <span className="text-[8px] font-semibold text-slate-500 truncate max-w-full px-0.5">
                  {formatCurrency(spent, currency).replace(/\s*F CFA/, '')}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
