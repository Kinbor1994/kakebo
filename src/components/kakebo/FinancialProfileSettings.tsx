'use client';

import React, { useState } from 'react';
import {
  type UserSettings,
  type FinancialProfile,
  type AutoDebitItem,
  type AutoDebitType,
} from '@/types/kakebo';
import { db, loadDemoFinancialProfile } from '@/lib/db';
import {
  createDefaultFinancialProfile,
  createDemoReferenceData,
  calculateAutoDebitsForMonth,
} from '@/lib/financial-engine';
import { getCurrentMonth } from '@/lib/kakebo-engine';
import { formatCurrency } from '@/lib/utils';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Wallet,
  ShieldAlert,
  Lock,
  Sparkles,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  RotateCcw,
  Calendar,
} from 'lucide-react';

interface FinancialProfileSettingsProps {
  userSettings: UserSettings | null;
  currency: string;
  onUpdated: (message: string) => Promise<void>;
}

const DEBIT_TYPE_LABELS: Record<AutoDebitType, { label: string; badgeClass: string; desc: string }> = {
  auto_savings: {
    label: 'Épargne bloquée auto',
    badgeClass:
      'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60',
    desc: 'Comptée dans votre épargne réalisée, non disponible dans la réserve liquide',
  },
  debt_repayment: {
    label: 'Remboursement prêt',
    badgeClass:
      'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800/60',
    desc: 'Mensualité de prêt prélevée à la source',
  },
  charge: {
    label: 'Charge / Assurance',
    badgeClass:
      'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800/60',
    desc: 'Cotisation ou assurance prélevée automatiquement',
  },
};

