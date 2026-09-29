'use client';

import React, { useState } from 'react';
import { db } from '@/lib/db';
import {
  type KakeiboPillar,
  type TransactionType,
  PILLARS_CONFIG,
  DEFAULT_INCOME_CATEGORIES,
} from '@/types/kakebo';
import { useSecurity } from '../security/SecurityContext';
import { formatCurrency } from '@/lib/utils';
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
  ChevronDown,
  ChevronUp,
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

const QUICK_AMOUNTS = [500, 1000, 2000, 3500, 5000, 10000];

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
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  // Quick category creation inline
  const [isAddingNewCat, setIsAddingNewCat] = useState<boolean>(false);
  const [newCatName, setNewCatName] = useState<string>('');

  const currentPillarConfig = PILLARS_CONFIG[pillar];

  const categoriesList =
    type === 'expense'
      ? userSettings?.customCategories?.[pillar] || currentPillarConfig.defaultCategories
      : userSettings?.customIncomeCategories || DEFAULT_INCOME_CATEGORIES;

  const effectiveCategory =
    category && categoriesList.includes(category) ? category : categoriesList[0] || '';

  if (!isOpen) return null;

  const handleCreateCustomCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCatName.trim();
    if (!trimmed || !userSettings?.id) return;

    if (type === 'expense') {
      const existing =
        userSettings.customCategories?.[pillar] || [...currentPillarConfig.defaultCategories];
      if (!existing.includes(trimmed)) {
        const updated = {
          needs: userSettings.customCategories?.needs || [...PILLARS_CONFIG.needs.defaultCategories],
          wants: userSettings.customCategories?.wants || [...PILLARS_CONFIG.wants.defaultCategories],
          culture:
            userSettings.customCategories?.culture || [...PILLARS_CONFIG.culture.defaultCategories],
          unexpected:
            userSettings.customCategories?.unexpected || [
              ...PILLARS_CONFIG.unexpected.defaultCategories,
            ],
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
    const parsedAmount = Math.round(parseFloat(cleanAmountStr));
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
        category: effectiveCategory || (type === 'expense' ? currentPillarConfig.name : 'Revenu'),
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-2xl space-y-4 text-slate-900 dark:text-slate-100 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold tracking-tight">Saisie rapide (&lt; 3 taps)</h2>
            <p className="text-[11px] text-slate-500">1. Montant • 2. Pilier • 3. Valider</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition min-h-[44px] min-w-[44px] flex items-center justify-center"
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
              className={`flex items-center justify-center space-x-2 py-2.5 rounded-xl text-xs font-bold transition min-h-[44px] ${
                type === 'expense'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <ArrowDownLeft className="h-3.5 w-3.5 text-rose-500" />
              <span>Dépense</span>
            </button>

            <button
              type="button"
              onClick={() => setType('income')}
              className={`flex items-center justify-center space-x-2 py-2.5 rounded-xl text-xs font-bold transition min-h-[44px] ${
                type === 'income'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
              <span>Revenu</span>
            </button>
          </div>

          {/* Step 1: Amount input + 1-tap quick chips */}
          <div className="space-y-2 text-center py-1">
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
                className="w-full text-center text-3xl sm:text-4xl font-extrabold bg-transparent outline-hidden tracking-tight text-slate-900 dark:text-slate-100 placeholder-slate-300 py-1"
              />
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 ml-1.5">
                {currency}
              </span>
            </div>

            {/* Quick Amount Chips */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 pt-1">
              {QUICK_AMOUNTS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmount(String(preset))}
                  className={`py-2 px-2 rounded-xl text-xs font-bold border transition min-h-[44px] ${
                    amount === String(preset)
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                      : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {formatCurrency(preset, '').trim()}
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: 4 Pillars Selection (Expenses only) */}
          {type === 'expense' && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Pilier Kakeibo
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
                      className={`flex flex-col items-start p-3 rounded-2xl border text-left transition min-h-[52px] ${
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
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {pConfig.subtitle}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Optional Note Input (Always accessible in 1 tap if needed) */}
          <div className="space-y-1">
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Note optionnelle (ex: Courses, Pharmacie, Moto...)"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs outline-hidden focus:border-emerald-500 min-h-[44px]"
            />
          </div>

          {/* Toggle for Category & Date customization */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition"
          >
            <span>
              Catégorie : <strong className="text-slate-700 dark:text-slate-200">{effectiveCategory}</strong> • Date :{' '}
              <strong className="text-slate-700 dark:text-slate-200">{date}</strong>
            </span>
            {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {showAdvanced && (
            <div className="space-y-3 pt-1 border-t border-slate-100 dark:border-slate-800">
              {/* Category Selection & Custom Creation */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Catégorie
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsAddingNewCat(!isAddingNewCat)}
                    className="text-[11px] font-bold text-emerald-600 hover:underline flex items-center space-x-1"
                  >
                    <Plus className="h-3 w-3" />
                    <span>{isAddingNewCat ? 'Fermer' : 'Nouvelle catégorie'}</span>
                  </button>
                </div>

                {isAddingNewCat && (
                  <div className="flex items-center space-x-2 p-2 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                    <input
                      type="text"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      placeholder="Nom de la catégorie..."
                      className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs outline-hidden focus:border-emerald-500 font-medium"
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
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
                        effectiveCategory === cat
                          ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-1">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Date de l&apos;opération</span>
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs outline-hidden focus:border-emerald-500 font-medium"
                />
              </div>
            </div>
          )}

          {/* Step 3: Submit */}
          <button
            type="submit"
            disabled={isSubmitting || !amount}
            className="w-full py-3.5 rounded-xl bg-emerald-600 text-white text-xs sm:text-sm font-bold tracking-wide hover:bg-emerald-700 transition disabled:opacity-50 active:scale-98 shadow-sm min-h-[48px]"
          >
            {isSubmitting ? 'Enregistrement...' : 'Valider la dépense'}
          </button>
        </form>
      </div>
    </div>
  );
}
