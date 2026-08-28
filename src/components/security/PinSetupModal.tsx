'use client';

import React, { useState } from 'react';
import { useSecurity } from './SecurityContext';
import { Lock, KeyRound, ShieldCheck, X, AlertCircle } from 'lucide-react';
import { db } from '@/lib/db';

interface PinSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PinSetupModal({ isOpen, onClose }: PinSetupModalProps) {
  const { isPinConfigured, configurePin, disablePin, userSettings, refreshSettings } = useSecurity();
  const [currentPin, setCurrentPin] = useState<string>('');
  const [newPin, setNewPin] = useState<string>('');
  const [confirmPin, setConfirmPin] = useState<string>('');
  const [autoLock, setAutoLock] = useState<number>(userSettings?.autoLockMinutes ?? 2);
  const [error, setError] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSavePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (newPin.length < 4 || newPin.length > 6) {
      setError('Le code PIN doit comporter entre 4 et 6 chiffres.');
      return;
    }

    if (newPin !== confirmPin) {
      setError('Les deux codes PIN ne correspondent pas.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isPinConfigured && currentPin) {
        // First verify old PIN by disabling then reconfiguring
        const disabled = await disablePin(currentPin);
        if (!disabled) {
          setError('Le code PIN actuel est incorrect.');
          setIsSubmitting(false);
          return;
        }
      }

      const success = await configurePin(newPin);
      if (success) {
        // Also update auto-lock minutes
        if (userSettings?.id) {
          await db.userSettings.update(userSettings.id, { autoLockMinutes: autoLock });
          await refreshSettings();
        }
        setSuccessMsg('Code PIN enregistré avec succès.');
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setError('Impossible d’enregistrer le code PIN.');
      }
    } catch {
      setError('Une erreur est survenue lors de la configuration.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDisablePin = async () => {
    if (!currentPin) {
      setError('Veuillez saisir votre code PIN actuel pour le désactiver.');
      return;
    }
    setIsSubmitting(true);
    try {
      const disabled = await disablePin(currentPin);
      if (disabled) {
        setSuccessMsg('Le verrouillage par code PIN a été désactivé.');
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setError('Code PIN actuel incorrect.');
      }
    } catch {
      setError('Erreur lors de la désactivation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-2xl bg-[#FAF9F5] dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-6 shadow-xl space-y-5 text-stone-800 dark:text-stone-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-stone-200/60 dark:border-stone-800">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-200/70 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
              <Lock className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-medium">Sécurité & Code PIN</h2>
              <p className="text-xs text-stone-500">Verrouillage local hors-ligne</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="flex items-center space-x-2 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="flex items-center space-x-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSavePin} className="space-y-4">
          {isPinConfigured && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-stone-600 dark:text-stone-300 flex items-center space-x-1.5">
                <KeyRound className="h-3.5 w-3.5" />
                <span>Code PIN actuel</span>
              </label>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-sm tracking-widest outline-hidden focus:border-stone-500 transition text-center"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-stone-600 dark:text-stone-300">
              {isPinConfigured ? 'Nouveau code PIN (4 à 6 chiffres)' : 'Définir un code PIN (4 à 6 chiffres)'}
            </label>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-sm tracking-widest outline-hidden focus:border-stone-500 transition text-center"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-stone-600 dark:text-stone-300">
              Confirmer le code PIN
            </label>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-sm tracking-widest outline-hidden focus:border-stone-500 transition text-center"
            />
          </div>

          <div className="space-y-1.5 pt-1">
            <label className="text-xs font-medium text-stone-600 dark:text-stone-300">
              Délai de verrouillage automatique
            </label>
            <select
              value={autoLock}
              onChange={(e) => setAutoLock(Number(e.target.value))}
              className="w-full px-3 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs outline-hidden focus:border-stone-500 transition"
            >
              <option value={1}>Après 1 minute d&apos;inactivité</option>
              <option value={2}>Après 2 minutes d&apos;inactivité (Recommandé)</option>
              <option value={5}>Après 5 minutes d&apos;inactivité</option>
              <option value={10}>Après 10 minutes d&apos;inactivité</option>
              <option value={0}>Désactiver le verrouillage automatique</option>
            </select>
          </div>

          <div className="flex space-x-3 pt-3">
            {isPinConfigured && (
              <button
                type="button"
                onClick={handleDisablePin}
                disabled={isSubmitting}
                className="flex-1 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900/60 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition disabled:opacity-50"
              >
                Désactiver
              </button>
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 rounded-xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-xs font-medium hover:bg-stone-800 dark:hover:bg-stone-200 transition disabled:opacity-50"
            >
              {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