export function FinancialProfileSettings({
  userSettings,
  currency,
  onUpdated,
}: FinancialProfileSettingsProps) {
  const currentMonth = getCurrentMonth();
  const profile: FinancialProfile =
    userSettings?.financialProfile ?? createDefaultFinancialProfile(currentMonth);

  const debtsAndLoans = useLiveQuery(() => db.debtsAndLoans.toArray(), [], []);

  // Form states for main profile numbers
  const [recurringIncome, setRecurringIncome] = useState<string>(
    String(profile.recurringMonthlyIncome)
  );
  const [paydayDay, setPaydayDay] = useState<string>(String(profile.paydayDay));
  const [fixedCharges, setFixedCharges] = useState<string>(String(profile.monthlyFixedCharges));
  const [extraSavings, setExtraSavings] = useState<string>(String(profile.extraTargetSavings));
  const [liquidReserve, setLiquidReserve] = useState<string>(String(profile.initialLiquidReserve));
  const [safetyThreshold, setSafetyThreshold] = useState<string>(String(profile.safetyThreshold));
  const [lockedSavings, setLockedSavings] = useState<string>(String(profile.initialLockedSavings));
  const [lockedStartMonth, setLockedStartMonth] = useState<string>(
    profile.lockedSavingsStartMonth
  );

  // Auto-debit modal state
  const [isDebitModalOpen, setIsDebitModalOpen] = useState<boolean>(false);
  const [editingDebit, setEditingDebit] = useState<AutoDebitItem | null>(null);
  const [debitTitle, setDebitTitle] = useState<string>('');
  const [debitAmount, setDebitAmount] = useState<string>('');
  const [debitType, setDebitType] = useState<AutoDebitType>('auto_savings');
  const [debitDay, setDebitDay] = useState<string>('25');
  const [debitStartMonth, setDebitStartMonth] = useState<string>('');
  const [debitEndMonth, setDebitEndMonth] = useState<string>('');

  const applyProfileToInputs = (p: FinancialProfile) => {
    setRecurringIncome(String(p.recurringMonthlyIncome));
    setPaydayDay(String(p.paydayDay));
    setFixedCharges(String(p.monthlyFixedCharges));
    setExtraSavings(String(p.extraTargetSavings));
    setLiquidReserve(String(p.initialLiquidReserve));
    setSafetyThreshold(String(p.safetyThreshold));
    setLockedSavings(String(p.initialLockedSavings));
    setLockedStartMonth(p.lockedSavingsStartMonth || currentMonth);
  };

  const parseNum = (val: string, fallback = 0): number => {
    const cleaned = val.replace(/\s+/g, '').replace(',', '.');
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : fallback;
  };

  const saveProfileObject = async (nextProfile: FinancialProfile, msg: string) => {
    if (!userSettings?.id) return;
    await db.userSettings.update(userSettings.id, {
      financialProfile: nextProfile,
    });
    await onUpdated(msg);
  };

  const handleSaveMainProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const day = Math.min(31, Math.max(1, parseNum(paydayDay, 25)));
    const nextProfile: FinancialProfile = {
      ...profile,
      recurringMonthlyIncome: parseNum(recurringIncome, 0),
      paydayDay: day,
      monthlyFixedCharges: parseNum(fixedCharges, 0),
      extraTargetSavings: parseNum(extraSavings, 0),
      initialLiquidReserve: parseNum(liquidReserve, 0),
      safetyThreshold: parseNum(safetyThreshold, 0),
      initialLockedSavings: parseNum(lockedSavings, 0),
      lockedSavingsStartMonth: lockedStartMonth || currentMonth,
    };
    await saveProfileObject(nextProfile, 'Profil financier enregistré avec succès.');
  };

  const handleLoadDemo = async () => {
    await loadDemoFinancialProfile();
    const { profile: demoProfile } = createDemoReferenceData();
    applyProfileToInputs(demoProfile);
    await onUpdated(
      'Données de démonstration chargées (profil, prêt 250 000 F, carburant et prélèvements).'
    );
  };

  const handleResetEmpty = async () => {
    const empty = createDefaultFinancialProfile(currentMonth);
    applyProfileToInputs(empty);
    await saveProfileObject(empty, 'Profil financier réinitialisé à zéro.');
  };

  const handleOpenAddDebit = () => {
    setEditingDebit(null);
    setDebitTitle('');
    setDebitAmount('');
    setDebitType('auto_savings');
    setDebitDay(String(profile.paydayDay || 25));
    setDebitStartMonth('');
    setDebitEndMonth('');
    setIsDebitModalOpen(true);
  };

  const handleOpenEditDebit = (item: AutoDebitItem) => {
    setEditingDebit(item);
    setDebitTitle(item.title);
    setDebitAmount(String(item.amount));
    setDebitType(item.type);
    setDebitDay(String(item.dayOfMonth));
    setDebitStartMonth(item.startMonth || '');
    setDebitEndMonth(item.endMonth || '');
    setIsDebitModalOpen(true);
  };

  const handleSaveDebit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseNum(debitAmount, 0);
    if (!debitTitle.trim() || amount <= 0) return;

    const newItem: AutoDebitItem = {
      id: editingDebit ? editingDebit.id : `debit-${Date.now()}`,
      title: debitTitle.trim(),
      amount,
      type: debitType,
      dayOfMonth: Math.min(31, Math.max(1, parseNum(debitDay, 25))),
      startMonth: debitStartMonth || undefined,
      endMonth: debitEndMonth || undefined,
      isActive: editingDebit ? editingDebit.isActive : true,
      linkedLoanId: editingDebit?.linkedLoanId,
    };

    const nextList = editingDebit
      ? profile.autoDebits.map((d) => (d.id === editingDebit.id ? newItem : d))
      : [...profile.autoDebits, newItem];

    await saveProfileObject(
      {
        ...profile,
        autoDebits: nextList,
      },
      editingDebit ? 'Prélèvement automatique mis à jour.' : 'Prélèvement automatique ajouté.'
    );
    setIsDebitModalOpen(false);
  };

  const handleToggleDebit = async (item: AutoDebitItem) => {
    const nextList = profile.autoDebits.map((d) =>
      d.id === item.id ? { ...d, isActive: !d.isActive } : d
    );
    await saveProfileObject(
      { ...profile, autoDebits: nextList },
      `Prélèvement "${item.title}" ${!item.isActive ? 'activé' : 'mis en pause'}.`
    );
  };

  const handleDeleteDebit = async (id: string) => {
    const nextList = profile.autoDebits.filter((d) => d.id !== id);
    await saveProfileObject(
      { ...profile, autoDebits: nextList },
      'Prélèvement automatique supprimé.'
    );
  };

  // Live preview calculation for current month
  const currentDebitsSummary = calculateAutoDebitsForMonth(profile, debtsAndLoans, currentMonth);
  const netBeforeVariables =
    profile.recurringMonthlyIncome -
    currentDebitsSummary.totalAutoDebits -
    profile.monthlyFixedCharges -
    profile.extraTargetSavings;

  return (
    <section className="rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-white dark:bg-slate-900 p-4 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center space-x-2 text-xs font-bold text-slate-800 dark:text-slate-100">
          <Wallet className="h-4 w-4 text-emerald-600" />
          <span>Profil Financier, Réserves & Prélèvements à la source</span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleLoadDemo}
            className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition min-h-[36px]"
            title="Pré-remplir avec le cas de référence (Salaire 80 000 F, Prêt 250 000 F, NSIA, Carburant)"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Charger démo</span>
          </button>

          <button
            type="button"
            onClick={handleResetEmpty}
            className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[11px] font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition min-h-[36px]"
            title="Remettre le profil financier à zéro"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Réinitialiser</span>
          </button>
        </div>
      </div>

      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
        Configurez vos revenus récurrents, vos réserves (liquide vs épargne bloquée) et vos prélèvements automatiques. Le <strong>reste à vivre réel</strong> est calculé automatiquement sans jamais compter l&apos;épargne automatique deux fois.
      </p>

      {/* Live Summary Banner */}
      <div className="rounded-xl bg-slate-900 dark:bg-slate-950 border border-slate-800 p-3.5 text-white space-y-2">
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span>Aperçu mensuel ({currentMonth})</span>
          <span>Paie le {profile.paydayDay} du mois</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          <div className="p-2 rounded-lg bg-slate-800/70">
            <p className="text-[10px] text-slate-400">Revenu récurrent</p>
            <p className="text-xs font-bold text-emerald-400">
              {formatCurrency(profile.recurringMonthlyIncome, currency)}
            </p>
          </div>
          <div className="p-2 rounded-lg bg-slate-800/70">
            <p className="text-[10px] text-slate-400">Prélèvements auto</p>
            <p className="text-xs font-bold text-amber-400">
              -{formatCurrency(currentDebitsSummary.totalAutoDebits, currency)}
            </p>
          </div>
          <div className="p-2 rounded-lg bg-slate-800/70">
            <p className="text-[10px] text-slate-400">Épargne auto incluse</p>
            <p className="text-xs font-bold text-teal-400">
              {formatCurrency(currentDebitsSummary.autoSavingsTotal, currency)}
            </p>
          </div>
          <div className="p-2 rounded-lg bg-emerald-950/70 border border-emerald-800/50">
            <p className="text-[10px] text-emerald-300">Dispo avant variables</p>
            <p className="text-xs font-extrabold text-white">
              {formatCurrency(netBeforeVariables, currency)}
            </p>
          </div>
        </div>
      </div>

      {/* Main Profile Form */}
      <form onSubmit={handleSaveMainProfile} className="space-y-3.5 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="font-semibold text-slate-700 dark:text-slate-300">
              Revenu mensuel récurrent ({currency})
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={recurringIncome}
              onChange={(e) => setRecurringIncome(e.target.value)}
              placeholder="Ex: 80000"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold outline-hidden focus:border-emerald-500"
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-700 dark:text-slate-300">
              Jour de crédit du salaire (1–31)
            </label>
            <input
              type="number"
              min={1}
              max={31}
              value={paydayDay}
              onChange={(e) => setPaydayDay(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold outline-hidden focus:border-emerald-500"
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-700 dark:text-slate-300">
              Charges fixes hors prélèvements ({currency})
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={fixedCharges}
              onChange={(e) => setFixedCharges(e.target.value)}
              placeholder="Ex: 20000"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold outline-hidden focus:border-emerald-500"
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-700 dark:text-slate-300">
              Épargne cible supplémentaire ({currency})
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={extraSavings}
              onChange={(e) => setExtraSavings(e.target.value)}
              placeholder="0 par défaut"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold outline-hidden focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Reserves & Thresholds */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-1">
              <span>Réserve liquide disponible ({currency})</span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={liquidReserve}
              onChange={(e) => setLiquidReserve(e.target.value)}
              placeholder="Ex: 80000"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold outline-hidden focus:border-emerald-500"
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-1">
              <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
              <span>Seuil de sécurité liquide ({currency})</span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={safetyThreshold}
              onChange={(e) => setSafetyThreshold(e.target.value)}
              placeholder="Ex: 40000"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold outline-hidden focus:border-emerald-500"
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-1">
              <Lock className="h-3.5 w-3.5 text-teal-600" />
              <span>Épargne bloquée initiale ({currency})</span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={lockedSavings}
              onChange={(e) => setLockedSavings(e.target.value)}
              placeholder="Ex: 0"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold outline-hidden focus:border-emerald-500"
            />
          </div>

          <div className="space-y-1">
            <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center space-x-1">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <span>Mois de début épargne bloquée (YYYY-MM)</span>
            </label>
            <input
              type="month"
              value={lockedStartMonth}
              onChange={(e) => setLockedStartMonth(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold outline-hidden focus:border-emerald-500"
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs flex items-center justify-center space-x-1.5 min-h-[44px]"
        >
          <Check className="h-4 w-4" />
          <span>Enregistrer le profil financier</span>
        </button>
      </form>

      {/* Automatic Debits List */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Prélèvements automatiques à la source
            </h3>
            <p className="text-[11px] text-slate-500">
              Épargne bloquée (ex: NSIA), assurances et frais prélevés directement sur salaire
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenAddDebit}
            className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition min-h-[38px]"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Ajouter</span>
          </button>
        </div>

        {profile.autoDebits.length === 0 ? (
          <p className="text-xs text-slate-400 py-2">
            Aucun prélèvement automatique configuré.
          </p>
        ) : (
          <div className="space-y-2">
            {profile.autoDebits.map((item) => {
              const meta = DEBIT_TYPE_LABELS[item.type];
              return (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {item.title}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${meta.badgeClass}`}
                      >
                        {meta.label}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Jour {item.dayOfMonth} du mois
                      {item.endMonth ? ` • Jusqu'à ${item.endMonth}` : ' • Permanent'}
                    </p>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <span className="font-extrabold text-slate-900 dark:text-white mr-1">
                      {formatCurrency(item.amount, currency)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggleDebit(item)}
                      className={`text-[10px] px-2 py-1 rounded-lg font-bold ${
                        item.isActive
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                      }`}
                    >
                      {item.isActive ? 'Actif' : 'Pause'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEditDebit(item)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                      title="Modifier"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteDebit(item.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600"
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
      </div>

      {/* Add/Edit AutoDebit Modal */}
      {isDebitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4 text-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold">
                {editingDebit ? 'Modifier le prélèvement' : 'Nouveau prélèvement à la source'}
              </h3>
              <button
                type="button"
                onClick={() => setIsDebitModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDebit} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Libellé du prélèvement
                </label>
                <input
                  type="text"
                  value={debitTitle}
                  onChange={(e) => setDebitTitle(e.target.value)}
                  placeholder="Ex: Assurance Épargne (NSIA), Assurance Décès..."
                  required
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-hidden font-medium focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Montant ({currency})
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={debitAmount}
                    onChange={(e) => setDebitAmount(e.target.value)}
                    placeholder="10000"
                    required
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-hidden font-medium focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Jour du prélèvement
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={debitDay}
                    onChange={(e) => setDebitDay(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-hidden font-medium focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Catégorie comptable du prélèvement
                </label>
                <select
                  value={debitType}
                  onChange={(e) => setDebitType(e.target.value as AutoDebitType)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-hidden font-medium focus:border-emerald-500"
                >
                  <option value="auto_savings">Épargne automatique bloquée (ex: NSIA Épargne)</option>
                  <option value="debt_repayment">Remboursement de prêt / dette</option>
                  <option value="charge">Charge / Assurance prélevée (ex: NSIA Décès)</option>
                </select>
                <p className="text-[11px] text-slate-500 pt-0.5">
                  {DEBIT_TYPE_LABELS[debitType].desc}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Mois de début (optionnel)
                  </label>
                  <input
                    type="month"
                    value={debitStartMonth}
                    onChange={(e) => setDebitStartMonth(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-hidden font-medium focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Mois de fin (optionnel)
                  </label>
                  <input
                    type="month"
                    value={debitEndMonth}
                    onChange={(e) => setDebitEndMonth(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-hidden font-medium focus:border-emerald-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition mt-2 shadow-sm min-h-[44px]"
              >
                {editingDebit ? 'Enregistrer les modifications' : 'Ajouter le prélèvement'}
              </button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
