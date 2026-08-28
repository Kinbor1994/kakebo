'use client';

import React, { useState, useEffect } from 'react';
import { useSecurity } from './SecurityContext';
import { Lock, Delete, Shield, AlertCircle, Fingerprint } from 'lucide-react';
import { db } from '@/lib/db';

export function PinLockScreen() {
  const { unlockWithPin, unlockWithBiometrics, isBiometricConfigured } = useSecurity();
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);

  // Attempt biometric unlock on mount if enabled
  useEffect(() => {
    if (isBiometricConfigured) {
      unlockWithBiometrics();
    }
  }, [isBiometricConfigured, unlockWithBiometrics]);

  const handleDigit = async (digit: string) => {
    if (pin.length >= 6) return;
    const newPin = pin + digit;
    setPin(newPin);
    setError('');

    if (newPin.length >= 4) {
      const success = await unlockWithPin(newPin);
      if (success) {
        setPin('');
      } else if (newPin.length === 6) {
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
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-[#F8F9FA] dark:bg-slate-950 px-6 py-10 select-none text-slate-900 dark:text-slate-100">
      {/* Header */}
      <div className="flex flex-col items-center space-y-3 pt-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 shadow-xs border border-emerald-100 dark:border-emerald-900/40">
          <Lock className="h-6 w-6 stroke-[2]" />
        </div>
        <div className="space-y-1">
          <h1 className="text-xl font-bold tracking-tight">Kakeibo Sécurisé</h1>
          <p className="text-xs text-slate-500">
            Saisissez votre code PIN pour accéder à vos finances
          </p>
        </div>
      </div>

      {/* PIN Dots Indicator */}
      <div className="flex flex-col items-center space-y-4 my-auto">
        <div
          className={`flex items-center space-x-3.5 transition-transform ${
            isShaking ? 'animate-bounce text-rose-500' : ''
          }`}
        >
          {[0, 1, 2, 3].map((index) => {
            const isFilled = pin.length > index;
            return (
              <div
                key={index}
                className={`h-4 w-4 rounded-full transition-all duration-200 ${
                  isFilled
                    ? 'scale-110 bg-emerald-600 shadow-xs'
                    : 'border-2 border-slate-300 dark:border-slate-700 bg-transparent'
                }`}
              />
            );
          })}
        </div>

        {error && (
          <div className="flex items-center space-x-1.5 text-xs text-rose-600 font-semibold">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Keypad & Biometrics */}
      <div className="w-full max-w-xs space-y-3 pb-4">
        <div className="grid grid-cols-3 gap-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigit(digit)}
              className="flex h-16 items-center justify-center rounded-2xl bg-white dark:bg-slate-800 text-xl font-bold text-slate-800 dark:text-slate-100 shadow-xs border border-slate-200/80 dark:border-slate-700 active:scale-95 active:bg-slate-100 transition"
            >
              {digit}
            </button>
          ))}

          {isBiometricConfigured ? (
            <button
              type="button"
              onClick={unlockWithBiometrics}
              className="flex h-16 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/60 active:scale-95 transition"
              title="Déverrouiller avec empreinte / Face ID"
            >
              <Fingerprint className="h-6 w-6 stroke-[2]" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleClear}
              className="flex h-16 items-center justify-center rounded-2xl text-xs font-bold text-slate-400 hover:text-slate-600 transition active:scale-95"
            >
              Effacer
            </button>
          )}

          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="flex h-16 items-center justify-center rounded-2xl bg-white dark:bg-slate-800 text-xl font-bold text-slate-800 dark:text-slate-100 shadow-xs border border-slate-200/80 dark:border-slate-700 active:scale-95 active:bg-slate-100 transition"
          >
            0
          </button>

          <button
            type="button"
            onClick={handleDelete}
            className="flex h-16 items-center justify-center rounded-2xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition active:scale-95"
            aria-label="Supprimer un chiffre"
          >
            <Delete className="h-5 w-5" />
          </button>
        </div>

        {pin.length >= 4 && (
          <button
            type="button"
            onClick={handleManualSubmit}
            className="w-full py-3 mt-2 rounded-xl bg-emerald-600 text-white text-xs font-bold transition active:scale-98 shadow-sm hover:bg-emerald-700"
          >
            Valider le code PIN
          </button>
        )}

        <div className="pt-3 text-center">
          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            className="text-xs font-semibold text-slate-400 hover:text-slate-600 underline underline-offset-4 transition"
          >
            Code PIN oublié ?
          </button>
        </div>
      </div>

      {/* Emergency reset dialog */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
              <Shield className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold">Réinitialisation d&apos;urgence</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Les données étant stockées de manière chiffrée uniquement sur cet appareil, la perte de votre code PIN nécessite la réinitialisation de la base locale.
              </p>
            </div>
            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleEmergencyReset}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition"
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
