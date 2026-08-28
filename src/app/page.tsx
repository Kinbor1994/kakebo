'use client';

import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, applyRecurringItemsForMonth } from '@/lib/db';
import { getCurrentMonth, calculateMonthlyStats } from '@/lib/kakebo-engine';
import { type KakeiboPillar, type Transaction, PILLARS_CONFIG } from '@/types/kakebo';
import { AppHeader } from '@/components/layout/AppHeader';
import { BottomNav } from '@/components/layout/BottomNav';
import { BudgetOverview } from '@/components/kakebo/BudgetOverview';
import { PillarCard } from '@/components/kakebo/PillarCard';
import { QuickAddModal } from '@/components/kakebo/QuickAddModal';
import { MonthSetupModal } from '@/components/kakebo/MonthSetupModal';
import { useSecurity } from '@/components/security/SecurityContext';
import { PinLockScreen } from '@/components/security/PinLockScreen';
import { formatCurrency } from '@/lib/utils';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ShoppingBag,
  Sparkles,
  BookOpen,
  AlertTriangle,
  ChevronRight,
  Trash2,
  Lightbulb,
  PieChart,
  Clock,
  Handshake,
  Landmark,
  Target,
  Pencil,
  X,
} from 'lucide-react';
import Link from 'next/link';

const PILLAR_ICONS = {
  needs: ShoppingBag,
  wants: Sparkles,
  culture: BookOpen,
  unexpected: AlertTriangle,
};

