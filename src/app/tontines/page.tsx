'use client';

import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { getCurrentMonth } from '@/lib/kakebo-engine';
import { type DebtOrLoan, type DebtLoanType } from '@/types/kakebo';
import { AppHeader } from '@/components/layout/AppHeader';
import { BottomNav } from '@/components/layout/BottomNav';
import { QuickAddModal } from '@/components/kakebo/QuickAddModal';
import { MonthSetupModal } from '@/components/kakebo/MonthSetupModal';
import { useSecurity } from '@/components/security/SecurityContext';
import { PinLockScreen } from '@/components/security/PinLockScreen';
import { formatCurrency } from '@/lib/utils';
import confetti from 'canvas-confetti';
import {
  Handshake,
  ArrowUpRight,
  ArrowDownLeft,
  Users,
  Plus,
  Trash2,
  CheckCircle2,
  X,
  Calendar,
  DollarSign,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { format } from 'date-fns';

export default function TontinesPage() {
  const { isLocked, userSettings } = useSecurity();
  const currency = userSettings?.currency || 'XOF';

  const [currentMonth, setCurrentMonth] = useState<string>(getCurrentMonth());
  const [isQuickAddOpen, setIsQuickAddOpen] = useState<boolean>(false);
  const [isMonthSetupOpen, setIsMonthSetupOpen] = useState<boolean>(false);

  // Filter tabs: 'all' | 'tontine' | 'lent' | 'borrowed'
  const [activeTab, setActiveTab] = useState<'all' | DebtLoanType>('all');

  // New entry modal
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [entryType, setEntryType] = useState<DebtLoanType>('tontine');
  const [title, setTitle] = useState<string>('');
  const [contactName, setContactName] = useState<string>('');
  const [totalAmount, setTotalAmount] = useState<string>('');
  const [paidAmount, setPaidAmount] = useState<string>('0');
  const [dueDate, setDueDate] = useState<string>('');
  const [dayOfMonth, setDayOfMonth] = useState<number>(5);
  const [notes, setNotes] = useState<string>('');

  // Payment / Repayment modal
  const [activeItemForPayment, setActiveItemForPayment] = useState<DebtOrLoan | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');

  const debtsAndLoans = useLiveQuery(() => db.debtsAndLoans.toArray()) || [];

  const activeItems = debtsAndLoans.filter((item) =>
    activeTab === 'all' ? item.status === 'active' : item.status === 'active' && item.type === activeTab
  );

  const settledItems = debtsAndLoans.filter((item) => item.status === 'settled');

  // Aggregate sums
  const totalLentRemaining = debtsAndLoans
    .filter((d) => d.type === 'lent' && d.status === 'active')
    .reduce((sum, d) => sum + (d.totalAmount - d.paidAmount), 0);

  const totalBorrowedRemaining = debtsAndLoans
    .filter((d) => d.type === 'borrowed' && d.status === 'active')
    .reduce((sum, d) => sum + (d.totalAmount - d.paidAmount), 0);

  const totalTontineRemaining = debtsAndLoans
    .filter((d) => d.type === 'tontine' && d.status === 'active')
    .reduce((sum, d) => sum + (d.totalAmount - d.paidAmount), 0);

  const handleCreateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    const numTotal = parseFloat(totalAmount.replace(/\s+/g, '').replace(',', '.')) || 0;
    const numPaid = parseFloat(paidAmount.replace(/\s+/g, '').replace(',', '.')) || 0;
    if (!title.trim() || numTotal <= 0) return;

    await db.debtsAndLoans.add({
      type: entryType,
      title: title.trim(),
      contactName: contactName.trim() || 'Non spécifié',
      totalAmount: numTotal,
      paidAmount: numPaid,
      dueDate: dueDate || undefined,
      dayOfMonth: entryType === 'tontine' ? dayOfMonth : undefined,
      notes: notes.trim() || undefined,
      status: numPaid >= numTotal ? 'settled' : 'active',
      createdAt: new Date().toISOString(),
    });

    setTitle('');
    setContactName('');
    setTotalAmount('');
    setPaidAmount('0');
    setDueDate('');
    setNotes('');
    setIsAddModalOpen(false);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeItemForPayment?.id) return;
    const numPay = parseFloat(paymentAmount.replace(/\s+/g, '').replace(',', '.')) || 0;
    if (numPay <= 0) return;

    const newPaidAmount = activeItemForPayment.paidAmount + numPay;
    const isNowSettled = newPaidAmount >= activeItemForPayment.totalAmount;

    await db.debtsAndLoans.update(activeItemForPayment.id, {
      paidAmount: newPaidAmount,
      status: isNowSettled ? 'settled' : 'active',
    });

    // Optionally record as a transaction in Kakeibo
    const now = new Date();
    if (activeItemForPayment.type === 'borrowed' || activeItemForPayment.type === 'tontine') {
      await db.transactions.add({
        month: format(now, 'yyyy-MM'),
        date: format(now, 'yyyy-MM-dd'),
        amount: numPay,
        type: 'expense',
        pillar: activeItemForPayment.type === 'tontine' ? 'needs' : 'unexpected',
        category: activeItemForPayment.type === 'tontine' ? 'Tontine' : 'Remboursement dette',
        description: `Versement : ${activeItemForPayment.title}`,
        createdAt: now.toISOString(),
      });
    }

    if (isNowSettled) {
      confetti({
        particleCount: 90,
        spread: 60,
        origin: { y: 0.6 },
      });
    }

    setPaymentAmount('');
    setActiveItemForPayment(null);
  };

  const handleDeleteEntry = async (id?: number) => {
    if (!id) return;
    await db.debtsAndLoans.delete(id);
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

      <main className="mx-auto max-w-xl px-4 pt-5 space-y-5">
        {/* Header Title */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold tracking-tight">Tontines & Prêts</h1>
            <p className="text-xs text-slate-500">Suivi des cotisations, créances et remboursements</p>
          </div>

          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition shadow-2xs active:scale-98"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Nouveau suivi</span>
          </button>
        </div>

        {/* Global Summary Cards */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-2xs space-y-1">
            <span className="text-[10px] font-bold uppercase text-emerald-600 block truncate">
              Tontines
            </span>
            <p className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate">
              {formatCurrency(totalTontineRemaining, currency)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-2xs space-y-1">
            <span className="text-[10px] font-bold uppercase text-blue-600 block truncate">
              Prêté à d&apos;autres
            </span>
            <p className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate">
              {formatCurrency(totalLentRemaining, currency)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-2xs space-y-1">
            <span className="text-[10px] font-bold uppercase text-rose-600 block truncate">
              Emprunté
            </span>
            <p className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate">
              {formatCurrency(totalBorrowedRemaining, currency)}
            </p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              activeTab === 'all'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-2xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            Tous les actifs ({debtsAndLoans.filter((d) => d.status === 'active').length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tontine')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              activeTab === 'tontine'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            Tontines ({debtsAndLoans.filter((d) => d.type === 'tontine' && d.status === 'active').length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('lent')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              activeTab === 'lent'
                ? 'bg-blue-50 text-blue-800 border border-blue-200'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            Argent prêté ({debtsAndLoans.filter((d) => d.type === 'lent' && d.status === 'active').length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('borrowed')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              activeTab === 'borrowed'
                ? 'bg-rose-50 text-rose-800 border border-rose-200'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            Dettes dues ({debtsAndLoans.filter((d) => d.type === 'borrowed' && d.status === 'active').length})
          </button>
        </div>

        {/* Active Items List */}
        {activeItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 p-8 text-center text-xs text-slate-400 space-y-2">
            <Handshake className="h-7 w-7 mx-auto text-slate-300" />
            <p>Aucun suivi actif enregistré dans cette catégorie.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeItems.map((item) => {
              const remaining = Math.max(0, item.totalAmount - item.paidAmount);
              const progress = item.totalAmount > 0 ? Math.round((item.paidAmount / item.totalAmount) * 100) : 0;

              return (
                <div
                  key={item.id}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            item.type === 'tontine'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : item.type === 'lent'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {item.type === 'tontine' ? 'Tontine' : item.type === 'lent' ? 'Prêté' : 'Emprunté'}
                        </span>
                        <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {item.title}
                        </h3>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Contact / Groupe : <strong>{item.contactName}</strong>
                        {item.dueDate && ` • Échéance : ${item.dueDate}`}
                        {item.dayOfMonth && ` • Cotisation le ${item.dayOfMonth} du mois`}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setActiveItemForPayment(item)}
                      className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-emerald-50 hover:text-emerald-700 transition"
                    >
                      + Verser
                    </button>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="flex items-baseline justify-between text-xs font-semibold">
                      <span className="text-slate-500">
                        Versé : {formatCurrency(item.paidAmount, currency)} ({progress}%)
                      </span>
                      <span className="text-slate-900 dark:text-slate-100 font-extrabold">
                        Reste : {formatCurrency(remaining, currency)}
                      </span>
                    </div>

                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          item.type === 'tontine'
                            ? 'bg-emerald-600'
                            : item.type === 'lent'
                            ? 'bg-blue-600'
                            : 'bg-rose-600'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(3, progress))}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Settled Items History */}
        {settledItems.length > 0 && (
          <section className="space-y-2 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Historique soldé & clôturé
            </h3>
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 divide-y divide-slate-100 dark:divide-slate-800 shadow-2xs">
              {settledItems.slice(0, 4).map((s) => (
                <div key={s.id} className="flex items-center justify-between p-3 text-xs">
                  <div>
                    <p className="font-bold text-slate-800 dark:text-slate-200">{s.title}</p>
                    <p className="text-[10px] text-slate-400">
                      {s.contactName} • {formatCurrency(s.totalAmount, currency)}
                    </p>
                  </div>

                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Soldé</span>
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Add Entry Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4 text-slate-900 dark:text-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-base font-bold">Nouveau suivi financier</h2>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEntry} className="space-y-3 text-xs">
              {/* Type selector */}
              <div className="grid grid-cols-3 gap-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800 p-1">
                <button
                  type="button"
                  onClick={() => setEntryType('tontine')}
                  className={`py-1.5 rounded-xl font-bold transition ${
                    entryType === 'tontine' ? 'bg-white dark:bg-slate-700 text-emerald-700 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  Tontine
                </button>
                <button
                  type="button"
                  onClick={() => setEntryType('lent')}
                  className={`py-1.5 rounded-xl font-bold transition ${
                    entryType === 'lent' ? 'bg-white dark:bg-slate-700 text-blue-700 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  Prêt accordé
                </button>
                <button
                  type="button"
                  onClick={() => setEntryType('borrowed')}
                  className={`py-1.5 rounded-xl font-bold transition ${
                    entryType === 'borrowed' ? 'bg-white dark:bg-slate-700 text-rose-700 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  Emprunt reçu
                </button>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Intitulé</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Tontine des amis, Prêt frangin..."
                  required
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-hidden font-medium focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Nom du contact ou groupe</label>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Ex: Paul, Association quartier..."
                  required
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-hidden font-medium focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Montant total ({currency})</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(e.target.value)}
                    placeholder="100000"
                    required
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-hidden font-bold focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Déjà versé / remboursé</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-hidden font-bold focus:border-emerald-500"
                  />
                </div>
              </div>

              {entryType === 'tontine' ? (
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Jour de cotisation mensuelle</label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={dayOfMonth}
                    onChange={(e) => setDayOfMonth(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-hidden"
                  />
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Échéance finale (optionnel)</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-hidden"
                  />
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition mt-2"
              >
                Enregistrer le suivi
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {activeItemForPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4 text-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-sm font-bold">Enregistrer un versement</h2>
                <p className="text-[11px] text-slate-500">{activeItemForPayment.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setActiveItemForPayment(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Montant du versement ({currency})
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="25000"
                  required
                  autoFocus
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-hidden text-center text-xl font-extrabold focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition mt-2"
              >
                Confirmer le versement
              </button>
            </form>
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
