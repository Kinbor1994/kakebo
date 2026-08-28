import { db } from '@/lib/db';
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
} from '@/types/kakebo';

export interface BackupData {
  version: number;
  exportedAt: string;
  app: 'kakeibo';
  data: {
    monthlyBudgets: MonthlyBudget[];
    transactions: Transaction[];
    reflections: Reflection[];
    savingsGoals: SavingsGoal[];
    recurringItems: RecurringItem[];
    wishlistItems?: WishlistItem[];
    debtsAndLoans?: DebtOrLoan[];
    savingsChallenges?: SavingsChallenge[];
    userSettings: UserSettings[];
  };
}

export async function createBackupJSON(): Promise<string> {
  const [
    monthlyBudgets,
    transactions,
    reflections,
    savingsGoals,
    recurringItems,
    wishlistItems,
    debtsAndLoans,
    savingsChallenges,
    userSettings,
  ] = await Promise.all([
    db.monthlyBudgets.toArray(),
    db.transactions.toArray(),
    db.reflections.toArray(),
    db.savingsGoals.toArray(),
    db.recurringItems.toArray(),
    db.wishlistItems.toArray(),
    db.debtsAndLoans.toArray(),
    db.savingsChallenges.toArray(),
    db.userSettings.toArray(),
  ]);

  const backup: BackupData = {
    version: 2,
    exportedAt: new Date().toISOString(),
    app: 'kakeibo',
    data: {
      monthlyBudgets,
      transactions,
      reflections,
      savingsGoals,
      recurringItems,
      wishlistItems,
      debtsAndLoans,
      savingsChallenges,
      userSettings,
    },
  };

  return JSON.stringify(backup, null, 2);
}

export async function downloadBackupFile(): Promise<void> {
  const json = await createBackupJSON();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const date = new Date().toISOString().split('T')[0];
  a.href = url;
  a.download = `kakeibo-sauvegarde-${date}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function restoreBackupJSON(jsonString: string): Promise<boolean> {
  try {
    const parsed = JSON.parse(jsonString) as BackupData;
    if (!parsed || parsed.app !== 'kakeibo' || !parsed.data) {
      throw new Error('Format de fichier de sauvegarde Kakeibo invalide.');
    }

    await db.transaction(
      'rw',
      [
        db.monthlyBudgets,
        db.transactions,
        db.reflections,
        db.savingsGoals,
        db.recurringItems,
        db.wishlistItems,
        db.debtsAndLoans,
        db.savingsChallenges,
        db.userSettings,
      ],
      async () => {
        // Clear all existing data
        await Promise.all([
          db.monthlyBudgets.clear(),
          db.transactions.clear(),
          db.reflections.clear(),
          db.savingsGoals.clear(),
          db.recurringItems.clear(),
          db.wishlistItems.clear(),
          db.debtsAndLoans.clear(),
          db.savingsChallenges.clear(),
          db.userSettings.clear(),
        ]);

        // Bulk insert restored data
        if (parsed.data.monthlyBudgets?.length) {
          await db.monthlyBudgets.bulkAdd(parsed.data.monthlyBudgets);
        }
        if (parsed.data.transactions?.length) {
          await db.transactions.bulkAdd(parsed.data.transactions);
        }
        if (parsed.data.reflections?.length) {
          await db.reflections.bulkAdd(parsed.data.reflections);
        }
        if (parsed.data.savingsGoals?.length) {
          await db.savingsGoals.bulkAdd(parsed.data.savingsGoals);
        }
        if (parsed.data.recurringItems?.length) {
          await db.recurringItems.bulkAdd(parsed.data.recurringItems);
        }
        if (parsed.data.wishlistItems?.length) {
          await db.wishlistItems.bulkAdd(parsed.data.wishlistItems);
        }
        if (parsed.data.debtsAndLoans?.length) {
          await db.debtsAndLoans.bulkAdd(parsed.data.debtsAndLoans);
        }
        if (parsed.data.savingsChallenges?.length) {
          await db.savingsChallenges.bulkAdd(parsed.data.savingsChallenges);
        }
        if (parsed.data.userSettings?.length) {
          await db.userSettings.bulkAdd(parsed.data.userSettings);
        }
      }
    );

    return true;
  } catch (error) {
    console.error('Failed to restore backup:', error);
    throw error;
  }
}

export async function downloadTransactionsCSV(): Promise<void> {
  const transactions = await db.transactions.toArray();
  const headers = ['Date', 'Mois', 'Type', 'Pilier', 'Catégorie', 'Montant', 'Description', 'Récurrent'];

  const rows = transactions.map((t) => [
    t.date,
    t.month,
    t.type === 'income' ? 'Revenu' : 'Dépense',
    t.pillar ? t.pillar : '',
    `"${(t.category || '').replace(/"/g, '""')}"`,
    t.amount.toFixed(2),
    `"${(t.description || '').replace(/"/g, '""')}"`,
    t.isRecurring ? 'Oui' : 'Non',
  ]);

  const csvContent = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const date = new Date().toISOString().split('T')[0];
  a.href = url;
  a.download = `kakeibo-transactions-${date}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