export default function DashboardPage() {
  const { isLocked, userSettings } = useSecurity();
  const currency = userSettings?.currency || 'XOF';

  const [currentMonth, setCurrentMonth] = useState<string>(getCurrentMonth());
  const [isQuickAddOpen, setIsQuickAddOpen] = useState<boolean>(false);
  const [isMonthSetupOpen, setIsMonthSetupOpen] = useState<boolean>(false);

  // Edit transaction modal state
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editAmount, setEditAmount] = useState<string>('');
  const [editPillar, setEditPillar] = useState<KakeiboPillar>('needs');
  const [editCategory, setEditCategory] = useState<string>('');
  const [editDate, setEditDate] = useState<string>('');
  const [editDescription, setEditDescription] = useState<string>('');

  // Apply recurring items automatically when month is viewed
  useEffect(() => {
    applyRecurringItemsForMonth(currentMonth);
  }, [currentMonth]);

  // Live queries for reactive data
  const budget = useLiveQuery(
    () => db.monthlyBudgets.where('month').equals(currentMonth).first(),
    [currentMonth]
  );

  const transactions = useLiveQuery(
    () => db.transactions.where('month').equals(currentMonth).reverse().toArray(),
    [currentMonth]
  ) || [];

  const stats = calculateMonthlyStats(budget, transactions);
  const recentTransactions = transactions.slice(0, 5);

  const handleOpenEdit = (t: Transaction) => {
    setEditingTransaction(t);
    setEditAmount(String(t.amount));
    setEditPillar(t.pillar || 'needs');
    setEditCategory(t.category);
    setEditDate(t.date);
    setEditDescription(t.description || '');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTransaction?.id) return;
    const numAmt = parseFloat(editAmount.replace(/\s+/g, '').replace(',', '.')) || 0;
    if (numAmt <= 0) return;

    const newMonth = editDate.substring(0, 7);

    await db.transactions.update(editingTransaction.id, {
      amount: numAmt,
      pillar: editingTransaction.type === 'expense' ? editPillar : undefined,
      category: editCategory.trim(),
      date: editDate,
      month: newMonth,
      description: editDescription.trim() || undefined,
    });

    setEditingTransaction(null);
  };

  const handleDeleteTransaction = async (id?: number) => {
    if (!id) return;
    await db.transactions.delete(id);
  };

  if (isLocked) {
    return <PinLockScreen />;
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-28">
      {/* Top Header */}
      <AppHeader
        currentMonth={currentMonth}
        onMonthChange={setCurrentMonth}
        onOpenMonthSetup={() => setIsMonthSetupOpen(true)}
      />

      {/* Main Container */}
      <main className="mx-auto max-w-xl px-4 pt-5 space-y-6">
        {/* Central Budget & Savings Overview */}
        <BudgetOverview
          stats={stats}
          budget={budget}
          currency={currency}
          onOpenSetup={() => setIsMonthSetupOpen(true)}
        />

        {/* 4 Kakeibo Pillars Grid */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Les 4 Piliers du Budget
            </h2>
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              Total dépensé : {formatCurrency(stats.totalSpent, currency)}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(['needs', 'wants', 'culture', 'unexpected'] as KakeiboPillar[]).map((pKey) => (
              <PillarCard
                key={pKey}
                pillar={pKey}
                spent={stats.spentByPillar[pKey]}
                percentage={stats.percentageByPillar[pKey]}
                currency={currency}
                transactions={transactions}
                onClick={() => setIsQuickAddOpen(true)}
              />
            ))}
          </div>
        </section>

        {/* Quick Modules Navigation Grid */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <Link
            href="/analyses"
            className="flex flex-col items-center justify-center p-3 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 hover:shadow-xs hover:border-emerald-300 transition text-center group"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 mb-1.5 group-hover:scale-110 transition">
              <PieChart className="h-4 w-4 stroke-[2.2]" />
            </div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Analyses</span>
            <span className="text-[10px] text-slate-400">Graphiques & Zen</span>
          </Link>

          <Link
            href="/rituels"
            className="flex flex-col items-center justify-center p-3 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 hover:shadow-xs hover:border-emerald-300 transition text-center group"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600 mb-1.5 group-hover:scale-110 transition">
              <Clock className="h-4 w-4 stroke-[2.2]" />
            </div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Wishlist 48h</span>
            <span className="text-[10px] text-slate-400">Achats différés</span>
          </Link>

          <Link
            href="/tontines"
            className="flex flex-col items-center justify-center p-3 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 hover:shadow-xs hover:border-purple-300 transition text-center group"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 mb-1.5 group-hover:scale-110 transition">
              <Landmark className="h-4 w-4 stroke-[2.2]" />
            </div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Prêts Bancaires</span>
            <span className="text-[10px] text-slate-400">Crédits & Tontines</span>
          </Link>

          <Link
            href="/cagnottes"
            className="flex flex-col items-center justify-center p-3 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 hover:shadow-xs hover:border-emerald-300 transition text-center group"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-600 mb-1.5 group-hover:scale-110 transition">
              <Target className="h-4 w-4 stroke-[2.2]" />
            </div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Cagnottes</span>
            <span className="text-[10px] text-slate-400">Projets d&apos;épargne</span>
          </Link>
        </section>

        {/* Recent Transactions List */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Dernières dépenses
            </h2>
            <Link
              href="/transactions"
              className="inline-flex items-center space-x-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              <span>Voir tout ({transactions.length})</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {recentTransactions.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-center text-xs text-slate-400">
              Aucune dépense enregistrée ce mois-ci. Touchez le bouton &quot;+&quot; pour ajouter un achat.
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800 shadow-xs">
              {recentTransactions.map((t) => {
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

                    <div className="flex items-center space-x-1.5">
                      <span
                        className={`text-xs font-bold mr-1 ${
                          isExpense ? 'text-slate-900 dark:text-slate-100' : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {isExpense ? '-' : '+'} {formatCurrency(t.amount, currency)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(t)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
                        title="Modifier"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTransaction(t.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 transition"
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
        </section>

        {/* Kakeibo Mindful Advice */}
        <section className="rounded-2xl border border-emerald-200/70 dark:border-emerald-900/40 bg-emerald-50/60 dark:bg-emerald-950/20 p-4 space-y-1.5 shadow-2xs">
          <div className="flex items-center space-x-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
            <Lightbulb className="h-4 w-4" />
            <span>Règle d&apos;or du Kakeibo</span>
          </div>
          <p className="text-xs text-emerald-900/80 dark:text-emerald-200/80 leading-relaxed">
            &quot;Mettez toujours votre épargne de côté dès le premier jour du mois.&quot;
            En ajustant vos dépenses quotidiennes au reste à vivre disponible, vous bâtissez votre sécurité financière sans frustration.
          </p>
        </section>
      </main>

      {/* Edit Transaction Modal */}
      {editingTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4 text-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-base font-bold">Modifier l&apos;opération</h2>
              <button
                type="button"
                onClick={() => setEditingTransaction(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Montant ({currency})</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-hidden font-extrabold text-lg text-center focus:border-emerald-500"
                />
              </div>

              {editingTransaction.type === 'expense' && (
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Pilier Kakeibo</label>
                  <select
                    value={editPillar}
                    onChange={(e) => setEditPillar(e.target.value as KakeiboPillar)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-hidden font-medium"
                  >
                    <option value="needs">Besoins essentiels</option>
                    <option value="wants">Envies & Plaisirs</option>
                    <option value="culture">Culture & Formation</option>
                    <option value="unexpected">Imprévus & Extras</option>
                  </select>
                </div>
              )}

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Catégorie</label>
                <input
                  type="text"
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-hidden font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Date</label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-hidden font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Note / Marchand (optionnel)</label>
                <input
                  type="text"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-hidden"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition mt-2 shadow-sm"
              >
                Enregistrer les modifications
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Floating Modals */}
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

      {/* Bottom Floating Navigation */}
      <BottomNav onOpenQuickAdd={() => setIsQuickAddOpen(true)} />
    </div>
  );
}
