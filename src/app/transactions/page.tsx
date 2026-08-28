'use client';

import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { getCurrentMonth, formatMonthLabel } from '@/lib/kakebo-engine';
import { type KakeiboPillar, PILLARS_CONFIG } from '@/types/kakebo';
import { AppHeader } from '@/components/layout/AppHeader';
import { BottomNav } from '@/components/layout/BottomNav';
import { QuickAddModal } from '@/components/kakebo/QuickAddModal';
import { MonthSetupModal } from '@/components/kakebo/MonthSetupModal';
import { useSecurity } from '@/components/security/SecurityContext';
import { PinLockScreen } from '@/components/security/PinLockScreen';
import { formatCurrency } from '@/lib/utils';
import { downloadTransactionsCSV } from '@/lib/export-import';
import {
  ShoppingBag,
  Sparkles,
  BookOpen,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Search,
  Download,
  Trash2,
  Filter,
} from 'lucide-react';

const PILLAR_ICONS = {
  needs: ShoppingBag,
  wants: Sparkles,
  culture: BookOpen,
  unexpected: AlertTriangle,
};

export default function TransactionsPage() {
  const { isLocked, userSettings } = useSecurity();
  const currency = userSettings?.currency || 'XOF';

  const [currentMonth, setCurrentMonth] = useState<string>(getCurrentMonth());
  const [isQuickAddOpen, setIsQuickAddOpen] = useState<boolean>(false);
  const [isMonthSetupOpen, setIsMonthSetupOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPillar, setSelectedPillar] = useState<string>('all');

  const transactions = useLiveQuery(
    () => db.transactions.where('month').equals(currentMonth).reverse().toArray(),
    [currentMonth]
  ) || [];

  const filteredTransactions = transactions.filter((t) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchCat = t.category.toLowerCase().includes(q);
      const matchDesc = (t.description || '').toLowerCase().includes(q);
      if (!matchCat && !matchDesc) return false;
    }

    if (selectedPillar === 'income') {
      return t.type === 'income';
    }
    if (selectedPillar !== 'all') {
      return t.type === 'expense' && t.pillar === selectedPillar;
    }

    return true;
  });

  const handleDelete = async (id?: number) => {
    if (!id) return;
    await db.transactions.delete(id);
  };

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

      <main className="mx-auto max-w-xl px-4 pt-5 space-y-4">
        {/* Header Title & Actions */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold tracking-tight">Journal des opérations</h1>
            <p className="text-xs text-slate-500">{formatMonthLabel(currentMonth)}</p>
          </div>

          <button
            type="button"
            onClick={downloadTransactionsCSV}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition shadow-2xs"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </button>
        </div>

        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher une dépense, une catégorie..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-hidden focus:border-emerald-500 transition shadow-2xs"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedPillar('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              selectedPillar === 'all'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-2xs'
                : 'bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            Toutes ({transactions.length})
          </button>

          {(['needs', 'wants', 'culture', 'unexpected'] as KakeiboPillar[]).map((pKey) => {
            const count = transactions.filter((t) => t.pillar === pKey).length;
            const pConfig = PILLARS_CONFIG[pKey];
            const isSelected = selectedPillar === pKey;

            return (
              <button
                key={pKey}
                type="button"
                onClick={() => setSelectedPillar(pKey)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  isSelected
                    ? `${pConfig.badgeClass} border font-bold shadow-2xs`
                    : 'bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                {pConfig.name} ({count})
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setSelectedPillar('income')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              selectedPillar === 'income'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold'
                : 'bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            Revenus ({transactions.filter((t) => t.type === 'income').length})
          </button>
        </div>

        {/* Transactions List */}
        {filteredTransactions.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center text-xs text-slate-400 space-y-2">
            <Filter className="h-6 w-6 mx-auto text-slate-300" />
            <p>Aucune transaction ne correspond à vos critères pour ce mois.</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800 shadow-xs overflow-hidden">
            {filteredTransactions.map((t) => {
              const isExpense = t.type === 'expense';
              const pillarConfig = t.pillar ? PILLARS_CONFIG[t.pillar] : null;
              const Icon = t.pillar ? PILLAR_ICONS[t.pillar] : (isExpense ? ArrowDownLeft : ArrowUpRight);

              return (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition group"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-xl border ${
                        pillarConfig ? pillarConfig.badgeClass : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {t.category}
                        </p>
                        {t.isRecurring && (
                          <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 text-[9px] font-semibold text-slate-500">
                            Récurrent
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {t.date} {t.description && `• ${t.description}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span
                      className={`text-xs font-bold ${
                        isExpense ? 'text-slate-900 dark:text-slate-100' : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {isExpense ? '-' : '+'} {formatCurrency(t.amount, currency)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDelete(t.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                      title="Supprimer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
