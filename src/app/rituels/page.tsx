'use client';

import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { getCurrentMonth, formatMonthLabel } from '@/lib/kakebo-engine';
import { type WishlistItem, type SavingsChallenge, type KakeiboPillar, PILLARS_CONFIG } from '@/types/kakebo';
import { AppHeader } from '@/components/layout/AppHeader';
import { BottomNav } from '@/components/layout/BottomNav';
import { QuickAddModal } from '@/components/kakebo/QuickAddModal';
import { MonthSetupModal } from '@/components/kakebo/MonthSetupModal';
import { useSecurity } from '@/components/security/SecurityContext';
import { PinLockScreen } from '@/components/security/PinLockScreen';
import { formatCurrency } from '@/lib/utils';
import confetti from 'canvas-confetti';
import {
  Clock,
  Sparkles,
  CheckCircle2,
  XCircle,
  Plus,
  Trophy,
  Printer,
  ShoppingBag,
  Trash2,
  X,
  Hourglass,
  Flame,
  Pencil,
  AlertTriangle,
} from 'lucide-react';
import { addHours, format, formatDistanceToNow, isAfter, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function RituelsPage() {
  const { isLocked, userSettings } = useSecurity();
  const currency = userSettings?.currency || 'XOF';

  const [currentMonth, setCurrentMonth] = useState<string>(getCurrentMonth());
  const [isQuickAddOpen, setIsQuickAddOpen] = useState<boolean>(false);
  const [isMonthSetupOpen, setIsMonthSetupOpen] = useState<boolean>(false);

  // Wishlist modal states
  const [isAddWishlistOpen, setIsAddWishlistOpen] = useState<boolean>(false);
  const [editingWish, setEditingWish] = useState<WishlistItem | null>(null);

  const [wishTitle, setWishTitle] = useState<string>('');
  const [wishAmount, setWishAmount] = useState<string>('');
  const [wishPillar, setWishPillar] = useState<KakeiboPillar>('wants');
  const [wishCategory, setWishCategory] = useState<string>('Sorties & Détente');
  const [wishNotes, setWishNotes] = useState<string>('');

  // Delete confirmation
  const [wishToDelete, setWishToDelete] = useState<WishlistItem | null>(null);

  const wishlistItems = useLiveQuery(() => db.wishlistItems.toArray()) || [];
  const challenges = useLiveQuery(() => db.savingsChallenges.where('month').equals(currentMonth).toArray()) || [];

  const pendingWishes = wishlistItems.filter((w) => w.status === 'pending');
  const resolvedWishes = wishlistItems.filter((w) => w.status !== 'pending');

  const handleOpenAddWish = () => {
    setEditingWish(null);
    setWishTitle('');
    setWishAmount('');
    setWishPillar('wants');
    setWishCategory('Sorties & Détente');
    setWishNotes('');
    setIsAddWishlistOpen(true);
  };

  const handleOpenEditWish = (item: WishlistItem) => {
    setEditingWish(item);
    setWishTitle(item.title);
    setWishAmount(String(item.amount));
    setWishPillar(item.pillar);
    setWishCategory(item.category);
    setWishNotes(item.notes || '');
    setIsAddWishlistOpen(true);
  };

  const handleSaveWish = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmt = parseFloat(wishAmount.replace(/\s+/g, '').replace(',', '.')) || 0;
    if (!wishTitle.trim() || numAmt <= 0) return;

    if (editingWish && editingWish.id) {
      await db.wishlistItems.update(editingWish.id, {
        title: wishTitle.trim(),
        amount: numAmt,
        pillar: wishPillar,
        category: wishCategory,
        notes: wishNotes.trim() || undefined,
      });
    } else {
      const now = new Date();
      const expiresAt = addHours(now, 48);

      await db.wishlistItems.add({
        title: wishTitle.trim(),
        amount: numAmt,
        pillar: wishPillar,
        category: wishCategory,
        createdAt: now.toISOString(),
        reflectionExpiresAt: expiresAt.toISOString(),
        status: 'pending',
        notes: wishNotes.trim() || undefined,
      });
    }

    setIsAddWishlistOpen(false);
    setEditingWish(null);
  };

  // Convert to actual bought transaction
  const handleBuyWish = async (item: WishlistItem) => {
    if (!item.id) return;
    const now = new Date();

    await db.transactions.add({
      month: format(now, 'yyyy-MM'),
      date: format(now, 'yyyy-MM-dd'),
      amount: item.amount,
      type: 'expense',
      pillar: item.pillar,
      category: item.category,
      description: `Achat réfléchi : ${item.title}`,
      createdAt: now.toISOString(),
    });

    await db.wishlistItems.update(item.id, { status: 'bought' });
  };

  // Abandon purchase & celebrate saved money!
  const handleAbandonWish = async (item: WishlistItem) => {
    if (!item.id) return;
    await db.wishlistItems.update(item.id, { status: 'abandoned' });

    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.6 },
    });
  };

  const handleDeleteWish = async () => {
    if (!wishToDelete?.id) return;
    await db.wishlistItems.delete(wishToDelete.id);
    setWishToDelete(null);
  };

  const handlePrintReport = () => {
    window.print();
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
      <main className="mx-auto max-w-xl px-3.5 pt-4 sm:px-4 sm:pt-5 space-y-4 sm:space-y-6">
        {/* Header Title */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight">Rituels & Pleine Conscience</h1>
            <p className="text-[11px] sm:text-xs text-slate-500">Délai de réflexion 48h & Défis d&apos;épargne</p>
          </div>

          <button
            type="button"
            onClick={handlePrintReport}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition shadow-2xs shrink-0"
            title="Imprimer le livret mensuel"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Livret PDF</span>
          </button>
        </div>

        {/* Wishlist Section */}
        <section className="space-y-3.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-slate-800 dark:text-slate-200">
              <Clock className="h-4 w-4 text-emerald-600" />
              <h2 className="text-xs font-bold uppercase tracking-wider">
                Wishlist Consciente (Délai 48h)
              </h2>
            </div>

            <button
              type="button"
              onClick={handleOpenAddWish}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition shadow-2xs active:scale-98"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Différer un achat</span>
            </button>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            Avant de céder à un achat non essentiel, donnez-vous 48 heures de réflexion. Si l&apos;envie persiste, achetez sans culpabilité. Sinon, félicitez-vous pour l&apos;économie réalisée !
          </p>

          {/* Pending Wishes */}
          {pendingWishes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 p-6 text-center text-xs text-slate-400 space-y-1.5">
              <Hourglass className="h-6 w-6 mx-auto text-slate-300" />
              <p>Aucun achat en cours de réflexion 48h.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingWishes.map((item) => {
                const expiresDate = parseISO(item.reflectionExpiresAt);
                const isReadyToDecide = isAfter(new Date(), expiresDate);
                const timeLeftStr = isReadyToDecide
                  ? 'Délai de réflexion écoulé'
                  : `Temps restant : ${formatDistanceToNow(expiresDate, { locale: fr })}`;

                return (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-2">
                          <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                            {item.title}
                          </h3>
                          <span className="text-[10px] font-semibold text-slate-400">
                            • {item.category}
                          </span>
                        </div>
                        <p className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                          {formatCurrency(item.amount, currency)}
                        </p>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isReadyToDecide
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {timeLeftStr}
                      </span>
                    </div>

                    {item.notes && (
                      <p className="text-xs text-slate-500 italic bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl">
                        &quot;{item.notes}&quot;
                      </p>
                    )}

                    <div className="flex items-center space-x-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => handleAbandonWish(item)}
                        className="flex-1 flex items-center justify-center space-x-1 py-2 rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-100 transition"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>J&apos;abandonne (Épargné !)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleBuyWish(item)}
                        className="flex-1 flex items-center justify-center space-x-1 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold hover:bg-slate-800 transition"
                      >
                        <ShoppingBag className="h-3.5 w-3.5" />
                        <span>J&apos;achète</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenEditWish(item)}
                        className="p-2 text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition"
                        title="Modifier"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setWishToDelete(item)}
                        className="p-2 text-slate-400 hover:text-rose-600 transition"
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Resolved wishes history */}
        {resolvedWishes.length > 0 && (
          <section className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Historique des décisions passées
            </h3>
            <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 divide-y divide-slate-100 dark:divide-slate-800 shadow-2xs">
              {resolvedWishes.slice(0, 5).map((w) => (
                <div key={w.id} className="flex items-center justify-between p-3 text-xs">
                  <div className="space-y-0.5">
                    <p className="font-bold text-slate-800 dark:text-slate-200">{w.title}</p>
                    <p className="text-[10px] text-slate-400">
                      {formatCurrency(w.amount, currency)} • {w.category}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span
                      className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        w.status === 'abandoned'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {w.status === 'abandoned' ? (
                        <>
                          <Sparkles className="h-3 w-3" />
                          <span>Économisé</span>
                        </>
                      ) : (
                        <span>Acheté</span>
                      )}
                    </span>

                    <button
                      type="button"
                      onClick={() => setWishToDelete(w)}
                      className="p-1 text-slate-400 hover:text-rose-600 transition"
                      title="Supprimer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Savings Challenges Section */}
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-3">
          <div className="flex items-center space-x-2 text-slate-800 dark:text-slate-200">
            <Trophy className="h-4 w-4 text-amber-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider">
              Défi du Mois : 15 Jours Sans Dépense
            </h3>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Consultez le calendrier dans l&apos;onglet <strong>Analyses</strong> pour suivre vos journées sans achats superflus et valider vos paliers !
          </p>
        </section>
      </main>

      {/* Add / Edit Wish Modal */}
      {isAddWishlistOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4 text-slate-900 dark:text-slate-100">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-base font-bold">
                {editingWish ? 'Modifier le souhait de réflexion' : 'Différer un achat (Délai 48h)'}
              </h2>
              <button
                type="button"
                onClick={() => setIsAddWishlistOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveWish} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Nom de l&apos;article ou service</label>
                <input
                  type="text"
                  value={wishTitle}
                  onChange={(e) => setWishTitle(e.target.value)}
                  placeholder="Ex: Paire de baskets, Nouveau gadget, Montre..."
                  required
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-hidden font-medium focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Prix estimé ({currency})</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={wishAmount}
                  onChange={(e) => setWishAmount(e.target.value)}
                  placeholder="45000"
                  required
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-hidden font-bold focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Pilier</label>
                <select
                  value={wishPillar}
                  onChange={(e) => setWishPillar(e.target.value as KakeiboPillar)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-hidden font-medium focus:border-emerald-500"
                >
                  <option value="wants">Envies & Plaisirs</option>
                  <option value="culture">Culture & Formation</option>
                  <option value="unexpected">Imprévus & Extras</option>
                  <option value="needs">Besoins essentiels</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">Pourquoi cet achat ? (Motivation)</label>
                <textarea
                  rows={2}
                  value={wishNotes}
                  onChange={(e) => setWishNotes(e.target.value)}
                  placeholder="Ex: J'en ai envie depuis la promo, mais est-ce indispensable ?"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-hidden focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition mt-2"
              >
                {editingWish ? 'Enregistrer les modifications' : 'Démarrer le compte à rebours 48h'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Wish Confirmation Modal */}
      {wishToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold">Supprimer cet article ?</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Voulez-vous supprimer <strong>&quot;{wishToDelete.title}&quot;</strong> ({formatCurrency(wishToDelete.amount, currency)}) ?
              </p>
            </div>
            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setWishToDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleDeleteWish}
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
