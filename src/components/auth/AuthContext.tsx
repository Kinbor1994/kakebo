'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { db, onDatabaseChange, setSyncingFromCloud } from '@/lib/db';
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

    setSyncingFromCloud(true);
    try {
      // 1. User Settings (Non-destructive update)
    if (cloudData.userSettings) {
      const existingSettings = await db.userSettings.toCollection().first();
      const newSettings: UserSettings = {
        id: existingSettings?.id || 1,
        currency: cloudData.userSettings.currency || existingSettings?.currency || 'XOF',
        customCategories: (cloudData.userSettings.customCategories as Record<KakeiboPillar, string[]>) || existingSettings?.customCategories || {
          needs: PILLARS_CONFIG.needs.defaultCategories,
          wants: PILLARS_CONFIG.wants.defaultCategories,
          culture: PILLARS_CONFIG.culture.defaultCategories,
          unexpected: PILLARS_CONFIG.unexpected.defaultCategories,
        },
        customIncomeCategories: cloudData.userSettings.customIncomeCategories || existingSettings?.customIncomeCategories || DEFAULT_INCOME_CATEGORIES,
        isBiometricEnabled: Boolean(cloudData.userSettings.biometricsEnabled ?? existingSettings?.isBiometricEnabled),
        isPinEnabled: Boolean(cloudData.userSettings.pinHash ?? existingSettings?.pinHash),
        pinHash: cloudData.userSettings.pinHash || existingSettings?.pinHash,
        pinSalt: cloudData.userSettings.pinSalt || existingSettings?.pinSalt,
        autoLockMinutes: existingSettings?.autoLockMinutes || 5,
        theme: existingSettings?.theme || 'system',
      };
      await db.userSettings.put(newSettings);
    }

    // 2. Monthly Budgets (Merge union by month without clearing local months)
    if (cloudData.monthlyBudgets) {
      const localBudgets = await db.monthlyBudgets.toArray();
      const localMap = new Map(localBudgets.map((b) => [b.month, b]));

      for (const b of cloudData.monthlyBudgets) {
        const local = localMap.get(b.month);
        if (local?.id) {
          await db.monthlyBudgets.update(local.id, {
            fixedIncomes: b.fixedIncomes,
            extraIncomes: b.extraIncomes,
            fixedExpenses: b.fixedExpenses,
            targetSavings: b.targetSavings,
            notes: b.notes,
            updatedAt: new Date().toISOString(),
          });
        } else {
          await db.monthlyBudgets.add({
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
    }

    // 3. Transactions (Merge union without clearing local recent transactions)
    if (cloudData.transactions) {
      const localTransactions = await db.transactions.toArray();
      const localSignatures = new Set(
        localTransactions.map(
          (t) => `${t.date}_${t.amount}_${t.type}_${t.category}_${t.description || ''}`
        )
      );

      for (const t of cloudData.transactions) {
        const sig = `${t.date}_${t.amount}_${t.type}_${t.category}_${t.description || ''}`;
        if (!localSignatures.has(sig)) {
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
          localSignatures.add(sig);
        }
      }
    }

    // 4. Reflections (Merge by periodKey)
    if (cloudData.reflections) {
      const localReflections = await db.reflections.toArray();
      const localMap = new Map(localReflections.map((r) => [r.periodKey, r]));

      for (const r of cloudData.reflections) {
        const local = localMap.get(r.periodKey);
        const answers: ReflectionAnswers = {
          spentReview: r.answers?.spentReview || '',
          savingSuccess: r.answers?.savingSuccess || '',
          criticalAssessment: r.answers?.criticalAssessment || '',
          futureCommitment: r.answers?.futureCommitment || '',
        };

        if (local?.id) {
          await db.reflections.update(local.id, {
            spentTotal: r.spentTotal,
            savedTotal: r.savedTotal,
            targetAchieved: r.targetAchieved,
            answers,
          });
        } else {
          await db.reflections.add({
            periodType: r.periodType,
            periodKey: r.periodKey,
            month: r.month,
            spentTotal: r.spentTotal,
            savedTotal: r.savedTotal,
            targetAchieved: r.targetAchieved,
            answers,
            createdAt: new Date().toISOString(),
          });
        }
      }
    }

    // 5. Savings Goals (Merge by title)
    if (cloudData.savingsGoals) {
      const localGoals = await db.savingsGoals.toArray();
      const localMap = new Map(localGoals.map((g) => [g.title.toLowerCase().trim(), g]));

      for (const g of cloudData.savingsGoals) {
        const key = g.title.toLowerCase().trim();
        const local = localMap.get(key);
        if (local?.id) {
          await db.savingsGoals.update(local.id, {
            targetAmount: g.targetAmount,
            currentAmount: g.currentAmount,
            deadline: g.deadline,
            iconKey: g.iconKey,
            colorHex: g.colorHex,
          });
        } else {
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
    }

    // 6. Recurring Items (Merge by title + type + dayOfMonth)
    if (cloudData.recurringItems) {
      const localItems = await db.recurringItems.toArray();
      const localMap = new Map(
        localItems.map((r) => [`${r.title.toLowerCase().trim()}_${r.type}_${r.dayOfMonth}`, r])
      );

      for (const item of cloudData.recurringItems) {
        const key = `${item.title.toLowerCase().trim()}_${item.type}_${item.dayOfMonth}`;
        const local = localMap.get(key);
        if (local?.id) {
          await db.recurringItems.update(local.id, {
            amount: item.amount,
            pillar: item.pillar,
            category: item.category,
            isActive: item.isActive,
          });
        } else {
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
    }

    // 7. Wishlist Items (Merge by title)
    if (cloudData.wishlistItems) {
      const localWishlist = await db.wishlistItems.toArray();
      const localMap = new Map(localWishlist.map((w) => [w.title.toLowerCase().trim(), w]));

      for (const w of cloudData.wishlistItems) {
        const key = w.title.toLowerCase().trim();
        const local = localMap.get(key);
        if (local?.id) {
          await db.wishlistItems.update(local.id, {
            amount: w.amount,
            pillar: w.pillar,
            category: w.category,
            status: w.status,
            notes: w.notes,
          });
        } else {
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
    }

    // 8. Debts & Loans (Merge by title + contactName + type)
    if (cloudData.debtsAndLoans) {
      const localDebts = await db.debtsAndLoans.toArray();
      const localMap = new Map(
        localDebts.map((d) => [
          `${d.title.toLowerCase().trim()}_${d.contactName.toLowerCase().trim()}_${d.type}`,
          d,
        ])
      );

      for (const d of cloudData.debtsAndLoans) {
        const key = `${d.title.toLowerCase().trim()}_${d.contactName.toLowerCase().trim()}_${d.type}`;
        const local = localMap.get(key);
        if (local?.id) {
          await db.debtsAndLoans.update(local.id, {
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
          });
        } else {
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
    }
  } finally {
    setTimeout(() => setSyncingFromCloud(false), 500);
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

  // Initial user check on app mount with bidirectional sync
  useEffect(() => {
    async function checkAuth() {
      try {
        setIsLoading(true);
        const res = await fetch('/api/auth/me');
        const data = await res.json();

        if (data.user) {
          setUser(data.user);
          setSyncStatus('syncing');

          // Pull cloud data on session load and perform intelligent two-way merge
          try {
            const pullRes = await fetch('/api/sync/pull');
            if (pullRes.ok) {
              const pullData = await pullRes.json();
              if (pullData.data) {
                await hydrateLocalDatabase(pullData.data);
                
                // Immediately push merged snapshot back to cloud so Neon has any local additions
                const mergedSnapshot = await getLocalDataSnapshot();
                await fetch('/api/sync/push', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(mergedSnapshot),
                });

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

  // Real-time automatic background sync whenever local Dexie data changes
  useEffect(() => {
    if (!user) return;

    let debounceTimer: NodeJS.Timeout | null = null;

    const unsubscribe = onDatabaseChange(() => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        syncNow();
      }, 1200); // 1.2s debounce to batch consecutive changes smoothly
    });

    return () => {
      unsubscribe();
      if (debounceTimer) clearTimeout(debounceTimer);
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
