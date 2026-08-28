'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { db, getOrCreateUserSettings } from '@/lib/db';
import { verifyPin, hashPin, generateSalt } from '@/lib/crypto';
import { type UserSettings } from '@/types/kakebo';

interface SecurityContextType {
  isLocked: boolean;
  isPinConfigured: boolean;
  userSettings: UserSettings | null;
  unlockWithPin: (pin: string) => Promise<boolean>;
  lockNow: () => void;
  configurePin: (newPin: string) => Promise<boolean>;
  disablePin: (currentPin: string) => Promise<boolean>;
  refreshSettings: () => Promise<void>;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

export function SecurityProvider({ children }: { children: React.ReactNode }) {
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [isReady, setIsReady] = useState<boolean>(false);
  const activityTimerRef = useRef<NodeJS.Timeout | null>(null);

  const refreshSettings = useCallback(async () => {
    try {
      const settings = await getOrCreateUserSettings();
      setUserSettings(settings);
      if (settings.isPinEnabled && settings.pinHash) {
        // Initial state when PIN is enabled is locked
        setIsLocked(true);
      } else {
        setIsLocked(false);
      }
    } catch (err) {
      console.error('Failed to load user settings:', err);
    } finally {
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    refreshSettings();
  }, [refreshSettings]);

  const lockNow = useCallback(() => {
    if (userSettings?.isPinEnabled) {
      setIsLocked(true);
    }
  }, [userSettings?.isPinEnabled]);

  const resetActivityTimer = useCallback(() => {
    if (activityTimerRef.current) {
      clearTimeout(activityTimerRef.current);
    }
    if (userSettings?.isPinEnabled && userSettings.autoLockMinutes > 0 && !isLocked) {
      activityTimerRef.current = setTimeout(() => {
        setIsLocked(true);
      }, userSettings.autoLockMinutes * 60 * 1000);
    }
  }, [userSettings?.isPinEnabled, userSettings?.autoLockMinutes, isLocked]);

  // Listen to user activity for auto-lock
  useEffect(() => {
    if (!userSettings?.isPinEnabled || userSettings.autoLockMinutes === 0) return;

    const events = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll'];
    const handleActivity = () => resetActivityTimer();

    events.forEach((ev) => window.addEventListener(ev, handleActivity, { passive: true }));
    resetActivityTimer();

    return () => {
      if (activityTimerRef.current) clearTimeout(activityTimerRef.current);
      events.forEach((ev) => window.removeEventListener(ev, handleActivity));
    };
  }, [userSettings?.isPinEnabled, userSettings?.autoLockMinutes, resetActivityTimer]);

  // Lock when page is hidden (switching apps on mobile)
  useEffect(() => {
    if (!userSettings?.isPinEnabled) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        setIsLocked(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [userSettings?.isPinEnabled]);

  const unlockWithPin = async (pin: string): Promise<boolean> => {
    if (!userSettings?.pinHash || !userSettings?.pinSalt) return false;
    const isValid = await verifyPin(pin, userSettings.pinSalt, userSettings.pinHash);
    if (isValid) {
      setIsLocked(false);
      resetActivityTimer();
      return true;
    }
    return false;
  };

  const configurePin = async (newPin: string): Promise<boolean> => {
    try {
      const salt = generateSalt(16);
      const hash = await hashPin(newPin, salt);
      if (!userSettings?.id) return false;

      await db.userSettings.update(userSettings.id, {
        isPinEnabled: true,
        pinHash: hash,
        pinSalt: salt,
      });

      await refreshSettings();
      setIsLocked(false);
      return true;
    } catch (err) {
      console.error('Failed to configure PIN:', err);
      return false;
    }
  };

  const disablePin = async (currentPin: string): Promise<boolean> => {
    if (!userSettings?.pinHash || !userSettings?.pinSalt || !userSettings?.id) return false;
    const isValid = await verifyPin(currentPin, userSettings.pinSalt, userSettings.pinHash);
    if (!isValid) return false;

    await db.userSettings.update(userSettings.id, {
      isPinEnabled: false,
      pinHash: undefined,
      pinSalt: undefined,
    });

    await refreshSettings();
    setIsLocked(false);
    return true;
  };

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FBFBF9] dark:bg-[#121413]">
        <div className="animate-pulse text-sm font-medium text-stone-500 tracking-wider uppercase">
          Kakeibo
        </div>
      </div>
    );
  }

  return (
    <SecurityContext.Provider
      value={{
        isLocked,
        isPinConfigured: Boolean(userSettings?.isPinEnabled && userSettings?.pinHash),
        userSettings,
        unlockWithPin,
        lockNow,
        configurePin,
        disablePin,
        refreshSettings,
      }}
    >
      {children}
    </SecurityContext.Provider>
  );
}

export function useSecurity() {
  const context = useContext(SecurityContext);
  if (!context) {
    throw new Error('useSecurity must be used within a SecurityProvider');
  }
  return context;
}
