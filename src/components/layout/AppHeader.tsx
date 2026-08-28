'use client';

import React from 'react';
import { useSecurity } from '../security/SecurityContext';
import { Lock, ChevronLeft, ChevronRight, Calendar, SlidersHorizontal, Wallet } from 'lucide-react';
import { formatMonthLabel } from '@/lib/kakebo-engine';
import { addMonths, subMonths, parseISO, format } from 'date-fns';

interface AppHeaderProps {
  currentMonth: string;
  onMonthChange: (newMonth: string) => void;
  onOpenMonthSetup: () => void;
}

export function AppHeader({ currentMonth, onMonthChange, onOpenMonthSetup }: AppHeaderProps) {
  const { isPinConfigured, lockNow } = useSecurity();

  const handlePrevMonth = () => {
    const date = parseISO(`${currentMonth}-01`);
    const prev = subMonths(date, 1);
    onMonthChange(format(prev, 'yyyy-MM'));
  };

  const handleNextMonth = () => {
    const date = parseISO(`${currentMonth}-01`);
    const next = addMonths(date, 1);
    onMonthChange(format(next, 'yyyy-MM'));
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-2 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/90 px-3 py-2.5 sm:px-4 sm:py-3 backdrop-blur-md shadow-xs">
      {/* Brand & Logo */}
      <div className="flex items-center space-x-2 shrink-0">
        <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
          <Wallet className="h-4 w-4 sm:h-5 sm:w-5 stroke-[2.2]" />
        </div>
        <div className="hidden xs:block sm:block">
          <span className="text-sm sm:text-base font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Kakeibo
          </span>
          <span className="ml-1 text-[10px] sm:text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            Budget
          </span>
        </div>
      </div>

      {/* Month Navigator */}
      <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-800 p-0.5 sm:p-1 border border-slate-200/60 dark:border-slate-700/60 shrink-0">
        <button
          type="button"
          onClick={handlePrevMonth}
          className="p-1 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white dark:hover:bg-slate-700 transition active:scale-95"
          aria-label="Mois précédent"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={onOpenMonthSetup}
          className="flex items-center space-x-1 sm:space-x-1.5 px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs font-bold text-slate-800 dark:text-slate-200 hover:text-emerald-600 transition truncate"
          title="Modifier le budget du mois"
        >
          <Calendar className="h-3.5 w-3.5 text-emerald-600 shrink-0 hidden xxs:inline sm:inline" />
          <span className="capitalize">{formatMonthLabel(currentMonth)}</span>
        </button>

        <button
          type="button"
          onClick={handleNextMonth}
          className="p-1 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white dark:hover:bg-slate-700 transition active:scale-95"
          aria-label="Mois suivant"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Actions */}
      <div className="flex items-center space-x-0.5 sm:space-x-1 shrink-0">
        <button
          type="button"
          onClick={onOpenMonthSetup}
          className="p-1.5 sm:p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          title="Configurer le budget du mois"
          aria-label="Configurer le budget"
        >
          <SlidersHorizontal className="h-4 w-4" />
        </button>

        {isPinConfigured && (
          <button
            type="button"
            onClick={lockNow}
            className="p-1.5 sm:p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Verrouiller l'application"
            aria-label="Verrouiller"
          >
            <Lock className="h-4 w-4" />
          </button>
        )}
      </div>
    </header>
  );
}
