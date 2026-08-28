'use client';

import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { getCurrentMonth, calculateLoanMonthlyPayment } from '@/lib/kakebo-engine';
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
  Landmark,
  Plus,
  CheckCircle2,
  X,
  Percent,
  Calculator,
  Calendar,
  Sparkles,
  Pencil,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { format, addMonths, parseISO } from 'date-fns';

export default function TontinesPage() {
  const { isLocked, userSettings } = useSecurity();
  const currency = userSettings?.currency || 'XOF';

  const [currentMonth, setCurrentMonth] = useState<string>(getCurrentMonth());
  const [isQuickAddOpen, setIsQuickAddOpen] = useState<boolean>(false);
  const [isMonthSetupOpen, setIsMonthSetupOpen] = useState<boolean>(false);

  // Filter tabs: 'all' | 'bank_loan' | 'tontine' | 'lent' | 'borrowed'
  const [activeTab, setActiveTab] = useState<'all' | DebtLoanType>('all');

  // New / Edit modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<DebtOrLoan | null>(null);

  // Form states
  const [entryType, setEntryType] = useState<DebtLoanType>('bank_loan');
  const [title, setTitle] = useState<string>('');
  const [contactName, setContactName] = useState<string>('');
  const [totalAmount, setTotalAmount] = useState<string>('5000000');
  const [paidAmount, setPaidAmount] = useState<string>('0');
  const [interestRate, setInterestRate] = useState<string>('7.5');
  const [durationMonths, setDurationMonths] = useState<number>(36);
  const [startDate, setStartDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [dayOfMonth, setDayOfMonth] = useState<number>(5);
  const [dueDate, setDueDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Payment modal
  const [activeItemForPayment, setActiveItemForPayment] = useState<DebtOrLoan | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');

  // Delete confirmation
  const [itemToDelete, setItemToDelete] = useState<DebtOrLoan | null>(null);

  const debtsAndLoans = useLiveQuery(() => db.debtsAndLoans.toArray()) || [];

  const activeItems = debtsAndLoans.filter((item) =>
    activeTab === 'all' ? item.status === 'active' : item.status === 'active' && item.type === activeTab
  );

  const settledItems = debtsAndLoans.filter((item) => item.status === 'settled');

  // Dynamic automatic loan calculation
  const parsedPrincipal = parseFloat(totalAmount.replace(/\s+/g, '').replace(',', '.')) || 0;
  const parsedRate = parseFloat(interestRate.replace(/\s+/g, '').replace(',', '.')) || 0;

  const loanCalculation = useMemo(() => {
    return calculateLoanMonthlyPayment(parsedPrincipal, parsedRate, durationMonths);
  }, [parsedPrincipal, parsedRate, durationMonths]);

  // Compute calculated end date
  const calculatedEndDate = useMemo(() => {
    try {
      const parsedStart = parseISO(startDate);
      return format(addMonths(parsedStart, durationMonths), 'yyyy-MM-dd');
    } catch {
      return '';
    }
  }, [startDate, durationMonths]);

  // Aggregate totals
  const totalBankLoansRemaining = debtsAndLoans
    .filter((d) => d.type === 'bank_loan' && d.status === 'active')
    .reduce((sum, d) => sum + (d.totalAmount - d.paidAmount), 0);

  const totalTontineRemaining = debtsAndLoans
    .filter((d) => d.type === 'tontine' && d.status === 'active')
    .reduce((sum, d) => sum + (d.totalAmount - d.paidAmount), 0);

  const totalLentRemaining = debtsAndLoans
    .filter((d) => d.type === 'lent' && d.status === 'active')
    .reduce((sum, d) => sum + (d.totalAmount - d.paidAmount), 0);

  const totalBorrowedRemaining = debtsAndLoans
    .filter((d) => d.type === 'borrowed' && d.status === 'active')
    .reduce((sum, d) => sum + (d.totalAmount - d.paidAmount), 0);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setEntryType('bank_loan');
    setTitle('');
    setContactName('');
    setTotalAmount('5000000');
    setPaidAmount('0');
    setInterestRate('7.5');
    setDurationMonths(36);
    setStartDate(format(new Date(), 'yyyy-MM-dd'));
    setDayOfMonth(5);
    setDueDate('');
    setNotes('');
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (item: DebtOrLoan) => {
    setEditingItem(item);
    setEntryType(item.type);
    setTitle(item.title);
    setContactName(item.contactName);
    setTotalAmount(String(item.totalAmount));
    setPaidAmount(String(item.paidAmount));
    setInterestRate(item.interestRate !== undefined ? String(item.interestRate) : '7.5');
    setDurationMonths(item.durationMonths || 36);
    setStartDate(format(new Date(), 'yyyy-MM-dd'));
    setDayOfMonth(item.dayOfMonth || 5);
    setDueDate(item.dueDate || '');
    setNotes(item.notes || '');
    setIsAddModalOpen(true);
  };

  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    const numPaid = parseFloat(paidAmount.replace(/\s+/g, '').replace(',', '.')) || 0;

    if (!title.trim() || parsedPrincipal <= 0) return;

    if (editingItem && editingItem.id) {
      // UPDATE EXISTING
      if (entryType === 'bank_loan') {
        await db.debtsAndLoans.update(editingItem.id, {
          type: 'bank_loan',
          title: title.trim(),
          contactName: contactName.trim() || 'Établissement Bancaire',
          totalAmount: parsedPrincipal,
          paidAmount: numPaid,
          monthlyPayment: loanCalculation.monthlyPayment,
          durationMonths,
          interestRate: parsedRate,
          totalInterest: loanCalculation.totalInterest,
          dueDate: calculatedEndDate,
          dayOfMonth,
          notes: notes.trim() || undefined,
          status: numPaid >= parsedPrincipal ? 'settled' : 'active',
        });
      } else {
        await db.debtsAndLoans.update(editingItem.id, {
          type: entryType,
          title: title.trim(),
          contactName: contactName.trim() || 'Non spécifié',
          totalAmount: parsedPrincipal,
          paidAmount: numPaid,
          dueDate: dueDate || undefined,
          dayOfMonth: entryType === 'tontine' ? dayOfMonth : undefined,
          notes: notes.trim() || undefined,
          status: numPaid >= parsedPrincipal ? 'settled' : 'active',
        });
      }
    } else {
      // CREATE NEW
      if (entryType === 'bank_loan') {
        await db.debtsAndLoans.add({
          type: 'bank_loan',
          title: title.trim(),
          contactName: contactName.trim() || 'Établissement Bancaire',
          totalAmount: parsedPrincipal,
          paidAmount: numPaid,
          monthlyPayment: loanCalculation.monthlyPayment,
          durationMonths,
          interestRate: parsedRate,
          totalInterest: loanCalculation.totalInterest,
          dueDate: calculatedEndDate,
          dayOfMonth,
          notes: notes.trim() || undefined,
          status: numPaid >= parsedPrincipal ? 'settled' : 'active',
          createdAt: new Date().toISOString(),
        });
      } else {
        await db.debtsAndLoans.add({
          type: entryType,
          title: title.trim(),
          contactName: contactName.trim() || 'Non spécifié',
          totalAmount: parsedPrincipal,
          paidAmount: numPaid,
          dueDate: dueDate || undefined,
          dayOfMonth: entryType === 'tontine' ? dayOfMonth : undefined,
          notes: notes.trim() || undefined,
          status: numPaid >= parsedPrincipal ? 'settled' : 'active',
          createdAt: new Date().toISOString(),
        });
      }
    }

    setIsAddModalOpen(false);
    setEditingItem(null);
  };

  const handleDeleteItem = async () => {
    if (!itemToDelete?.id) return;
    await db.debtsAndLoans.delete(itemToDelete.id);
    setItemToDelete(null);
  };

  const handleOpenPayment = (item: DebtOrLoan) => {
    setActiveItemForPayment(item);
    if (item.monthlyPayment) {
      setPaymentAmount(String(item.monthlyPayment));
    } else {
      setPaymentAmount('');
    }
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

    // Automatically record as an expense transaction in Kakeibo
    const now = new Date();
    if (
      activeItemForPayment.type === 'bank_loan' ||
      activeItemForPayment.type === 'borrowed' ||
      activeItemForPayment.type === 'tontine'
    ) {
      const categoryName =
        activeItemForPayment.type === 'bank_loan'
          ? 'Prêt Bancaire & Crédit'
          : activeItemForPayment.type === 'tontine'
          ? 'Tontine'
          : 'Remboursement dette';

      await db.transactions.add({
        month: format(now, 'yyyy-MM'),
        date: format(now, 'yyyy-MM-dd'),
        amount: numPay,
        type: 'expense',
        pillar: activeItemForPayment.type === 'bank_loan' || activeItemForPayment.type === 'tontine' ? 'needs' : 'unexpected',
        category: categoryName,
        description: `Remboursement : ${activeItemForPayment.title} (${activeItemForPayment.contactName})`,
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
            <h1 className="text-lg font-bold tracking-tight">Prêts Bancaires & Tontines</h1>
            <p className="text-xs text-slate-500">Ajoutez, modifiez ou supprimez vos crédits et cotisations</p>
          </div>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition shadow-2xs active:scale-98"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Nouveau suivi</span>
          </button>
        </div>

        {/* Global Summary Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="rounded-2xl border border-purple-200/80 dark:border-purple-900/40 bg-white dark:bg-slate-900 p-3 shadow-2xs space-y-1">
            <span className="text-[10px] font-bold uppercase text-purple-600 dark:text-purple-400 block truncate">
              Prêts Bancaires
            </span>
            <p className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate">
              {formatCurrency(totalBankLoansRemaining, currency)}
            </p>
          </div>

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
              Prêté à des tiers
            </span>
            <p className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate">
              {formatCurrency(totalLentRemaining, currency)}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-2xs space-y-1">
            <span className="text-[10px] font-bold uppercase text-rose-600 block truncate">
              Dettes dues
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
            Tous ({debtsAndLoans.filter((d) => d.status === 'active').length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('bank_loan')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              activeTab === 'bank_loan'
                ? 'bg-purple-50 text-purple-800 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            Prêts Bancaires ({debtsAndLoans.filter((d) => d.type === 'bank_loan' && d.status === 'active').length})
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

        {/* Active Items List with EDIT and DELETE buttons */}
        {activeItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 p-8 text-center text-xs text-slate-400 space-y-2">
            <Landmark className="h-7 w-7 mx-auto text-slate-300" />
            <p>Aucun suivi actif dans cette catégorie.</p>
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
                            item.type === 'bank_loan'
                              ? 'bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300'
                              : item.type === 'tontine'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : item.type === 'lent'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {item.type === 'bank_loan'
                            ? 'Prêt Bancaire'
                            : item.type === 'tontine'
                            ? 'Tontine'
                            : item.type === 'lent'
                            ? 'Prêté'
                            : 'Emprunté'}
                        </span>
                        <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {item.title}
                        </h3>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Organisme / Contact : <strong>{item.contactName}</strong>
                        {item.monthlyPayment && ` • Mensualité : ${formatCurrency(item.monthlyPayment, currency)}`}
                        {item.interestRate !== undefined && ` • Taux : ${item.interestRate}%`}
                        {item.durationMonths && ` • Durée : ${item.durationMonths} mois`}
                        {item.dayOfMonth && ` • Prélèvement le ${item.dayOfMonth}`}
                        {item.dueDate && ` • Fin : ${item.dueDate}`}
                      </p>
                    </div>

                    {/* Actions : Verser, Modifier, Supprimer */}
                    <div className="flex items-center space-x-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenPayment(item)}
                        className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-purple-50 hover:text-purple-700 transition"
                      >
                        {item.type === 'bank_loan' ? '+ Mensualité' : '+ Verser'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenEdit(item)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        title="Modifier ce prêt / suivi"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setItemToDelete(item)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 transition"
                        title="Supprimer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="flex items-baseline justify-between text-xs font-semibold">
                      <span className="text-slate-500">
                        Remboursé : {formatCurrency(item.paidAmount, currency)} ({progress}%)
                      </span>
                      <span className="text-slate-900 dark:text-slate-100 font-extrabold">
                        Capital restant : {formatCurrency(remaining, currency)}
                      </span>
                    </div>

                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          item.type === 'bank_loan'
                            ? 'bg-purple-600'
                            : item.type === 'tontine'
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

                  <div className="flex items-center space-x-2">
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>Soldé</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setItemToDelete(s)}
                      className="p-1 text-slate-400 hover:text-rose-600 transition"
                      title="Supprimer des archives"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Add / Edit Entry Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4 text-slate-900 dark:text-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-base font-bold">
                {editingItem ? 'Modifier le suivi financier' : 'Nouveau prêt ou suivi'}
              </h2>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEntry} className="space-y-3 text-xs">
              {/* Type selector (only if new) */}
              {!editingItem && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 rounded-2xl bg-slate-100 dark:bg-slate-800 p-1">
                  <button
                    type="button"
                    onClick={() => setEntryType('bank_loan')}
                    className={`py-1.5 rounded-xl font-bold transition text-center ${
                      entryType === 'bank_loan' ? 'bg-white dark:bg-slate-700 text-purple-700 shadow-xs' : 'text-slate-500'
                    }`}
                  >
                    Prêt Bancaire
                  </button>
                  <button
                    type="button"
                    onClick={() => setEntryType('tontine')}
                    className={`py-1.5 rounded-xl font-bold transition text-center ${
                      entryType === 'tontine' ? 'bg-white dark:bg-slate-700 text-emerald-700 shadow-xs' : 'text-slate-500'
                    }`}
                  >
                    Tontine
                  </button>
                  <button
                    type="button"
                    onClick={() => setEntryType('lent')}
                    className={`py-1.5 rounded-xl font-bold transition text-center ${
                      entryType === 'lent' ? 'bg-white dark:bg-slate-700 text-blue-700 shadow-xs' : 'text-slate-500'
                    }`}
                  >
                    Prêt accordé
                  </button>
                  <button
                    type="button"
                    onClick={() => setEntryType('borrowed')}
                    className={`py-1.5 rounded-xl font-bold transition text-center ${
                      entryType === 'borrowed' ? 'bg-white dark:bg-slate-700 text-rose-700 shadow-xs' : 'text-slate-500'
                    }`}
                  >
                    Dette due
                  </button>
                </div>
              )}

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  {entryType === 'bank_loan' ? 'Intitulé du prêt' : 'Intitulé'}
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={
                    entryType === 'bank_loan'
                      ? 'Ex: Prêt Scolaire Rentrée, Crédit Consommation, Prêt Véhicule, Crédit Immo...'
                      : 'Ex: Tontine des amis, Prêt frangin...'
                  }
                  required
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-hidden font-medium focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  {entryType === 'bank_loan' ? 'Établissement bancaire ou prêteur' : 'Nom du contact ou groupe'}
                </label>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder={
                    entryType === 'bank_loan'
                      ? 'Ex: BOA, Ecobank, Société Générale, NSIA...'
                      : 'Ex: Paul, Association quartier...'
                  }
                  required
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-hidden font-medium focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    {entryType === 'bank_loan' ? `Capital emprunté (${currency})` : `Montant total (${currency})`}
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(e.target.value)}
                    placeholder="5000000"
                    required
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-hidden font-bold focus:border-purple-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Déjà amorti / remboursé</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-hidden font-bold focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Bank Loan Specific Automatic Calculation Fields */}
              {entryType === 'bank_loan' && (
                <div className="space-y-3 p-3 rounded-2xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-900/40">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-1">
                        <Percent className="h-3 w-3 text-purple-600" />
                        <span>Taux annuel (%)</span>
                      </label>
                      <input
                        type="text"
                        value={interestRate}
                        onChange={(e) => setInterestRate(e.target.value)}
                        placeholder="7.5"
                        className="w-full px-3 py-2 rounded-xl border border-purple-200 dark:border-purple-800 bg-white dark:bg-slate-800 outline-hidden font-bold"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-slate-700 dark:text-slate-300">Durée (en mois)</label>
                      <input
                        type="number"
                        min={1}
                        max={360}
                        value={durationMonths}
                        onChange={(e) => setDurationMonths(Math.max(1, Number(e.target.value)))}
                        className="w-full px-3 py-2 rounded-xl border border-purple-200 dark:border-purple-800 bg-white dark:bg-slate-800 outline-hidden font-bold"
                      />
                    </div>
                  </div>

                  {/* Quick templates & Loan presets */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-500">
                      Modèles de prêts fréquents :
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setDurationMonths(10);
                          if (!title || title.includes('Prêt')) setTitle('Prêt Scolaire Rentrée');
                        }}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition ${
                          durationMonths === 10
                            ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                            : 'bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 hover:bg-purple-50'
                        }`}
                      >
                        🎓 Prêt Scolaire (10 mois)
                      </button>
                      <button
                        type="button"
                        onClick={() => setDurationMonths(6)}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition ${
                          durationMonths === 6
                            ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                            : 'bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 hover:bg-purple-50'
                        }`}
                      >
                        ⚡ Court terme (6 mois)
                      </button>
                      <button
                        type="button"
                        onClick={() => setDurationMonths(12)}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition ${
                          durationMonths === 12
                            ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                            : 'bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 hover:bg-purple-50'
                        }`}
                      >
                        12 mois (1 an)
                      </button>
                      <button
                        type="button"
                        onClick={() => setDurationMonths(24)}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition ${
                          durationMonths === 24
                            ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                            : 'bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 hover:bg-purple-50'
                        }`}
                      >
                        24 mois (2 ans)
                      </button>
                      <button
                        type="button"
                        onClick={() => setDurationMonths(36)}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition ${
                          durationMonths === 36
                            ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                            : 'bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 hover:bg-purple-50'
                        }`}
                      >
                        36 mois (3 ans)
                      </button>
                      <button
                        type="button"
                        onClick={() => setDurationMonths(60)}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition ${
                          durationMonths === 60
                            ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                            : 'bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 hover:bg-purple-50'
                        }`}
                      >
                        60 mois (5 ans)
                      </button>
                    </div>
                  </div>

                  {/* Automatic Calculation Result Card */}
                  <div className="rounded-xl bg-white dark:bg-slate-900 p-3 border border-purple-200 dark:border-purple-900/60 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center space-x-1">
                        <Calculator className="h-3.5 w-3.5 text-purple-600" />
                        <span>Mensualité calculée automatiquement :</span>
                      </span>
                      <span className="text-sm font-extrabold text-purple-700 dark:text-purple-300">
                        {formatCurrency(loanCalculation.monthlyPayment, currency)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
                      <span>Intérêts totaux : {formatCurrency(loanCalculation.totalInterest, currency)}</span>
                      <span>Total à rembourser : {formatCurrency(loanCalculation.totalPayment, currency)}</span>
                    </div>
                  </div>
                </div>
              )}

              {entryType === 'tontine' || entryType === 'bank_loan' ? (
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">Jour de prélèvement</label>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={dayOfMonth}
                      onChange={(e) => setDayOfMonth(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-hidden"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">
                      {entryType === 'bank_loan' ? 'Date de 1ère échéance' : 'Échéance de fin'}
                    </label>
                    <input
                      type="date"
                      value={entryType === 'bank_loan' ? startDate : dueDate}
                      onChange={(e) => {
                        if (entryType === 'bank_loan') setStartDate(e.target.value);
                        else setDueDate(e.target.value);
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-hidden"
                    />
                  </div>
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
                className="w-full py-3 rounded-xl bg-purple-600 text-white font-bold hover:bg-purple-700 transition mt-2 shadow-sm"
              >
                {editingItem ? 'Enregistrer les modifications' : 'Enregistrer le prêt bancaire'}
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
                <h2 className="text-sm font-bold">
                  {activeItemForPayment.type === 'bank_loan' ? 'Régler une mensualité' : 'Enregistrer un versement'}
                </h2>
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
                  placeholder="155000"
                  required
                  autoFocus
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-hidden text-center text-xl font-extrabold focus:border-purple-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-purple-600 text-white font-bold hover:bg-purple-700 transition mt-2 shadow-sm"
              >
                Confirmer le versement
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold">Supprimer ce suivi ?</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Voulez-vous vraiment supprimer définitivement <strong>&quot;{itemToDelete.title}&quot;</strong> ?
              </p>
            </div>
            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleDeleteItem}
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
