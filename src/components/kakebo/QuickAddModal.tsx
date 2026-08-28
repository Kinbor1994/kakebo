'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/db';
import {
  type KakeiboPillar,
  type TransactionType,
  PILLARS_CONFIG,
  DEFAULT_INCOME_CATEGORIES,
} from '@/types/kakebo';
import { useSecurity } from '../security/SecurityContext';
import {
  X,
  ShoppingBag,
  Sparkles,
  BookOpen,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  Check,
  Plus,
} from 'lucide-react';
import { format } from 'date-fns';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMonth?: string;
}

const PILLAR_ICONS = {
  needs: ShoppingBag,
  wants: Sparkles,
  culture: BookOpen,
  unexpected: AlertTriangle,
};

export function QuickAddModal({ isOpen, onClose }: QuickAddModalProps) {
  const { userSettings, refreshSettings } = useSecurity();
  const currency = userSettings?.currency || 'XOF';

  const [type, setType] = useState<TransactionType>('expense');
  const [pillar, setPillar] = useState<KakeiboPillar>('needs');
  const [category, setCategory] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [description, setDescription] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Quick category creation inline
  const [isAddingNewCat, setIsAddingNewCat] = useState<boolean>(false);
  const [newCatName, setNewCatName] = useState<string>('');

  const currentPillarConfig = PILLARS_CONFIG[pillar];

  const categoriesList =
    type === 'expense'
      ? userSettings?.customCategories?.[pillar] || currentPillarConfig.defaultCategories
      : userSettings?.customIncomeCategories || DEFAULT_INCOME_CATEGORIES;

  // Set initial category when pillar or type changes
  useEffect(() => {
    if (categoriesList.length > 0) {
      setCategory(categoriesList[0]);
    }
    setIsAddingNewCat(false);
    setNewCatName('');
  }, [pillar, type, categoriesList]);

  if (!isOpen) return null;

  const handleCreateCustomCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCatName.trim();
    if (!trimmed || !userSettings?.id) return;

    if (type === 'expense') {
      const existing = userSettings.customCategories?.[pillar] || [...currentPillarConfig.defaultCategories];
      if (!existing.includes(trimmed)) {
        const updated = {
          ...userSettings.customCategories,
          [pillar]: [...existing, trimmed],
        };
        await db.userSettings.update(userSettings.id, { customCategories: updated });
        await refreshSettings();
      }
    } else {
      const existing = userSettings.customIncomeCategories || [...DEFAULT_INCOME_CATEGORIES];
      if (!existing.includes(trimmed)) {
        const updated = [...existing, trimmed];
        await db.userSettings.update(userSettings.id, { customIncomeCategories: updated });
        await refreshSettings();
      }
    }

    setCategory(trimmed);
    setNewCatName('');
    setIsAddingNewCat(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAmountStr = amount.replace(/\s+/g, '').replace(',', '.');
    const parsedAmount = parseFloat(cleanAmountStr);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;

    setIsSubmitting(true);
    try {
      const transactionMonth = date.substring(0, 7); // 'YYYY-MM'

      await db.transactions.add({
        month: transactionMonth,
        date,
        amount: parsedAmount,
        type,
        pillar: type === 'expense' ? pillar : undefined,
        category: category || (type === 'expense' ? currentPillarConfig.name : 'Revenu'),
        description: description.trim() || undefined,
        createdAt: new Date().toISOString(),
      });

      setAmount('');
      setDescription('');
      onClose();
    } catch (error) {
      console.error('Failed to add transaction:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-5 text-slate-900 dark:text-slate-100 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-base font-bold tracking-tight">Ajouter une transaction</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type Selector */}
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 dark:bg-slate-800 p-1">
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`flex items-center justify-center space-x-2 py-2 rounded-xl text-xs font-bold transition ${
                type === 'expense'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <ArrowDownLeft className="h-3.5 w-3.5 text-rose-500" />
              <span>Dépense Kakeibo</span>
            </button>

            <button
              type="button"
              onClick={() => setType('income')}
              className={`flex items-center justify-center space-x-2 py-2 rounded-xl text-xs font-bold transition ${
                type === 'income'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
              <span>Revenu / Entrée</span>
            </button>
          </div>

          {/* Amount input */}
          <div className="space-y-1 text-center py-2">
            <label className="text-xs font-semibold text-slate-500">Montant ({currency})</label>
            <div className="relative flex items-center justify-center">
              <input
                type="text"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                required
                autoFocus
                className="w-full text-center text-3xl sm:text-4xl font-extrabold bg-transparent outline-hidden tracking-tight text-slate-900 dark:text-slate-100 placeholder-slate-300"
              />
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 ml-1.5">
                {currency}
              </span>
            </div>
          </div>

          {/* 4 Pillars Selection (Expenses only) */}
          {type === 'expense' && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Choisir le pilier Kakeibo
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['needs', 'wants', 'culture', 'unexpected'] as KakeiboPillar[]).map((pKey) => {
                  const pConfig = PILLARS_CONFIG[pKey];
                  const Icon = PILLAR_ICONS[pKey];
                  const isSelected = pillar === pKey;

                  return (
                    <button
                      key={pKey}
                      type="button"
                      onClick={() => setPillar(pKey)}
                      className={`flex flex-col items-start p-3 rounded-2xl border text-left transition ${
                        isSelected
                          ? `${pConfig.borderClass} ${pConfig.bgClass} shadow-xs ring-2 ring-emerald-600/20`
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center space-x-2 w-full justify-between">
                        <div className="flex items-center space-x-1.5">
                          <Icon className={`h-4 w-4 ${pConfig.textClass}`} />
                          <span className="text-xs font-bold">{pConfig.name}</span>
                        </div>
                        {isSelected && <Check className={`h-3.5 w-3.5 ${pConfig.textClass}`} />}
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                        {pConfig.subtitle}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Category Selection & Custom Creation */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Catégorie</label>
              <button
                type="button"
                onClick={() => setIsAddingNewCat(!isAddingNewCat)}
                className="text-[11px] font-bold text-emerald-600 hover:underline flex items-center space-x-1"
              >
                <Plus className="h-3 w-3" />
                <span>{isAddingNewCat ? 'Fermer' : 'Ajouter une catégorie'}</span>
              </button>
            </div>

            {/* Inline new category form */}
            {isAddingNewCat && (
              <div className="flex items-center space-x-2 p-2 rounded-xl bg-emerald-50/70 border border-emerald-200">
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Nom de la nouvelle catégorie..."
                  className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs outline-hidden focus:border-emerald-500 font-medium"
                />
                <button
                  type="button"
                  onClick={handleCreateCustomCategory}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700"
                >
                  Ajouter
                </button>
              </div>
            )}

            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
              {categoriesList.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                    category === cat
                      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Date & Note */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-1">
                <Calendar className="h-3.5 w-3.5" />
                <span>Date</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs outline-hidden focus:border-emerald-500 font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Note / Détail (optionnel)</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Courses du marché, Pharmacie..."
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs outline-hidden focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting || !amount}
            className="w-full py-3 rounded-xl bg-emerald-600 text-white text-xs font-bold tracking-wide hover:bg-emerald-700 transition disabled:opacity-50 active:scale-98 shadow-sm"
          >
            {isSubmitting ? 'Enregistrement...' : 'Valider la transaction'}
          </button>
        </form>
      </div>
    </div>
  );
}
