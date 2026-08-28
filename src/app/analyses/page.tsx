'use client';

import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { getCurrentMonth, calculateMonthlyStats, formatMonthLabel } from '@/lib/kakebo-engine';
import { AppHeader } from '@/components/layout/AppHeader';
import { BottomNav } from '@/components/layout/BottomNav';
import { QuickAddModal } from '@/components/kakebo/QuickAddModal';
import { MonthSetupModal } from '@/components/kakebo/MonthSetupModal';
import { useSecurity } from '@/components/security/SecurityContext';
import { PinLockScreen } from '@/components/security/PinLockScreen';
import { PillarDonutChart } from '@/components/charts/PillarDonutChart';
import { MonthlyTrendBar, type MonthTrendData } from '@/components/charts/MonthlyTrendBar';
import { NoSpendCalendar } from '@/components/charts/NoSpendCalendar';
import { subMonths, format, parseISO } from 'date-fns';
import { BarChart3, PieChart, CalendarDays } from 'lucide-react';

export default function AnalysesPage() {
  const { isLocked, userSettings } = useSecurity();
  const currency = userSettings?.currency || 'XOF';

  const [currentMonth, setCurrentMonth] = useState<string>(getCurrentMonth());
  const [isQuickAddOpen, setIsQuickAddOpen] = useState<boolean>(false);
  const [isMonthSetupOpen, setIsMonthSetupOpen] = useState<boolean>(false);

  // Live queries for active month
  const budget = useLiveQuery(
    () => db.monthlyBudgets.where('month').equals(currentMonth).first(),
    [currentMonth]
  );

  const transactions = useLiveQuery(
    () => db.transactions.where('month').equals(currentMonth).toArray(),
    [currentMonth]
  ) || [];

  const allBudgets = useLiveQuery(() => db.monthlyBudgets.toArray()) || [];
  const allTransactions = useLiveQuery(() => db.transactions.toArray()) || [];

  const stats = calculateMonthlyStats(budget, transactions);

  // Compute 6-month historical trend
  const currentDate = parseISO(`${currentMonth}-01`);
  const last6Months: string[] = [];
  for (let i = 5; i >= 0; i--) {
    last6Months.push(format(subMonths(currentDate, i), 'yyyy-MM'));
  }

  const trendData: MonthTrendData[] = last6Months.map((m) => {
    const mBudget = allBudgets.find((b) => b.month === m);
    const mTx = allTransactions.filter((t) => t.month === m);
    const mStats = calculateMonthlyStats(mBudget, mTx);

    return {
      month: m,
      totalIncome: mStats.totalIncome,
      totalSpent: mStats.totalSpent,
      savings: mStats.currentSavings,
      savingsRate: mStats.savingsRatePercentage,
    };
  });

  if (isLocked) {
    return <PinLockScreen />;
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-28">
      <AppHeader
        currentMonth={currentMonth}
        onMonthChange={setCurrentMonth}
        onOpenMonthSetup={() => setIsMonthSetupOpen(true)}
      />

      {/* Main Container */}
      <main className="mx-auto max-w-xl px-3.5 pt-4 sm:px-4 sm:pt-5 space-y-4 sm:space-y-6">
        {/* Title */}
        <div>
          <h1 className="text-base sm:text-lg font-bold tracking-tight">Analyses & Graphiques</h1>
          <p className="text-[11px] sm:text-xs text-slate-500">{formatMonthLabel(currentMonth)} • Vue d&apos;ensemble analytique</p>
        </div>

        {/* Donut Chart */}
        <PillarDonutChart
          spentByPillar={stats.spentByPillar}
          totalSpent={stats.totalSpent}
          currency={currency}
        />

        {/* 6-Month Trend Bars */}
        <MonthlyTrendBar trendData={trendData} currency={currency} />

        {/* Calendar View */}
        <NoSpendCalendar
          month={currentMonth}
          transactions={transactions}
          currency={currency}
        />
      </main>

      <QuickAddModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        defaultMonth={currentMonth}
      />

      <MonthSetupModal
        isOpen={isMonthSetupOpen}
        onClose={() => setIsMonthSetupOpen(false)}
        month={currentMonth}
      />

      <BottomNav onOpenQuickAdd={() => setIsQuickAddOpen(true)} />
    </div>
  );
}
