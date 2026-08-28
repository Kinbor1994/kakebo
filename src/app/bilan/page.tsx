'use client';

import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { getCurrentMonth, formatMonthLabel, calculateMonthlyStats } from '@/lib/kakebo-engine';
import { type Reflection, type ReflectionPeriodType } from '@/types/kakebo';
import { AppHeader } from '@/components/layout/AppHeader';
import { BottomNav } from '@/components/layout/BottomNav';
import { QuickAddModal } from '@/components/kakebo/QuickAddModal';
import { MonthSetupModal } from '@/components/kakebo/MonthSetupModal';
import { useSecurity } from '@/components/security/SecurityContext';
import { PinLockScreen } from '@/components/security/PinLockScreen';
import { formatCurrency } from '@/lib/utils';
import confetti from 'canvas-confetti';
import {
  CheckCircle2,
  AlertCircle,
  Save,
  Compass,
} from 'lucide-react';

export default function BilanPage() {
  const { isLocked, userSettings } = useSecurity();
  const currency = userSettings?.currency || 'XOF';

  const [currentMonth, setCurrentMonth] = useState<string>(getCurrentMonth());
  const [isQuickAddOpen, setIsQuickAddOpen] = useState<boolean>(false);
  const [isMonthSetupOpen, setIsMonthSetupOpen] = useState<boolean>(false);

  const [periodType, setPeriodType] = useState<ReflectionPeriodType>('monthly');
  const [selectedWeek, setSelectedWeek] = useState<number>(1);

  // Form states for the 4 Kakeibo questions
  const [spentReview, setSpentReview] = useState<string>('');
  const [savingSuccess, setSavingSuccess] = useState<string>('');
  const [criticalAssessment, setCriticalAssessment] = useState<string>('');
  const [futureCommitment, setFutureCommitment] = useState<string>('');
  const [isSaved, setIsSaved] = useState<boolean>(false);

  const periodKey = periodType === 'monthly' ? currentMonth : `${currentMonth}-W${selectedWeek}`;

  // Live queries
  const budget = useLiveQuery(
    () => db.monthlyBudgets.where('month').equals(currentMonth).first(),
    [currentMonth]
  );

  const transactions = useLiveQuery(
    () => db.transactions.where('month').equals(currentMonth).toArray(),
    [currentMonth]
  ) || [];

  const stats = calculateMonthlyStats(budget, transactions);

  // Load existing reflection for this periodKey
  useEffect(() => {
    async function loadReflection() {
      const existing = await db.reflections.where('periodKey').equals(periodKey).first();
      if (existing) {
        setSpentReview(existing.answers.spentReview || '');
        setSavingSuccess(existing.answers.savingSuccess || '');
        setCriticalAssessment(existing.answers.criticalAssessment || '');
        setFutureCommitment(existing.answers.futureCommitment || '');
      } else {
        setSpentReview('');
        setSavingSuccess('');
        setCriticalAssessment('');
        setFutureCommitment('');
      }
      setIsSaved(false);
    }
    loadReflection();
  }, [periodKey]);

  const targetAchieved = stats.currentSavings >= stats.targetSavings && stats.targetSavings > 0;

  const handleSaveReflection = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const existing = await db.reflections.where('periodKey').equals(periodKey).first();
      const payload: Reflection = {
        periodType,
        periodKey,
        month: currentMonth,
        spentTotal: stats.totalSpent,
        savedTotal: stats.currentSavings,
        targetAchieved,
        answers: {
          spentReview,
          savingSuccess,
          criticalAssessment,
          futureCommitment,
        },
        createdAt: existing?.createdAt || new Date().toISOString(),
      };

      if (existing?.id) {
        await db.reflections.update(existing.id, payload);
      } else {
        await db.reflections.add(payload);
      }

      setIsSaved(true);
      if (targetAchieved) {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.7 },
          colors: ['#059669', '#E11D48', '#D97706', '#2563EB'],
        });
      }

      setTimeout(() => setIsSaved(false), 3000);
    } catch (error) {
      console.error('Failed to save reflection:', error);
    }
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

      {/* Main Container */}
      <main className="mx-auto max-w-xl px-3.5 pt-4 sm:px-4 sm:pt-5 space-y-4 sm:space-y-5">
        {/* Title */}
        <div className="space-y-1">
          <div className="flex items-center space-x-1.5 text-emerald-600 dark:text-emerald-400">
            <Compass className="h-4 w-4" />
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider">
              Rituel d&apos;Introspection Kakeibo
            </span>
          </div>
          <h1 className="text-base sm:text-lg font-bold tracking-tight">
            Bilan Réflexif — {formatMonthLabel(currentMonth)}
          </h1>
          <p className="text-[11px] sm:text-xs text-slate-500 leading-relaxed">
            Le Kakeibo repose sur 4 questions clés pour comprendre ses flux d&apos;argent sans culpabilité et ajuster son épargne.
          </p>
        </div>

        {/* Period Selector (Monthly vs Weekly) */}
        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-200/70 dark:bg-slate-800 p-1">
          <button
            type="button"
            onClick={() => setPeriodType('monthly')}
            className={`py-2 rounded-xl text-xs font-bold transition ${
              periodType === 'monthly'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Bilan Mensuel Global
          </button>
          <button
            type="button"
            onClick={() => setPeriodType('weekly')}
            className={`py-2 rounded-xl text-xs font-bold transition ${
              periodType === 'weekly'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Bilan Hebdomadaire
          </button>
        </div>

        {/* Week selection chips if weekly */}
        {periodType === 'weekly' && (
          <div className="flex space-x-2 overflow-x-auto pb-1">
            {[1, 2, 3, 4, 5].map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => setSelectedWeek(w)}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition border ${
                  selectedWeek === w
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 border-slate-900 shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                Sem. {w}
              </button>
            ))}
          </div>
        )}

        {/* Financial Summary Snapshot */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Synthèse de la période
            </span>
            <span
              className={`inline-flex items-center space-x-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                targetAchieved
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300'
              }`}
            >
              {targetAchieved ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
              <span>{targetAchieved ? 'Objectif d\'épargne atteint' : 'Épargne en cours'}</span>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/30">
              <span className="text-[10px] font-semibold text-emerald-800 dark:text-emerald-300">Besoins</span>
              <p className="font-bold text-emerald-950 dark:text-emerald-200 mt-0.5">
                {formatCurrency(stats.spentByPillar.needs, currency)}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/30">
              <span className="text-[10px] font-semibold text-rose-800 dark:text-rose-300">Envies</span>
              <p className="font-bold text-rose-950 dark:text-rose-200 mt-0.5">
                {formatCurrency(stats.spentByPillar.wants, currency)}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/30">
              <span className="text-[10px] font-semibold text-amber-800 dark:text-amber-300">Culture</span>
              <p className="font-bold text-amber-950 dark:text-amber-200 mt-0.5">
                {formatCurrency(stats.spentByPillar.culture, currency)}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/30">
              <span className="text-[10px] font-semibold text-blue-800 dark:text-blue-300">Imprévus</span>
              <p className="font-bold text-blue-950 dark:text-blue-200 mt-0.5">
                {formatCurrency(stats.spentByPillar.unexpected, currency)}
              </p>
            </div>
          </div>
        </div>

        {/* The 4 Kakeibo Questions Form */}
        <form onSubmit={handleSaveReflection} className="space-y-4">
          {/* Question 1 */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-2 shadow-xs">
            <label className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white text-[10px] font-bold">
                1
              </span>
              <span>Combien d&apos;argent avez-vous dépensé et où est-il allé ?</span>
            </label>
            <p className="text-[11px] text-slate-400">
              Analysez la part relative entre vos Besoins indispensables et vos Envies de confort.
            </p>
            <textarea
              rows={2}
              value={spentReview}
              onChange={(e) => setSpentReview(e.target.value)}
              placeholder="Ex: Mes dépenses de nourriture sont sous contrôle, mais les sorties ont été plus élevées..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs outline-hidden focus:border-emerald-500"
            />
          </div>

          {/* Question 2 */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-2 shadow-xs">
            <label className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white text-[10px] font-bold">
                2
              </span>
              <span>Combien avez-vous réussi à mettre de côté ?</span>
            </label>
            <p className="text-[11px] text-slate-400">
              Comparez votre épargne réelle avec votre engagement du 1er du mois.
            </p>
            <textarea
              rows={2}
              value={savingSuccess}
              onChange={(e) => setSavingSuccess(e.target.value)}
              placeholder="Ex: Objectif tenu grâce au virement automatique sur ma tontine / mon compte épargne..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs outline-hidden focus:border-emerald-500"
            />
          </div>

          {/* Question 3 */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-2 shadow-xs">
            <label className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white text-[10px] font-bold">
                3
              </span>
              <span>Quelles dépenses auraient pu être évitées ?</span>
            </label>
            <p className="text-[11px] text-slate-400">
              Identifiez les achats impulsifs ou les dépenses évitables sans jugement négatif.
            </p>
            <textarea
              rows={2}
              value={criticalAssessment}
              onChange={(e) => setCriticalAssessment(e.target.value)}
              placeholder="Ex: Deux achats impulsifs que j'aurais pu différer de 24h..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs outline-hidden focus:border-emerald-500"
            />
          </div>

          {/* Question 4 */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-2 shadow-xs">
            <label className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white text-[10px] font-bold">
                4
              </span>
              <span>Quel est votre engagement pour la période suivante ?</span>
            </label>
            <p className="text-[11px] text-slate-400">
              Formulez une intention concrète et facile à tenir.
            </p>
            <textarea
              rows={2}
              value={futureCommitment}
              onChange={(e) => setFutureCommitment(e.target.value)}
              placeholder="Ex: Préparer ma liste de courses à l'avance, allouer plus au développement personnel..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs outline-hidden focus:border-emerald-500"
            />
          </div>

          {/* Save Button */}
          <button
            type="submit"
            className="w-full py-3.5 rounded-xl bg-emerald-600 text-white text-xs font-bold tracking-wide hover:bg-emerald-700 transition shadow-sm flex items-center justify-center space-x-2"
          >
            {isSaved ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-emerald-200" />
                <span>Bilan enregistré avec succès !</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Enregistrer mes réflexions Kakeibo</span>
              </>
            )}
          </button>
        </form>
      </main>

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
