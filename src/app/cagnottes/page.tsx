'use client';

import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { getCurrentMonth } from '@/lib/kakebo-engine';
import { type SavingsGoal } from '@/types/kakebo';
import { AppHeader } from '@/components/layout/AppHeader';
import { BottomNav } from '@/components/layout/BottomNav';
import { QuickAddModal } from '@/components/kakebo/QuickAddModal';
import { MonthSetupModal } from '@/components/kakebo/MonthSetupModal';
import { useSecurity } from '@/components/security/SecurityContext';
import { PinLockScreen } from '@/components/security/PinLockScreen';
import { formatCurrency } from '@/lib/utils';
import confetti from 'canvas-confetti';
import {
  Target,
  Shield,
  Compass,
  Home,
  Car,
  Heart,
  Laptop,
  Sun,
  Plus,
  Trophy,
  Trash2,
  X,
} from 'lucide-react';

const GOAL_ICONS: Record<SavingsGoal['iconKey'], React.ComponentType<{ className?: string }>> = {
  Target,
  Shield,
  Compass,
  Home,
  Car,
  Heart,
  Laptop,
  Sun,
};

export default function CagnottesPage() {
  const { isLocked, userSettings } = useSecurity();
  const currency = userSettings?.currency || 'XOF';

  const [currentMonth, setCurrentMonth] = useState<string>(getCurrentMonth());
  const [isQuickAddOpen, setIsQuickAddOpen] = useState<boolean>(false);
  const [isMonthSetupOpen, setIsMonthSetupOpen] = useState<boolean>(false);

  // New goal modal state
  const [isNewGoalOpen, setIsNewGoalOpen] = useState<boolean>(false);
  const [title, setTitle] = useState<string>('');
  const [targetAmount, setTargetAmount] = useState<string>('');
  const [currentAmount, setCurrentAmount] = useState<string>('0');
  const [deadline, setDeadline] = useState<string>('');
  const [selectedIcon, setSelectedIcon] = useState<SavingsGoal['iconKey']>('Target');
  const [selectedColor, setSelectedColor] = useState<string>('#059669');

  // Adjust funds modal state
  const [activeGoalForAdjust, setActiveGoalForAdjust] = useState<SavingsGoal | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<string>('');
  const [adjustType, setAdjustType] = useState<'deposit' | 'withdraw'>('deposit');

  const goals = useLiveQuery(() => db.savingsGoals.toArray()) || [];

  const totalTarget = goals.reduce((sum, g) => sum + g.targetAmount, 0);
  const totalSaved = goals.reduce((sum, g) => sum + g.currentAmount, 0);
  const overallPercentage = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    const numTarget = parseFloat(targetAmount.replace(/\s+/g, '').replace(',', '.')) || 0;
    const numCurrent = parseFloat(currentAmount.replace(/\s+/g, '').replace(',', '.')) || 0;
    if (!title.trim() || numTarget <= 0) return;

    await db.savingsGoals.add({
      title: title.trim(),
      targetAmount: numTarget,
      currentAmount: numCurrent,
      deadline: deadline || undefined,
      iconKey: selectedIcon,
      colorHex: selectedColor,
      createdAt: new Date().toISOString(),
    });

    setTitle('');
    setTargetAmount('');
    setCurrentAmount('0');
    setDeadline('');
    setIsNewGoalOpen(false);
  };

  const handleAdjustFunds = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGoalForAdjust?.id) return;
    const numAmt = parseFloat(adjustAmount.replace(/\s+/g, '').replace(',', '.')) || 0;
    if (numAmt <= 0) return;

    const newAmount =
      adjustType === 'deposit'
        ? activeGoalForAdjust.currentAmount + numAmt
        : Math.max(0, activeGoalForAdjust.currentAmount - numAmt);

    await db.savingsGoals.update(activeGoalForAdjust.id, {
      currentAmount: newAmount,
    });

    if (adjustType === 'deposit' && newAmount >= activeGoalForAdjust.targetAmount) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    }

    setAdjustAmount('');
    setActiveGoalForAdjust(null);
  };

  const handleDeleteGoal = async (id?: number) => {
    if (!id) return;
    await db.savingsGoals.delete(id);
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
        {/* Title & Add Button */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold tracking-tight">Cagnottes & Projets</h1>
            <p className="text-xs text-slate-500">Objectifs d&apos;épargne dédiés</p>
          </div>

          <button
            type="button"
            onClick={() => setIsNewGoalOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition shadow-sm shadow-emerald-600/20 active:scale-98"
          >
            <Plus className="h-4 w-4" />
            <span>Nouveau projet</span>
          </button>
        </div>

        {/* Global Goals Summary Card */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Total épargné sur l&apos;ensemble des projets
            </span>
            <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
              {overallPercentage}%
            </span>
          </div>

          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
              {formatCurrency(totalSaved, currency)}
            </span>
            <span className="text-xs font-semibold text-slate-400">
              / {formatCurrency(totalTarget, currency)} visés
            </span>
          </div>

          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-emerald-600 transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(2, overallPercentage))}%` }}
            />
          </div>
        </div>

        {/* Goals List */}
        {goals.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center space-y-3 shadow-xs">
            <Trophy className="h-9 w-9 mx-auto text-amber-500" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold">Aucune cagnotte active</h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Créez une cagnotte pour matérialiser vos projets : Fonds d&apos;urgence, Moto/Voiture, Voyage, Études, Matériel...
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsNewGoalOpen(true)}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition"
            >
              <Plus className="h-4 w-4" />
              <span>Créer mon premier projet</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {goals.map((goal) => {
              const Icon = GOAL_ICONS[goal.iconKey] || Target;
              const percent = goal.targetAmount > 0 ? Math.round((goal.currentAmount / goal.targetAmount) * 100) : 0;
              const isCompleted = goal.currentAmount >= goal.targetAmount;

              return (
                <div
                  key={goal.id}
                  className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div
                        className="flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-xs"
                        style={{ backgroundColor: goal.colorHex }}
                      >
                        <Icon className="h-5 w-5 stroke-[2.2]" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                            {goal.title}
                          </h3>
                          {isCompleted && (
                            <span className="rounded-md bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-300">
                              Objectif atteint !
                            </span>
                          )}
                        </div>
                        {goal.deadline && (
                          <p className="text-[11px] text-slate-400">Échéance : {goal.deadline}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveGoalForAdjust(goal);
                          setAdjustType('deposit');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-emerald-50 hover:text-emerald-700 transition"
                      >
                        + Alimenter
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteGoal(goal.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 transition"
                        title="Supprimer la cagnotte"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {formatCurrency(goal.currentAmount, currency)}
                      </span>
                      <span className="text-slate-500 font-semibold">
                        {percent}% / {formatCurrency(goal.targetAmount, currency)}
                      </span>
                    </div>

                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, Math.max(3, percent))}%`,
                          backgroundColor: goal.colorHex,
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* New Goal Modal */}
      {isNewGoalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4 text-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-base font-bold">Nouvelle Cagnotte</h2>
              <button
                type="button"
                onClick={() => setIsNewGoalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGoal} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Titre du projet</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Fonds d'urgence, Moto, Voyage..."
                  required
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-hidden font-medium focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Montant cible ({currency})</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    placeholder="250000"
                    required
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-hidden font-medium focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Déjà épargné ({currency})</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={currentAmount}
                    onChange={(e) => setCurrentAmount(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-hidden font-medium focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Échéance souhaitée (optionnel)</label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-hidden font-medium focus:border-emerald-500"
                />
              </div>

              {/* Icon Selector */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Icône</label>
                <div className="flex space-x-2 overflow-x-auto pb-1">
                  {(['Target', 'Shield', 'Compass', 'Home', 'Car', 'Heart', 'Laptop', 'Sun'] as SavingsGoal['iconKey'][]).map((iKey) => {
                    const IconComp = GOAL_ICONS[iKey];
                    return (
                      <button
                        key={iKey}
                        type="button"
                        onClick={() => setSelectedIcon(iKey)}
                        className={`p-2 rounded-xl border transition ${
                          selectedIcon === iKey
                            ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs'
                            : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600'
                        }`}
                      >
                        <IconComp className="h-4 w-4" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Color Selector */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Couleur du projet</label>
                <div className="flex space-x-2.5 pt-1">
                  {['#059669', '#E11D48', '#D97706', '#2563EB', '#7C3AED', '#0891B2'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setSelectedColor(c)}
                      className={`h-7 w-7 rounded-full border-2 transition ${
                        selectedColor === c ? 'scale-110 border-slate-900 dark:border-white shadow-sm' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold mt-3 hover:bg-emerald-700 transition"
              >
                Créer la cagnotte
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Adjust Funds Modal */}
      {activeGoalForAdjust && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4 text-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-sm font-bold">{activeGoalForAdjust.title}</h2>
              <button
                type="button"
                onClick={() => setActiveGoalForAdjust(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAdjustFunds} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 dark:bg-slate-800 p-1">
                <button
                  type="button"
                  onClick={() => setAdjustType('deposit')}
                  className={`py-2 rounded-xl font-bold transition ${
                    adjustType === 'deposit' ? 'bg-white dark:bg-slate-700 text-emerald-700 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  + Ajouter des fonds
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustType('withdraw')}
                  className={`py-2 rounded-xl font-bold transition ${
                    adjustType === 'withdraw' ? 'bg-white dark:bg-slate-700 text-rose-700 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  - Retirer
                </button>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Montant ({currency})</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
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
                Valider l&apos;opération
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
