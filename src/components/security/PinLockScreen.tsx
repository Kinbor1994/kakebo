'use client';

import React, { useState } from 'react';
import { useSecurity } from './SecurityContext';
import { Lock, Delete, Shield, AlertCircle } from 'lucide-react';
import { db } from '@/lib/db';

export function PinLockScreen() {
  const { unlockWithPin } = useSecurity();
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);

  const handleDigit = async (digit: string) => {
    if (pin.length >= 6) return;
    const newPin = pin + digit;
    setPin(newPin);
    setError('');

    // Check automatically when 4 digits or more
    if (newPin.length >= 4) {
      const success = await unlockWithPin(newPin);
      if (success) {
        setPin('');
      } else if (newPin.length === 6) {
        // Trigger error shake if reached max
        setError('Code PIN incorrect');
        setIsShaking(true);
        setTimeout(() => {
          setIsShaking(false);
          setPin('');
        }, 500);
      }
    }
  };

  const handleManualSubmit = async () => {
    if (pin.length < 4) return;
    const success = await unlockWithPin(pin);
    if (!success) {
      setError('Code PIN incorrect');
      setIsShaking(true);
      setTimeout(() => {
        setIsShaking(false);
        setPin('');
      }, 500);
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setError('');
  };

  const handleClear = () => {
    setPin('');
    setError('');
  };

  const handleEmergencyReset = async () => {
    await db.delete();
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-[#FAF9F5] dark:bg-[#141615] px-6 py-12 select-none text-stone-800 dark:text-stone-100">
      {/* Header */}
      <div className="flex flex-col items-center space-y-3 pt-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-200/70 dark:bg-stone-800 text-stone-700 dark:text-stone-300 shadow-xs">
          <Lock className="h-6 w-6 stroke-[1.75]" />
        </div>
        <div className="space-y-1">
          <h1 className="text-xl font-medium tracking-tight">Kakeibo Sécurisé</h1>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Saisissez votre code PIN pour accéder à vos finances
          </p>
        </div>
      </div>

      {/* PIN Dots Indicator */}
      <div className="flex flex-col items-center space-y-4 my-auto">
        <div
          className={`flex items-center space-x-3.5 transition-transform ${
            isShaking ? 'animate-bounce text-red-500' : ''
          }`}
        >
          {[0, 1, 2, 3].map((index) => {
            const isFilled = pin.length > index;
            return (
              <div
                key={index}
                className={`h-4 w-4 rounded-full transition-all duration-200 ${
                  isFilled
                    ? 'scale-110 bg-stone-800 dark:bg-stone-100 shadow-xs'
                    : 'border border-stone-300 dark:border-stone-700 bg-transparent'
                }`}
              />
            );
          })}
        </div>

        {error && (
          <div className="flex items-center space-x-1.5 text-xs text-rose-600 dark:text-rose-400 font-medium">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Keypad */}
      <div className="w-full max-w-xs space-y-3 pb-4">
        <div className="grid grid-cols-3 gap-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigit(digit)}
              className="flex h-16 items-center justify-center rounded-2xl bg-white dark:bg-stone-800/80 text-xl font-normal text-stone-800 dark:text-stone-100 shadow-xs border border-stone-200/60 dark:border-stone-700/50 active:scale-95 active:bg-stone-100 dark:active:bg-stone-700 transition"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            className="flex h-16 items-center justify-center rounded-2xl text-xs font-medium text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800/40 transition active:scale-95"
          >
            Effacer
          </button>
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="flex h-16 items-center justify-center rounded-2xl bg-white dark:bg-stone-800/80 text-xl font-normal text-stone-800 dark:text-stone-100 shadow-xs border border-stone-200/60 dark:border-stone-700/50 active:scale-95 active:bg-stone-100 dark:active:bg-stone-700 transition"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="flex h-16 items-center justify-center rounded-2xl text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800/40 transition active:scale-95"
            aria-label="Supprimer"
          >
            <Delete className="h-5 w-5" />
          </button>
        </div>

        {pin.length >= 4 && (
          <button
            type="button"
            onClick={handleManualSubmit}
            className="w-full py-3 mt-2 rounded-xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-sm font-medium transition active:scale-98"
          >
            Valider le code
          </button>
        )}

        <div className="pt-4 text-center">
          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            className="text-xs text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 transition underline underline-offset-4"
          >
            Code PIN oublié ?
          </button>
        </div>
      </div>

      {/* Emergency reset dialog */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-stone-900 p-6 shadow-xl border border-stone-200 dark:border-stone-800 space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400">
              <Shield className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-medium">Réinitialisation de secours</h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                Les données étant stockées uniquement et de façon chiffrée sur votre appareil, l&apos;oubli du code PIN nécessite la réinitialisation de la base de données locale.
              </p>
            </div>
            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleEmergencyReset}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-medium hover:bg-rose-700 transition"
              >
                Réinitialiser
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
