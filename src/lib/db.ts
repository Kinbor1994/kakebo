import Dexie, { type Table } from 'dexie';
import {
  type MonthlyBudget,
  type Transaction,
  type Reflection,
  type SavingsGoal,
  type RecurringItem,
  type WishlistItem,
  type DebtOrLoan,
  type SavingsChallenge,
  type UserSettings,
  PILLARS_CONFIG,
  DEFAULT_INCOME_CATEGORIES,
} from '@/types/kakebo';

export class KakeiboDatabase extends Dexie {
  monthlyBudgets!: Table<MonthlyBudget, number>;
  transactions!: Table<Transaction, number>;
  reflections!: Table<Reflection, number>;
  savingsGoals!: Table<SavingsGoal, number>;
  recurringItems!: Table<RecurringItem, number>;
  wishlistItems!: Table<WishlistItem, number>;
  debtsAndLoans!: Table<DebtOrLoan, number>;
  savingsChallenges!: Table<SavingsChallenge, number>;
  userSettings!: Table<UserSettings, number>;

  constructor() {
    super('KakeiboDB');

    this.version(1).stores({
      monthlyBudgets: '++id, &month, createdAt',
      transactions: '++id, month, date, type, pillar, category, savingsGoalId, createdAt',
      reflections: '++id, &periodKey, periodType, month, createdAt',
      savingsGoals: '++id, title, deadline, createdAt',
      recurringItems: '++id, type, pillar, dayOfMonth, isActive',
      userSettings: '++id',
    });

    this.version(2).stores({
      monthlyBudgets: '++id, &month, createdAt',
      transactions: '++id, month, date, type, pillar, category, savingsGoalId, createdAt',
      reflections: '++id, &periodKey, periodType, month, createdAt',
      savingsGoals: '++id, title, deadline, createdAt',
      recurringItems: '++id, type, pillar, dayOfMonth, isActive',
      wishlistItems: '++id, status, pillar, createdAt',
      debtsAndLoans: '++id, type, status, dueDate, createdAt',
      savingsChallenges: '++id, month, type, status',
    });

    const tables = [
      this.monthlyBudgets,
      this.transactions,
      this.reflections,
      this.savingsGoals,
      this.recurringItems,
      this.wishlistItems,
      this.debtsAndLoans,
      this.savingsChallenges,
      this.userSettings,
    ];

    tables.forEach((table) => {
      table.hook('creating', () => {
        setTimeout(triggerDatabaseChange, 0);
      });
      table.hook('updating', () => {
        setTimeout(triggerDatabaseChange, 0);
      });
      table.hook('deleting', () => {
        setTimeout(triggerDatabaseChange, 0);
      });
    });
  }
}

type ChangeListener = () => void;
const changeListeners: Set<ChangeListener> = new Set();
let isSyncingFromCloud = false;

export function setSyncingFromCloud(status: boolean) {
  isSyncingFromCloud = status;
}

export function onDatabaseChange(listener: ChangeListener): () => void {
  changeListeners.add(listener);
  return () => {
    changeListeners.delete(listener);
  };
}

function triggerDatabaseChange() {
  if (isSyncingFromCloud) return;
  changeListeners.forEach((fn) => {
    try {
      fn();
    } catch (err) {
      console.error('Error in database change listener:', err);
    }
  });
}

export const db = new KakeiboDatabase();

/**
 * Initializes default user settings in French with F CFA (XOF) and custom categories
 */
export async function getOrCreateUserSettings(): Promise<UserSettings> {
  const existing = await db.userSettings.toCollection().first();
  if (existing) {
    let needsUpdate = false;
    const updates: Partial<UserSettings> = {};

    if (existing.currency === 'EUR') {
      updates.currency = 'XOF';
      needsUpdate = true;
    }

    if (!existing.customIncomeCategories || existing.customIncomeCategories.length === 0) {
      updates.customIncomeCategories = [...DEFAULT_INCOME_CATEGORIES];
      needsUpdate = true;
    }

    if (!existing.customCategories || !existing.customCategories.needs) {
      updates.customCategories = {
        needs: [...PILLARS_CONFIG.needs.defaultCategories],
        wants: [...PILLARS_CONFIG.wants.defaultCategories],
        culture: [...PILLARS_CONFIG.culture.defaultCategories],
        unexpected: [...PILLARS_CONFIG.unexpected.defaultCategories],
      };
      needsUpdate = true;
    }

    if (needsUpdate && existing.id) {
      await db.userSettings.update(existing.id, updates);
      return { ...existing, ...updates };
    }

    return existing;
  }

  const defaultSettings: UserSettings = {
    currency: 'XOF',
    isPinEnabled: false,
    autoLockMinutes: 2,
    userName: '',
    theme: 'light',
    customCategories: {
      needs: [...PILLARS_CONFIG.needs.defaultCategories],
      wants: [...PILLARS_CONFIG.wants.defaultCategories],
      culture: [...PILLARS_CONFIG.culture.defaultCategories],
      unexpected: [...PILLARS_CONFIG.unexpected.defaultCategories],
    },
    customIncomeCategories: [...DEFAULT_INCOME_CATEGORIES],
  };

  const id = await db.userSettings.add(defaultSettings);
  return { ...defaultSettings, id };
}

/**
 * Checks and applies active recurring items for a given month if not already created
 */
export async function applyRecurringItemsForMonth(month: string): Promise<void> {
  const recurringItems = await db.recurringItems.where('isActive').equals(1).toArray();
  if (recurringItems.length === 0) return;

  for (const item of recurringItems) {
    const dayStr = String(item.dayOfMonth).padStart(2, '0');
    const dateStr = `${month}-${dayStr}`;

    const existing = await db.transactions
      .where('month')
      .equals(month)
      .filter((t) => t.isRecurring === true && t.category === item.category && t.description === item.title)
      .first();

    if (!existing) {
      await db.transactions.add({
        month,
        date: dateStr,
        amount: item.amount,
        type: item.type,
        pillar: item.pillar,
        category: item.category,
        description: item.title,
        isRecurring: true,
        createdAt: new Date().toISOString(),
      });
    }
  }
}
