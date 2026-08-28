'use client';

import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { getCurrentMonth } from '@/lib/kakebo-engine';
import {
  type RecurringItem,
  type KakeiboPillar,
  PILLARS_CONFIG,
  DEFAULT_INCOME_CATEGORIES,
} from '@/types/kakebo';
import { AppHeader } from '@/components/layout/AppHeader';
import { BottomNav } from '@/components/layout/BottomNav';
import { QuickAddModal } from '@/components/kakebo/QuickAddModal';
import { MonthSetupModal } from '@/components/kakebo/MonthSetupModal';
import { useSecurity } from '@/components/security/SecurityContext';
import { PinLockScreen } from '@/components/security/PinLockScreen';
import { PinSetupModal } from '@/components/security/PinSetupModal';
import { downloadBackupFile, restoreBackupJSON, downloadTransactionsCSV } from '@/lib/export-import';
import { formatCurrency } from '@/lib/utils';
import {
  Lock,
  Coins,
  Repeat,
  Download,
  Upload,
  FileSpreadsheet,
  Trash2,
  Plus,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  Tags,
  RotateCcw,
  X,
} from 'lucide-react';

const CURRENCIES = [
  { code: 'XOF', label: 'Franc CFA Ouest (F CFA)' },
  { code: 'XAF', label: 'Franc CFA Centre (FCFA)' },
  { code: 'EUR', label: 'Euro (€)' },
  { code: 'USD', label: 'Dollar US ($)' },
  { code: 'CAD', label: 'Dollar Canadien (CA$)' },
  { code: 'CHF', label: 'Franc Suisse (CHF)' },
  { code: 'MAD', label: 'Dirham Marocain (DH)' },
  { code: 'GBP', label: 'Livre Sterling (£)' },
  { code: 'JPY', label: 'Yen Japonais (¥)' },
];

