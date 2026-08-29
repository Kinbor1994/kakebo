'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/db';
import {
  type UserSettings,
  type KakeiboPillar,
  type ReflectionAnswers,
  PILLARS_CONFIG,
  DEFAULT_INCOME_CATEGORIES,
} from '@/types/kakebo';

export interface AuthUser {
  userId: string;
  email: string;
  name?: string;
  createdAt?: string;
}

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'error' | 'local_only';

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  syncStatus: SyncStatus;
  lastSyncTime: Date | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (
    email: string,
    password: string,
    name?: string,
    migrateLocalData?: boolean
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  syncNow: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('local_only');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Collect local Dexie data snapshot
  const getLocalDataSnapshot = useCallback(async () => {
    const [
      userSettings,
      monthlyBudgets,
      transactions,
      reflections,
      savingsGoals,
      recurringItems,
      wishlistItems,
      debtsAndLoans,
    ] = await Promise.all([
      db.userSettings.toCollection().first(),
      db.monthlyBudgets.toArray(),
      db.transactions.toArray(),
      db.reflections.toArray(),
      db.savingsGoals.toArray(),
      db.recurringItems.toArray(),
      db.wishlistItems.toArray(),
      db.debtsAndLoans.toArray(),
    ]);

    return {
      userSettings: userSettings
        ? {
            currency: userSettings.currency,
            customCategories: userSettings.customCategories,
            customIncomeCategories: userSettings.customIncomeCategories,
            biometricsEnabled: userSettings.isBiometricEnabled,
            pinHash: userSettings.pinHash,
            pinSalt: userSettings.pinSalt,
          }
        : undefined,
      monthlyBudgets,
      transactions,
      reflections,
      savingsGoals,
      recurringItems,
      wishlistItems,
      debtsAndLoans,
    };
  }, []);

  // Hydrate local Dexie database from cloud data payload
  const hydrateLocalDatabase = useCallback(async (cloudData: {
    userSettings?: {
      currency?: string;
      customCategories?: Record<string, string[]>;
      customIncomeCategories?: string[];
      biometricsEnabled?: boolean;
      pinHash?: string | null;
      pinSalt?: string | null;
    } | null;
    monthlyBudgets?: Array<{
      month: string;
      fixedIncomes: number;
      extraIncomes: number;
      fixedExpenses: number;
      targetSavings: number;
      notes?: string;
    }>;
    transactions?: Array<{
      month: string;
      date: string;
      amount: number;
      type: 'expense' | 'income';
      pillar?: 'needs' | 'wants' | 'culture' | 'unexpected';
      category: string;
      description?: string;
      isRecurring?: boolean;
      createdAt?: string;
    }>;
    reflections?: Array<{
      periodType: 'monthly' | 'weekly';
      periodKey: string;
      month: string;
      spentTotal: number;
      savedTotal: number;
      targetAchieved: boolean;
      answers: Partial<ReflectionAnswers>;
    }>;
    savingsGoals?: Array<{
      title: string;
      targetAmount: number;
      currentAmount: number;
      deadline?: string;
      iconKey: 'Target' | 'Shield' | 'Compass' | 'Home' | 'Car' | 'Heart' | 'Laptop' | 'Sun';
      colorHex: string;
      createdAt: string;
    }>;
    recurringItems?: Array<{
      title: string;
      amount: number;
      type: 'expense' | 'income';
      pillar?: 'needs' | 'wants' | 'culture' | 'unexpected';
      category: string;
      dayOfMonth: number;
      isActive: boolean;
      createdAt?: string;
    }>;
    wishlistItems?: Array<{
      title: string;
      amount: number;
      pillar: 'needs' | 'wants' | 'culture' | 'unexpected';
      category: string;
      reflectionExpiresAt: string;
      status: 'pending' | 'bought' | 'abandoned';
      notes?: string;
      createdAt: string;
    }>;
    debtsAndLoans?: Array<{
      type: 'bank_loan' | 'tontine' | 'lent' | 'borrowed';
      title: string;
      contactName: string;
      totalAmount: number;
      paidAmount: number;
      monthlyPayment?: number;
      durationMonths?: number;
      interestRate?: number;
      totalInterest?: number;
      dueDate?: string;
      dayOfMonth?: number;
      notes?: string;
      status: 'active' | 'settled';
      createdAt: string;
    }>;
  }) => {
    if (!cloudData) return;

    if (cloudData.userSettings) {
      const existingSettings = await db.userSettings.toCollection().first();
      const newSettings: UserSettings = {
        id: existingSettings?.id || 1,
        currency: cloudData.userSettings.currency || 'XOF',
        customCategories: (cloudData.userSettings.customCategories as Record<KakeiboPillar, string[]>) || {
          needs: PILLARS_CONFIG.needs.defaultCategories,
          wants: PILLARS_CONFIG.wants.defaultCategories,
          culture: PILLARS_CONFIG.culture.defaultCategories,
          unexpected: PILLARS_CONFIG.unexpected.defaultCategories,
        },
        customIncomeCategories: cloudData.userSettings.customIncomeCategories || DEFAULT_INCOME_CATEGORIES,
        isBiometricEnabled: Boolean(cloudData.userSettings.biometricsEnabled),
        isPinEnabled: Boolean(cloudData.userSettings.pinHash),
        pinHash: cloudData.userSettings.pinHash || undefined,
        pinSalt: cloudData.userSettings.pinSalt || undefined,
        autoLockMinutes: existingSettings?.autoLockMinutes || 5,
        theme: existingSettings?.theme || 'system',
      };
      await db.userSettings.put(newSettings);
    }

    if (cloudData.monthlyBudgets) {
      await db.monthlyBudgets.clear();
      for (const b of cloudData.monthlyBudgets) {
        await db.monthlyBudgets.put({
          month: b.month,
          fixedIncomes: b.fixedIncomes,
          extraIncomes: b.extraIncomes,
          fixedExpenses: b.fixedExpenses,
          targetSavings: b.targetSavings,
          notes: b.notes,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }

    if (cloudData.transactions) {
      await db.transactions.clear();
      for (const t of cloudData.transactions) {
        await db.transactions.add({
          month: t.month,
          date: t.date,
          amount: t.amount,
          type: t.type,
          pillar: t.pillar,
          category: t.category,
          description: t.description,
          isRecurring: t.isRecurring,
          createdAt: t.createdAt || new Date().toISOString(),
        });
      }
    }

    if (cloudData.reflections) {
      await db.reflections.clear();
      for (const r of cloudData.reflections) {
        await db.reflections.add({
          periodType: r.periodType,
          periodKey: r.periodKey,
          month: r.month,
          spentTotal: r.spentTotal,
          savedTotal: r.savedTotal,
          targetAchieved: r.targetAchieved,
          answers: {
            spentReview: r.answers?.spentReview || '',
            savingSuccess: r.answers?.savingSuccess || '',
            criticalAssessment: r.answers?.criticalAssessment || '',
            futureCommitment: r.answers?.futureCommitment || '',
          },
          createdAt: new Date().toISOString(),
        });
      }
    }

    if (cloudData.savingsGoals) {
      await db.savingsGoals.clear();
      for (const g of cloudData.savingsGoals) {
        await db.savingsGoals.add({
          title: g.title,
          targetAmount: g.targetAmount,
          currentAmount: g.currentAmount,
          deadline: g.deadline,
          iconKey: g.iconKey,
          colorHex: g.colorHex,
          createdAt: g.createdAt || new Date().toISOString(),
        });
      }
    }

    if (cloudData.recurringItems) {
      await db.recurringItems.clear();
      for (const item of cloudData.recurringItems) {
        await db.recurringItems.add({
          title: item.title,
          amount: item.amount,
          type: item.type,
          pillar: item.pillar,
          category: item.category,
          dayOfMonth: item.dayOfMonth,
          isActive: item.isActive,
          createdAt: item.createdAt || new Date().toISOString(),
        });
      }
    }

    if (cloudData.wishlistItems) {
      await db.wishlistItems.clear();
      for (const w of cloudData.wishlistItems) {
        await db.wishlistItems.add({
          title: w.title,
          amount: w.amount,
          pillar: w.pillar,
          category: w.category,
          reflectionExpiresAt: w.reflectionExpiresAt,
          status: w.status,
          notes: w.notes,
          createdAt: w.createdAt || new Date().toISOString(),
        });
      }
    }

    if (cloudData.debtsAndLoans) {
      await db.debtsAndLoans.clear();
      for (const d of cloudData.debtsAndLoans) {
        await db.debtsAndLoans.add({
          type: d.type,
          title: d.title,
          contactName: d.contactName,
          totalAmount: d.totalAmount,
          paidAmount: d.paidAmount,
          monthlyPayment: d.monthlyPayment,
          durationMonths: d.durationMonths,
          interestRate: d.interestRate,
          totalInterest: d.totalInterest,
          dueDate: d.dueDate,
          dayOfMonth: d.dayOfMonth,
          notes: d.notes,
          status: d.status,
          createdAt: d.createdAt || new Date().toISOString(),
        });
      }
    }
  }, []);

  // Sync with Cloud Neon DB
  const syncNow = useCallback(async (): Promise<boolean> => {
    if (!user) {
      setSyncStatus('local_only');
      return false;
    }

    if (!navigator.onLine) {
      setSyncStatus('offline');
      return false;
    }

    try {
      setSyncStatus('syncing');

      // 1. Push local changes to cloud
      const localSnapshot = await getLocalDataSnapshot();
      const pushRes = await fetch('/api/sync/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(localSnapshot),
      });

      if (!pushRes.ok) {
        throw new Error('Push sync failed');
      }

      setLastSyncTime(new Date());
      setSyncStatus('synced');
      return true;
    } catch (err) {
      console.error('Error during syncNow:', err);
      setSyncStatus('error');
      return false;
    }
  }, [user, getLocalDataSnapshot]);

  // Initial user check on app mount
  useEffect(() => {
    async function checkAuth() {
      try {
        setIsLoading(true);
        const res = await fetch('/api/auth/me');
        const data = await res.json();

        if (data.user) {
          setUser(data.user);
          setSyncStatus('syncing');

          // Pull cloud data on session load
          try {
            const pullRes = await fetch('/api/sync/pull');
            if (pullRes.ok) {
              const pullData = await pullRes.json();
              if (pullData.data) {
                // If cloud has data, hydrate local DB
                const hasCloudData =
                  (pullData.data.transactions && pullData.data.transactions.length > 0) ||
                  (pullData.data.monthlyBudgets && pullData.data.monthlyBudgets.length > 0) ||
                  (pullData.data.savingsGoals && pullData.data.savingsGoals.length > 0) ||
                  (pullData.data.debtsAndLoans && pullData.data.debtsAndLoans.length > 0);

                if (hasCloudData) {
                  await hydrateLocalDatabase(pullData.data);
                } else {
                  // If cloud is empty but local has data, initial push
                  const localSnapshot = await getLocalDataSnapshot();
                  await fetch('/api/sync/push', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(localSnapshot),
                  });
                }
                setSyncStatus('synced');
                setLastSyncTime(new Date());
              }
            }
          } catch (syncErr) {
            console.error('Error pulling cloud data on init:', syncErr);
            setSyncStatus('error');
          }
        } else {
          setUser(null);
          setSyncStatus('local_only');
        }
      } catch (err) {
        console.error('Error checking auth:', err);
        setUser(null);
        setSyncStatus('local_only');
      } finally {
        setIsLoading(false);
      }
    }

    checkAuth();
  }, [hydrateLocalDatabase, getLocalDataSnapshot]);

  // Listen to network online/offline events
  useEffect(() => {
    const handleOnline = () => {
      if (user) {
        syncNow();
      }
    };
    const handleOffline = () => {
      setSyncStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user, syncNow]);

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Identifiants invalides' };
      }

      setUser(data.user);

      // Hydrate from cloud on login
      const pullRes = await fetch('/api/sync/pull');
      if (pullRes.ok) {
        const pullData = await pullRes.json();
        if (pullData.data) {
          await hydrateLocalDatabase(pullData.data);
          setSyncStatus('synced');
          setLastSyncTime(new Date());
        }
      }

      return { success: true };
    } catch {
      return { success: false, error: 'Erreur réseau lors de la connexion' };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (
    email: string,
    password: string,
    name?: string,
    migrateLocalData: boolean = true
  ) => {
    try {
      setIsLoading(true);
      const localData = migrateLocalData ? await getLocalDataSnapshot() : undefined;

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          name,
          initialData: localData,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Erreur lors de la création du compte' };
      }

      setUser(data.user);
      setSyncStatus('synced');
      setLastSyncTime(new Date());
      return { success: true };
    } catch {
      return { success: false, error: 'Erreur réseau lors de la création du compte' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      setSyncStatus('local_only');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        syncStatus,
        lastSyncTime,
        login,
        register,
        logout,
        syncNow,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
