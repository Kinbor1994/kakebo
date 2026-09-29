'use client';

import React, { useState } from 'react';
import {
  type UserSettings,
  type FuelConfig,
  type FuelScenarioMode,
  type Transaction,
} from '@/types/kakebo';
import { db } from '@/lib/db';
import {
  calculateFuelCosts,
  createDefaultFinancialProfile,
  getWeekIndexForDate,
} from '@/lib/financial-engine';
import { getCurrentMonth } from '@/lib/kakebo-engine';
import { formatCurrency } from '@/lib/utils';
import { Fuel, Settings2, Plus, Users, User, Check } from 'lucide-react';
import { format } from 'date-fns';

interface FuelModuleCardProps {
  userSettings: UserSettings | null;
  transactions: Transaction[];
  currency: string;
  onRefreshSettings: () => Promise<void>;
}

export function FuelModuleCard({
  userSettings,
  transactions,
  currency,
  onRefreshSettings,
}: FuelModuleCardProps) {
  const currentMonth = getCurrentMonth();
  const profile =
    userSettings?.financialProfile ?? createDefaultFinancialProfile(currentMonth);
  const fuelConfig: FuelConfig = profile.fuelConfig;

  const [isEditingConfig, setIsEditingConfig] = useState<boolean>(false);
  const [pricePerLiter, setPricePerLiter] = useState<string>(String(fuelConfig.pricePerLiter));
  const [soloLiters, setSoloLiters] = useState<string>(String(fuelConfig.litersPerWeekSolo));
  const [weekALiters, setWeekALiters] = useState<string>(String(fuelConfig.sharedWeekALiters));
  const [weekBLiters, setWeekBLiters] = useState<string>(String(fuelConfig.sharedWeekBLiters));
  const [fillToast, setFillToast] = useState<string>('');

  const handleToggleEditConfig = () => {
    if (!isEditingConfig) {
      setPricePerLiter(String(fuelConfig.pricePerLiter));
      setSoloLiters(String(fuelConfig.litersPerWeekSolo));
      setWeekALiters(String(fuelConfig.sharedWeekALiters));
      setWeekBLiters(String(fuelConfig.sharedWeekBLiters));
    }
    setIsEditingConfig(!isEditingConfig);
  };

  const updateFuelConfig = async (nextFuel: FuelConfig) => {
    if (!userSettings?.id) return;
    await db.userSettings.update(userSettings.id, {
      financialProfile: {
        ...profile,
        fuelConfig: nextFuel,
      },
    });
    await onRefreshSettings();
  };

  const handleToggleMode = async (activeScenario: FuelScenarioMode) => {
    await updateFuelConfig({
      ...fuelConfig,
      enabled: true,
      activeScenario,
    });
  };

  const handleToggleEnabled = async () => {
    await updateFuelConfig({
      ...fuelConfig,
      enabled: !fuelConfig.enabled,
    });
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    const parseVal = (v: string, def: number) => {
      const n = Number(v.replace(/\s+/g, '').replace(',', '.'));
      return Number.isFinite(n) && n >= 0 ? n : def;
    };
    await updateFuelConfig({
      ...fuelConfig,
      enabled: true,
      pricePerLiter: Math.round(parseVal(pricePerLiter, 695)),
      litersPerWeekSolo: parseVal(soloLiters, 5),
      sharedWeekALiters: parseVal(weekALiters, 5),
      sharedWeekBLiters: parseVal(weekBLiters, 2),
    });
    setIsEditingConfig(false);
  };

  const soloStats = calculateFuelCosts({ ...fuelConfig, enabled: true }, 'solo');
  const sharedStats = calculateFuelCosts({ ...fuelConfig, enabled: true }, 'shared');
  const activeStats = calculateFuelCosts(fuelConfig);
  const monthlySavingsInShared = activeStats.monthlySavingsInSharedMode;

  // Current week's fuel expenses from journal
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const currentWeekIdx = getWeekIndexForDate(todayStr);
  const currentWeekFuelSpent = transactions
    .filter((t) => {
      if (t.type !== 'expense') return false;
      const isFuel =
        t.category.toLowerCase().includes('carburant') ||
        t.category.toLowerCase().includes('essence') ||
        (t.description && t.description.toLowerCase().includes('carburant')) ||
        (t.description && t.description.toLowerCase().includes('plein'));
      return isFuel && getWeekIndexForDate(t.date) === currentWeekIdx;
    })
    .reduce((sum, t) => sum + t.amount, 0);

  const handleQuickFill = async (liters: number) => {
    const cost = Math.round(liters * fuelConfig.pricePerLiter);
    if (cost <= 0) return;

    const now = new Date();
    await db.transactions.add({
      month: format(now, 'yyyy-MM'),
      date: format(now, 'yyyy-MM-dd'),
      amount: cost,
      type: 'expense',
      pillar: fuelConfig.defaultPillar || 'needs',
      category: fuelConfig.defaultCategory || 'Transport & Carburant',
      description: `Plein carburant (${liters}L × ${fuelConfig.pricePerLiter} F)`,
      createdAt: now.toISOString(),
    });

    setFillToast(`Plein de ${liters}L (${formatCurrency(cost, currency)}) ajouté au Journal !`);
    setTimeout(() => setFillToast(''), 3000);
  };

  return (
    <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs space-y-3.5">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
            <Fuel className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-slate-900 dark:text-slate-100">
              Module Carburant & Trajets
            </h2>
            <p className="text-[10px] text-slate-500">
              {fuelConfig.pricePerLiter} {currency}/L •{' '}
              {fuelConfig.enabled
                ? fuelConfig.activeScenario === 'solo'
                  ? `Solo (${fuelConfig.litersPerWeekSolo}L/sem)`
                  : `Alterné (${fuelConfig.sharedWeekALiters}L / ${fuelConfig.sharedWeekBLiters}L)`
                : 'Désactivé'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            type="button"
            onClick={handleToggleEditConfig}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition min-h-[38px]"
            title="Configurer le prix au litre et la consommation"
          >
            <Settings2 className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={handleToggleEnabled}
            className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold transition min-h-[38px] ${
              fuelConfig.enabled
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            {fuelConfig.enabled ? 'Actif' : 'Off'}
          </button>
        </div>
      </div>

      {fillToast && (
        <div className="flex items-center space-x-1.5 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
          <Check className="h-3.5 w-3.5 shrink-0" />
          <span>{fillToast}</span>
        </div>
      )}

      {fuelConfig.enabled && (
        <>
          {/* Scenario Selector : Solo vs Shared */}
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 p-1 text-xs">
            <button
              type="button"
              onClick={() => handleToggleMode('solo')}
              className={`flex items-center justify-center space-x-1.5 py-2 px-2 rounded-lg font-bold transition min-h-[44px] ${
                fuelConfig.activeScenario === 'solo'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <User className="h-3.5 w-3.5 text-amber-500" />
              <div className="text-left">
                <span className="block text-[11px] leading-tight">Solo ({fuelConfig.litersPerWeekSolo}L/sem)</span>
                <span className="block text-[10px] text-slate-400">
                  {formatCurrency(soloStats.monthlyCost, currency)}/mois
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleToggleMode('shared')}
              className={`flex items-center justify-center space-x-1.5 py-2 px-2 rounded-lg font-bold transition min-h-[44px] ${
                fuelConfig.activeScenario === 'shared'
                  ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 shadow-2xs'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <Users className="h-3.5 w-3.5 text-emerald-500" />
              <div className="text-left">
                <span className="block text-[11px] leading-tight">
                  Partagé ({fuelConfig.sharedWeekALiters}L/{fuelConfig.sharedWeekBLiters}L)
                </span>
                <span className="block text-[10px] text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(sharedStats.monthlyCost, currency)}/mois
                </span>
              </div>
            </button>
          </div>

          {/* Cost & Weekly Tracking */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
              <span className="text-[10px] text-slate-400 block">Coût mensuel</span>
              <span className="font-extrabold text-slate-900 dark:text-white">
                {formatCurrency(activeStats.monthlyCost, currency)}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
              <span className="text-[10px] text-slate-400 block">Enveloppe / sem.</span>
              <span className="font-extrabold text-amber-600 dark:text-amber-400">
                {formatCurrency(activeStats.weeklyAverageCost, currency)}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50">
              <span className="text-[10px] text-slate-400 block">Sem. {currentWeekIdx} saisie</span>
              <span
                className={`font-extrabold ${
                  currentWeekFuelSpent > activeStats.weeklyAverageCost
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {formatCurrency(currentWeekFuelSpent, currency)}
              </span>
            </div>
          </div>

          {monthlySavingsInShared > 0 && (
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
              💡 Le mode partagé économise <strong>{formatCurrency(monthlySavingsInShared, currency)} / mois</strong> par rapport au mode solo.
            </p>
          )}

          {/* 1-tap Quick Fill-up Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => handleQuickFill(fuelConfig.litersPerWeekSolo)}
              className="flex-1 inline-flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs font-bold transition min-h-[44px]"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>
                + Plein {fuelConfig.litersPerWeekSolo}L ({formatCurrency(Math.round(fuelConfig.litersPerWeekSolo * fuelConfig.pricePerLiter), currency)})
              </span>
            </button>

            {fuelConfig.sharedWeekBLiters > 0 &&
              fuelConfig.sharedWeekBLiters !== fuelConfig.litersPerWeekSolo && (
                <button
                  type="button"
                  onClick={() => handleQuickFill(fuelConfig.sharedWeekBLiters)}
                  className="flex-1 inline-flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-bold transition min-h-[44px]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>
                    + Plein {fuelConfig.sharedWeekBLiters}L ({formatCurrency(Math.round(fuelConfig.sharedWeekBLiters * fuelConfig.pricePerLiter), currency)})
                  </span>
                </button>
              )}
          </div>
        </>
      )}

      {/* Inline Configuration Form */}
      {isEditingConfig && (
        <form
          onSubmit={handleSaveConfig}
          className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3 text-xs"
        >
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="font-semibold text-slate-600 dark:text-slate-300">
                Prix par litre ({currency})
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={pricePerLiter}
                onChange={(e) => setPricePerLiter(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-600 dark:text-slate-300">
                Litres / sem (Solo)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={soloLiters}
                onChange={(e) => setSoloLiters(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-600 dark:text-slate-300">
                Semaine A (avec passager, L)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={weekALiters}
                onChange={(e) => setWeekALiters(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-600 dark:text-slate-300">
                Semaine B (passager, L)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={weekBLiters}
                onChange={(e) => setWeekBLiters(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition min-h-[44px]"
          >
            Enregistrer les paramètres carburant
          </button>
        </form>
      )}
    </section>
  );
}