export default function ParametresPage() {
  const {
    isLocked,
    userSettings,
    refreshSettings,
    isBiometricAvailableOnDevice,
    enableBiometrics,
    disableBiometrics,
  } = useSecurity();
  const currency = userSettings?.currency || 'XOF';

  const [currentMonth, setCurrentMonth] = useState<string>(getCurrentMonth());
  const [isQuickAddOpen, setIsQuickAddOpen] = useState<boolean>(false);
  const [isMonthSetupOpen, setIsMonthSetupOpen] = useState<boolean>(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState<boolean>(false);

  // Category Manager tab state
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<KakeiboPillar | 'income'>('needs');
  const [newCategoryInput, setNewCategoryInput] = useState<string>('');

  // Recurring item form
  const [isAddRecurringOpen, setIsAddRecurringOpen] = useState<boolean>(false);
  const [recTitle, setRecTitle] = useState<string>('');
  const [recAmount, setRecAmount] = useState<string>('');
  const [recType, setRecType] = useState<'expense' | 'income'>('expense');
  const [recPillar, setRecPillar] = useState<KakeiboPillar>('needs');
  const [recCategory, setRecCategory] = useState<string>('Loyer & Logement');
  const [recDay, setRecDay] = useState<number>(1);

  // Status banners
  const [backupStatus, setBackupStatus] = useState<string>('');
  const [errorStatus, setErrorStatus] = useState<string>('');
  const [showWipeConfirm, setShowWipeConfirm] = useState<boolean>(false);

  const recurringItems = useLiveQuery(() => db.recurringItems.toArray()) || [];

  const handleCurrencyChange = async (newCurr: string) => {
    if (!userSettings?.id) return;
    await db.userSettings.update(userSettings.id, { currency: newCurr });
    await refreshSettings();
  };

  // Category management handlers
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCategoryInput.trim();
    if (!trimmed || !userSettings?.id) return;

    if (selectedCategoryTab === 'income') {
      const currentList = userSettings.customIncomeCategories || [...DEFAULT_INCOME_CATEGORIES];
      if (!currentList.includes(trimmed)) {
        const updated = [...currentList, trimmed];
        await db.userSettings.update(userSettings.id, { customIncomeCategories: updated });
        await refreshSettings();
      }
    } else {
      const currentMap = userSettings.customCategories || {
        needs: [...PILLARS_CONFIG.needs.defaultCategories],
        wants: [...PILLARS_CONFIG.wants.defaultCategories],
        culture: [...PILLARS_CONFIG.culture.defaultCategories],
        unexpected: [...PILLARS_CONFIG.unexpected.defaultCategories],
      };
      const pillarList = currentMap[selectedCategoryTab] || [];
      if (!pillarList.includes(trimmed)) {
        const updated = {
          ...currentMap,
          [selectedCategoryTab]: [...pillarList, trimmed],
        };
        await db.userSettings.update(userSettings.id, { customCategories: updated });
        await refreshSettings();
      }
    }

    setNewCategoryInput('');
    setBackupStatus('Catégorie ajoutée avec succès.');
    setTimeout(() => setBackupStatus(''), 2500);
  };

  const handleDeleteCategory = async (categoryToDelete: string) => {
    if (!userSettings?.id) return;

    if (selectedCategoryTab === 'income') {
      const currentList = userSettings.customIncomeCategories || [...DEFAULT_INCOME_CATEGORIES];
      if (currentList.length <= 1) return; // keep at least 1
      const updated = currentList.filter((c) => c !== categoryToDelete);
      await db.userSettings.update(userSettings.id, { customIncomeCategories: updated });
    } else {
      const currentMap = userSettings.customCategories || {
        needs: [...PILLARS_CONFIG.needs.defaultCategories],
        wants: [...PILLARS_CONFIG.wants.defaultCategories],
        culture: [...PILLARS_CONFIG.culture.defaultCategories],
        unexpected: [...PILLARS_CONFIG.unexpected.defaultCategories],
      };
      const pillarList = currentMap[selectedCategoryTab] || [];
      if (pillarList.length <= 1) return; // keep at least 1
      const updated = {
        ...currentMap,
        [selectedCategoryTab]: pillarList.filter((c) => c !== categoryToDelete),
      };
      await db.userSettings.update(userSettings.id, { customCategories: updated });
    }

    await refreshSettings();
  };

  const handleResetCategories = async () => {
    if (!userSettings?.id) return;
    const defaultCats = {
      needs: [...PILLARS_CONFIG.needs.defaultCategories],
      wants: [...PILLARS_CONFIG.wants.defaultCategories],
      culture: [...PILLARS_CONFIG.culture.defaultCategories],
      unexpected: [...PILLARS_CONFIG.unexpected.defaultCategories],
    };
    await db.userSettings.update(userSettings.id, {
      customCategories: defaultCats,
      customIncomeCategories: [...DEFAULT_INCOME_CATEGORIES],
    });
    await refreshSettings();
    setBackupStatus('Catégories réinitialisées aux valeurs par défaut.');
    setTimeout(() => setBackupStatus(''), 3000);
  };

  const handleCreateRecurring = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmt = parseFloat(recAmount.replace(/\s+/g, '').replace(',', '.')) || 0;
    if (!recTitle.trim() || numAmt <= 0) return;

    await db.recurringItems.add({
      title: recTitle.trim(),
      amount: numAmt,
      type: recType,
      pillar: recType === 'expense' ? recPillar : undefined,
      category: recCategory,
      dayOfMonth: recDay,
      isActive: true,
      createdAt: new Date().toISOString(),
    });

    setRecTitle('');
    setRecAmount('');
    setIsAddRecurringOpen(false);
  };

  const handleToggleRecurring = async (item: RecurringItem) => {
    if (!item.id) return;
    await db.recurringItems.update(item.id, { isActive: !item.isActive });
  };

  const handleDeleteRecurring = async (id?: number) => {
    if (!id) return;
    await db.recurringItems.delete(id);
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorStatus('');
    setBackupStatus('');

    try {
      const text = await file.text();
      await restoreBackupJSON(text);
      await refreshSettings();
      setBackupStatus('Sauvegarde restaurée avec succès !');
      setTimeout(() => setBackupStatus(''), 4000);
    } catch {
      setErrorStatus('Fichier de sauvegarde invalide ou corrompu.');
    }
  };

  const handleWipeDatabase = async () => {
    await db.delete();
    window.location.reload();
  };

  if (isLocked) {
    return <PinLockScreen />;
  }

  // Active category list to display
  const activeCategoriesList =
    selectedCategoryTab === 'income'
      ? userSettings?.customIncomeCategories || DEFAULT_INCOME_CATEGORIES
      : userSettings?.customCategories?.[selectedCategoryTab] || PILLARS_CONFIG[selectedCategoryTab].defaultCategories;

  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-28">
      <AppHeader
        currentMonth={currentMonth}
        onMonthChange={setCurrentMonth}
        onOpenMonthSetup={() => setIsMonthSetupOpen(true)}
      />

      <main className="mx-auto max-w-xl px-4 pt-5 space-y-6">
        {/* Title */}
        <div>
          <h1 className="text-lg font-bold tracking-tight">Paramètres & Personnalisation</h1>
          <p className="text-xs text-slate-500">Gérez votre devise, vos catégories personnalisées et vos sauvegardes</p>
        </div>

        {/* Notifications */}
        {backupStatus && (
          <div className="flex items-center space-x-2 p-3 rounded-xl bg-emerald-50 text-emerald-700 text-xs border border-emerald-200">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{backupStatus}</span>
          </div>
        )}

        {errorStatus && (
          <div className="flex items-center space-x-2 p-3 rounded-xl bg-rose-50 text-rose-700 text-xs border border-rose-200">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{errorStatus}</span>
          </div>
        )}

        {/* Section 1 : Gestion des Catégories Personnalisées */}
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-800 dark:text-slate-200">
              <Tags className="h-4 w-4 text-emerald-600" />
              <span>Personnalisation des Catégories</span>
            </div>

            <button
              type="button"
              onClick={handleResetCategories}
              className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center space-x-1"
              title="Restaurer les catégories recommandées"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Rétablir par défaut</span>
            </button>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            Adaptez les catégories de dépenses et de revenus selon vos habitudes quotidiennes.
          </p>

          {/* Pillar / Income selector tabs */}
          <div className="flex space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
            {(['needs', 'wants', 'culture', 'unexpected'] as KakeiboPillar[]).map((pKey) => {
              const pConfig = PILLARS_CONFIG[pKey];
              const isSelected = selectedCategoryTab === pKey;
              return (
                <button
                  key={pKey}
                  type="button"
                  onClick={() => setSelectedCategoryTab(pKey)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                    isSelected
                      ? `${pConfig.badgeClass} border shadow-2xs`
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                  }`}
                >
                  {pConfig.name}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setSelectedCategoryTab('income')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                selectedCategoryTab === 'income'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              Revenus
            </button>
          </div>

          {/* Add Category Form */}
          <form onSubmit={handleAddCategory} className="flex items-center space-x-2 pt-1">
            <input
              type="text"
              value={newCategoryInput}
              onChange={(e) => setNewCategoryInput(e.target.value)}
              placeholder="Nouvelle catégorie (ex: Frais scolarité, Tontine...)"
              className="flex-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium outline-hidden focus:border-emerald-500"
            />
            <button
              type="submit"
              disabled={!newCategoryInput.trim()}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition disabled:opacity-50 flex items-center space-x-1"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Ajouter</span>
            </button>
          </form>

          {/* Categories Chip List */}
          <div className="flex flex-wrap gap-2 pt-2">
            {activeCategoriesList.map((cat) => (
              <span
                key={cat}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-200/90 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs font-semibold text-slate-800 dark:text-slate-200 shadow-2xs group"
              >
                <span>{cat}</span>
                {activeCategoriesList.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleDeleteCategory(cat)}
                    className="p-0.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 transition"
                    title="Supprimer cette catégorie"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </span>
            ))}
          </div>
        </section>

        {/* Section 2 : Devise & Monnaie */}
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs space-y-3">
          <div className="flex items-center space-x-2 pb-2 border-b border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200">
            <Coins className="h-4 w-4 text-emerald-600" />
            <span>Devise de l&apos;application</span>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-500">Monnaie principale des comptes</label>
            <select
              value={currency}
              onChange={(e) => handleCurrencyChange(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold outline-hidden focus:border-emerald-500"
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </section>

        {/* Section 3 : Sécurité & Verrouillage PIN / Biométrie */}
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-800 dark:text-slate-200">
              <Lock className="h-4 w-4 text-slate-800 dark:text-slate-200" />
              <span>Verrouillage local (Code PIN & Biométrie)</span>
            </div>

            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                userSettings?.isPinEnabled
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              {userSettings?.isPinEnabled ? 'Actif' : 'Désactivé'}
            </span>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            Sécurisez l&apos;accès physique à vos finances via l&apos;API Web Crypto. Le verrouillage s&apos;active automatiquement après inactivité ou mise en arrière-plan.
          </p>

          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={() => setIsPinModalOpen(true)}
              className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 hover:bg-slate-200 transition"
            >
              {userSettings?.isPinEnabled ? 'Modifier ou désactiver le code PIN' : 'Configurer un code PIN'}
            </button>

            {userSettings?.isPinEnabled && isBiometricAvailableOnDevice && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 text-xs">
                <div className="space-y-0.5">
                  <p className="font-bold text-emerald-900 dark:text-emerald-200">Déverrouillage par Empreinte / Face ID</p>
                  <p className="text-[10px] text-emerald-700/80 dark:text-emerald-400">Authentification biométrique locale WebAuthn</p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    if (userSettings.isBiometricEnabled) {
                      await disableBiometrics();
                    } else {
                      await enableBiometrics();
                    }
                  }}
                  className={`px-3 py-1.5 rounded-xl font-bold transition ${
                    userSettings.isBiometricEnabled
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200'
                  }`}
                >
                  {userSettings.isBiometricEnabled ? 'Activé' : 'Activer'}
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Section 4 : Dépenses & Revenus Récurrents */}
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-800 dark:text-slate-200">
              <Repeat className="h-4 w-4 text-indigo-600" />
              <span>Opérations récurrentes automatiques</span>
            </div>

            <button
              type="button"
              onClick={() => setIsAddRecurringOpen(true)}
              className="flex items-center space-x-1 text-xs font-bold text-emerald-600 hover:underline"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Ajouter</span>
            </button>
          </div>

          {recurringItems.length === 0 ? (
            <p className="text-xs text-slate-400 py-1">
              Aucune récurrence configurée (loyer, abonnements, salaires mensuels).
            </p>
          ) : (
            <div className="space-y-2">
              {recurringItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs"
                >
                  <div>
                    <p className="font-bold text-slate-800 dark:text-slate-200">{item.title}</p>
                    <p className="text-[10px] text-slate-400">
                      Chaque {item.dayOfMonth} du mois • {item.category}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="font-bold">
                      {formatCurrency(item.amount, currency)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggleRecurring(item)}
                      className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                        item.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      {item.isActive ? 'Actif' : 'Pause'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteRecurring(item.id)}
                      className="p-1 text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Section 5 : Sauvegarde & Restauration */}
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs space-y-3">
          <div className="flex items-center space-x-2 pb-2 border-b border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200">
            <Download className="h-4 w-4 text-emerald-600" />
            <span>Sauvegarde & Export des données</span>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            Vos données sont stockées 100% sur votre appareil. Téléchargez une sauvegarde JSON pour vos archives ou pour transférer vos comptes.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
            <button
              type="button"
              onClick={downloadBackupFile}
              className="flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Sauvegarde JSON</span>
            </button>

            <label className="flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition cursor-pointer">
              <Upload className="h-3.5 w-3.5" />
              <span>Restaurer JSON</span>
              <input
                type="file"
                accept=".json"
                onChange={handleFileImport}
                className="hidden"
              />
            </label>

            <button
              type="button"
              onClick={downloadTransactionsCSV}
              className="flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </section>

        {/* Section 6 : Réinitialisation */}
        <section className="rounded-2xl border border-rose-200 dark:border-rose-950/40 bg-rose-50/40 dark:bg-rose-950/10 p-4 space-y-3">
          <div className="flex items-center space-x-2 text-xs font-bold text-rose-700 dark:text-rose-400">
            <Trash2 className="h-4 w-4" />
            <span>Effacement complet des données</span>
          </div>
          <p className="text-xs text-slate-500">
            Supprime définitivement la base de données locale stockée sur ce navigateur.
          </p>
          <button
            type="button"
            onClick={() => setShowWipeConfirm(true)}
            className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition"
          >
            Effacer toutes mes données
          </button>
        </section>

        {/* Philosophy Footer */}
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900/40 p-4 space-y-1.5 text-xs text-slate-500">
          <div className="flex items-center space-x-1.5 font-bold text-slate-800 dark:text-slate-200">
            <BookOpen className="h-3.5 w-3.5 text-emerald-600" />
            <span>La méthode Kakeibo</span>
          </div>
          <p className="leading-relaxed text-[11px]">
            Le Kakeibo transforme la gestion budgétaire en un rituel conscient d&apos;épargne préalable, de répartition en 4 piliers et d&apos;introspection hebdomadaire.
          </p>
        </section>
      </main>

      {/* Pin Setup Modal */}
      <PinSetupModal
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
      />

      {/* Add Recurring Item Modal */}
      {isAddRecurringOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4 text-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-base font-bold">Ajouter une opération récurrente</h2>
              <button
                type="button"
                onClick={() => setIsAddRecurringOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRecurring} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Nom de l&apos;opération</label>
                <input
                  type="text"
                  value={recTitle}
                  onChange={(e) => setRecTitle(e.target.value)}
                  placeholder="Ex: Loyer, Facture Électricité, Salaire..."
                  required
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-hidden font-medium focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Montant ({currency})</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={recAmount}
                    onChange={(e) => setRecAmount(e.target.value)}
                    placeholder="75000"
                    required
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-hidden font-medium focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Jour du mois</label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={recDay}
                    onChange={(e) => setRecDay(Number(e.target.value))}
                    required
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-hidden font-medium focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Type</label>
                  <select
                    value={recType}
                    onChange={(e) => setRecType(e.target.value as 'expense' | 'income')}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-hidden font-medium focus:border-emerald-500"
                  >
                    <option value="expense">Dépense fixe</option>
                    <option value="income">Revenu régulier</option>
                  </select>
                </div>
                {recType === 'expense' && (
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 dark:text-slate-300">Pilier</label>
                    <select
                      value={recPillar}
                      onChange={(e) => setRecPillar(e.target.value as KakeiboPillar)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-hidden font-medium focus:border-emerald-500"
                    >
                      <option value="needs">Besoins essentiels</option>
                      <option value="wants">Envies & Plaisirs</option>
                      <option value="culture">Culture & Savoir</option>
                      <option value="unexpected">Imprévus & Extras</option>
                    </select>
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold mt-2 hover:bg-emerald-700 transition"
              >
                Enregistrer l&apos;opération
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Wipe Confirmation Dialog */}
      {showWipeConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold">Effacer toutes les données ?</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Cette action supprimera définitivement tous vos budgets, transactions, bilans et cagnottes sur cet appareil.
              </p>
            </div>
            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowWipeConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleWipeDatabase}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700"
              >
                Confirmer l&apos;effacement
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
