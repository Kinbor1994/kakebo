'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/db';
import { type MonthlyBudget } from '@/types/kakebo';
import { useSecurity } from '../security/SecurityContext';
import { formatCurrency } from '@/lib/utils';
import { formatMonthLabel } from '@/lib/kakebo-engine';
import { X, Calculator, Sparkles, TrendingUp, PiggyBank, ArrowDownLeft } from 'lucide-react';

interface MonthSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  month: string; // 'YYYY-MM'
}

export function MonthSetupModal({ isOpen, onClose, month }: MonthSetupModalProps) {
  const { userSettings } = useSecurity();
  const currency = userSettings?.currency || 'XOF';

  const [fixedIncomes, setFixedIncomes] = useState<string>('350000');
  const [extraIncomes, setExtraIncomes] = useState<string>('0');
  const [fixedExpenses, setFixedExpenses] = useState<string>('120000');
  const [targetSavings, setTargetSavings] = useState<string>('75000');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Load existing budget if exists
  useEffect(() => {
    async function loadBudget() {
      if (!month) return;
      const existing = await db.monthlyBudgets.where('month').equals(month).first();
      if (existing) {
        setFixedIncomes(String(existing.fixedIncomes));
        setExtraIncomes(String(existing.extraIncomes));
        setFixedExpenses(String(existing.fixedExpenses));
        setTargetSavings(String(existing.targetSavings));
        setNotes(existing.notes || '');
      } else {
        const previous = await db.monthlyBudgets.orderBy('month').reverse().first();
        if (previous) {
          setFixedIncomes(String(previous.fixedIncomes));
          setExtraIncomes('0');
          setFixedExpenses(String(previous.fixedExpenses));
          setTargetSavings(String(previous.targetSavings));
        }
      }
    }
    loadBudget();
  }, [month]);

  if (!isOpen) return null;

  const numFixedInc = parseFloat(fixedIncomes.replace(/\s+/g, '').replace(',', '.')) || 0;
  const numExtraInc = parseFloat(extraIncomes.replace(/\s+/g, '').replace(',', '.')) || 0;
  const numFixedExp = parseFloat(fixedExpenses.replace(/\s+/g, '').replace(',', '.')) || 0;
  const numSavings = parseFloat(targetSavings.replace(/\s+/g, '').replace(',', '.')) || 0;

  const totalIncomes = numFixedInc + numExtraInc;
  const remainingPocketMoney = Math.max(0, totalIncomes - numFixedExp - numSavings);
  const weeklyPocketMoney = remainingPocketMoney / 4.33;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const existing = await db.monthlyBudgets.where('month').equals(month).first();
      const payload: MonthlyBudget = {
        month,
        fixedIncomes: numFixedInc,
        extraIncomes: numExtraInc,
        fixedExpenses: numFixedExp,
        targetSavings: numSavings,
        notes: notes.trim() || undefined,
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (existing?.id) {
        await db.monthlyBudgets.update(existing.id, payload);
      } else {
        await db.monthlyBudgets.add(payload);
      }

      onClose();
    } catch (error) {
      console.error('Failed to save monthly budget:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-5 text-slate-900 dark:text-slate-100 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold tracking-tight">
              Budget du mois — {formatMonthLabel(month)}
            </h2>
            <p className="text-xs text-slate-500">
              Définissez vos revenus, charges fixes et votre épargne prioritaire
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Inputs Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Fixed Incomes */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                <span>Revenus fixes (Salaires)</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  value={fixedIncomes}
                  onChange={(e) => setFixedIncomes(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold outline-hidden focus:border-emerald-500 transition"
                />
                <span className="absolute right-3 top-2.5 text-xs font-medium text-slate-400">{currency}</span>
              </div>
            </div>

            {/* Extra Incomes */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                <span>Revenus extras (Primes, aides)</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  value={extraIncomes}
                  onChange={(e) => setExtraIncomes(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold outline-hidden focus:border-emerald-500 transition"
                />
                <span className="absolute right-3 top-2.5 text-xs font-medium text-slate-400">{currency}</span>
              </div>
            </div>

            {/* Fixed Expenses */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                <ArrowDownLeft className="h-3.5 w-3.5 text-rose-600" />
                <span>Charges fixes (Loyer, factures)</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  value={fixedExpenses}
                  onChange={(e) => setFixedExpenses(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold outline-hidden focus:border-emerald-500 transition"
                />
                <span className="absolute right-3 top-2.5 text-xs font-medium text-slate-400">{currency}</span>
              </div>
            </div>

            {/* Target Savings */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                <PiggyBank className="h-3.5 w-3.5 text-indigo-600" />
                <span>Épargne prioritaire (Objectif)</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  value={targetSavings}
                  onChange={(e) => setTargetSavings(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-semibold outline-hidden focus:border-emerald-500 transition"
                />
                <span className="absolute right-3 top-2.5 text-xs font-medium text-slate-400">{currency}</span>
              </div>
            </div>
          </div>

          {/* Kakeibo Live Calculation Card */}
          <div className="p-4 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-2.5">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
              <Calculator className="h-3.5 w-3.5" />
              <span>Calcul du Reste à Vivre</span>
            </div>

            <div className="flex items-baseline justify-between pt-1 border-b border-emerald-200/60 dark:border-emerald-900/40 pb-2">
              <span className="text-xs text-slate-700 dark:text-slate-300">Budget disponible ce mois :</span>
              <span className="text-xl font-extrabold text-emerald-800 dark:text-emerald-300">
                {formatCurrency(remainingPocketMoney, currency)}
              </span>
            </div>

            <div className="flex items-baseline justify-between text-xs text-slate-600 dark:text-slate-400">
              <span>Budget hebdomadaire indicatif :</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                ~ {formatCurrency(weeklyPocketMoney, currency)} / semaine
              </span>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Objectif ou intention personnelle (optionnel)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Éviter les dépenses impulsives, préparer le fond d'urgence..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs outline-hidden focus:border-emerald-500"
            />
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-xl bg-emerald-600 text-white text-xs font-bold tracking-wide hover:bg-emerald-700 transition disabled:opacity-50 active:scale-98 shadow-sm"
          >
            {isSubmitting ? 'Enregistrement...' : 'Valider mon budget mensuel'}
          </button>
        </form>
      </div>
    </div>
  );
}
