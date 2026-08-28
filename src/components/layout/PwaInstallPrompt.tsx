'use client';

import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Share, PlusSquare, Sparkles, CheckCircle2 } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(true);
  const [isIos, setIsIos] = useState<boolean>(false);
  const [showIosGuide, setShowIosGuide] = useState<boolean>(false);
  const [installedSuccess, setInstalledSuccess] = useState<boolean>(false);

  useEffect(() => {
    // 1. Check if running in standalone mode (already installed)
    const isStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    setIsStandalone(isStandaloneMode);

    if (isStandaloneMode) {
      return;
    }

    // 2. Check if dismissed recently
    const dismissed = localStorage.getItem('kakeibo_pwa_install_dismissed');
    if (dismissed) {
      setIsDismissed(true);
    } else {
      setIsDismissed(false);
    }

    // 3. Detect iOS device
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isIosDevice);

    // 4. Capture beforeinstallprompt event (Android / Chromium)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      if (!dismissed) {
        setIsDismissed(false);
      }
    };

    const handleAppInstalled = () => {
      setInstalledSuccess(true);
      setDeferredPrompt(null);
      setIsDismissed(true);
      setTimeout(() => setInstalledSuccess(false), 5000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIos) {
      setShowIosGuide(true);
      return;
    }

    if (!deferredPrompt) {
      // Fallback instructions if prompt not available directly
      setShowIosGuide(true);
      return;
    }

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setInstalledSuccess(true);
        setIsDismissed(true);
      }
      setDeferredPrompt(null);
    } catch (err) {
      console.error('Error invoking PWA install prompt:', err);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('kakeibo_pwa_install_dismissed', 'true');
  };

  // Don't render banner if app is already installed or if user dismissed it
  if (isStandalone || isDismissed) {
    if (installedSuccess) {
      return (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-emerald-600 text-white text-xs font-bold shadow-xl animate-fade-in">
          <CheckCircle2 className="h-4 w-4" />
          <span>Application installée avec succès !</span>
        </div>
      );
    }
    return null;
  }

  return (
    <>
      {/* Floating PWA Install Banner */}
      <aside
        aria-label="Installation de l'application"
        className="fixed bottom-16 sm:bottom-20 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md z-40 rounded-2xl border border-emerald-500/30 bg-slate-900/95 text-white p-3.5 shadow-2xl backdrop-blur-md animate-slide-up"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md">
              <Smartphone className="h-5 w-5 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5">
                <h4 className="text-xs font-bold text-slate-100 truncate">Installer l&apos;application Kakeibo</h4>
                <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <p className="text-[11px] text-slate-300 line-clamp-1">
                Accès 100% hors-ligne, fluide et sécurisé sur votre écran d&apos;accueil.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition shrink-0"
            title="Masquer"
            aria-label="Fermer la bannière"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 flex items-center justify-end space-x-2">
          <button
            type="button"
            onClick={handleDismiss}
            className="px-3 py-1.5 rounded-xl text-[11px] font-semibold text-slate-400 hover:text-slate-200 transition"
          >
            Plus tard
          </button>
          <button
            type="button"
            onClick={handleInstallClick}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-md active:scale-95"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Installer l&apos;application</span>
          </button>
        </div>
      </aside>

      {/* iOS / Safari / Manual Install Guide Modal */}
      {showIosGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4 text-slate-900 dark:text-slate-100 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <Smartphone className="h-4 w-4 text-emerald-600" />
                <h3 className="text-sm font-bold">Installer sur votre écran d&apos;accueil</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowIosGuide(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-slate-500 leading-relaxed">
              Pour ajouter Kakeibo comme une application native sans passer par les stores :
            </p>

            <div className="space-y-3 bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
              <div className="flex items-start space-x-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-xs">
                  1
                </div>
                <div className="space-y-0.5">
                  <p className="font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-1">
                    <span>Touchez le bouton Partager</span>
                    <Share className="h-3.5 w-3.5 text-blue-600 inline" />
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Dans la barre de navigation de votre navigateur (en bas sur Safari, en haut à droite sur Chrome).
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-xs">
                  2
                </div>
                <div className="space-y-0.5">
                  <p className="font-bold text-slate-800 dark:text-slate-200 flex items-center space-x-1">
                    <span>Sélectionnez &laquo; Sur l&apos;écran d&apos;accueil &raquo;</span>
                    <PlusSquare className="h-3.5 w-3.5 text-emerald-600 inline" />
                  </p>
                  <p className="text-[11px] text-slate-500">
                    L&apos;icône Kakeibo apparaîtra directement sur votre écran comme une application dédiée.
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowIosGuide(false);
                handleDismiss();
              }}
              className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition"
            >
              J&apos;ai compris
            </button>
          </div>
        </div>
      )}
    </>
  );
}
