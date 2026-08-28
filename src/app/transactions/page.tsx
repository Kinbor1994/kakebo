'use client';

import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { getCurrentMonth, formatMonthLabel } from '@/lib/kakebo-engine';
import { type KakeiboPillar, type Transaction, PILLARS_CONFIG } from '@/types/kakebo';
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
  Pencil,
  X,
  Calendar,
  AlertCircle,
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

  // Edit transaction state
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editAmount, setEditAmount] = useState<string>('');
  const [editPillar, setEditPillar] = useState<KakeiboPillar>('needs');
  const [editCategory, setEditCategory] = useState<string>('');
  const [editDate, setEditDate] = useState<string>('');
  const [editDescription, setEditDescription] = useState<string>('');

  // Delete confirm state
  const [txToDelete, setTxToDelete] = useState<Transaction | null>(null);

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

  const handleDelete = async () => {
    if (!txToDelete?.id) return;
    await db.transactions.delete(txToDelete.id);
    setTxToDelete(null);
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
            <p className="text-xs text-slate-500">{formatMonthLabel(currentMonth)} • Consultez, modifiez ou supprimez</p>
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

        {/* Live Search Input */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par catégorie, marchand, note..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium outline-hidden focus:border-emerald-500 shadow-2xs"
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
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            Toutes ({transactions.length})
          </button>

          {(['needs', 'wants', 'culture', 'unexpected'] as KakeiboPillar[]).map((pKey) => {
            const pConfig = PILLARS_CONFIG[pKey];
            const count = transactions.filter((t) => t.type === 'expense' && t.pillar === pKey).length;
            const isSelected = selectedPillar === pKey;

            return (
              <button
                key={pKey}
                type="button"
                onClick={() => setSelectedPillar(pKey)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                  isSelected
                    ? `${pConfig.badgeClass} border shadow-2xs`
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                {pConfig.name} ({count})
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setSelectedPillar('income')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              selectedPillar === 'income'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            Revenus ({transactions.filter((t) => t.type === 'income').length})
          </button>
        </div>

        {/* Transactions List */}
        {filteredTransactions.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 p-8 text-center text-xs text-slate-400 space-y-1">
            <Filter className="h-6 w-6 mx-auto text-slate-300 mb-1" />
            <p>Aucune transaction trouvée pour ces critères.</p>
          </div>
        ) : (
          <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800 shadow-xs overflow-hidden">
            {filteredTransactions.map((t) => {
              const isExpense = t.type === 'expense';
              const pConfig = t.pillar ? PILLARS_CONFIG[t.pillar] : null;
              const Icon = t.pillar ? PILLAR_ICONS[t.pillar] : ArrowUpRight;

              return (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-3.5 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition group"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl ${
                        isExpense
                          ? pConfig
                            ? pConfig.bgClass
                            : 'bg-rose-50'
                          : 'bg-emerald-50 text-emerald-600'
                      }`}
                    >
                      <Icon
                        className={`h-4 w-4 ${
                          isExpense ? (pConfig ? pConfig.textClass : 'text-rose-600') : 'text-emerald-600'
                        }`}
                      />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center space-x-1.5">
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                          {t.category}
                        </p>
                        {t.isRecurring && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-indigo-50 text-indigo-700">
                            Auto
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 truncate">
                        {t.date} {t.description && `• ${t.description}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <span
                      className={`text-xs font-extrabold ${
                        isExpense ? 'text-slate-900 dark:text-slate-100' : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {isExpense ? '-' : '+'}
                      {formatCurrency(t.amount, currency)}
                    </span>

                    {/* Edit Button */}
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(t)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      title="Modifier cette opération"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>

                    {/* Delete Button */}
                    <button
                      type="button"
                      onClick={() => setTxToDelete(t)}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 transition"
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

      {/* Delete Confirmation Modal */}
      {txToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold">Supprimer cette opération ?</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Voulez-vous supprimer <strong>{txToDelete.category} ({formatCurrency(txToDelete.amount, currency)})</strong> ?
              </p>
            </div>
            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setTxToDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

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
