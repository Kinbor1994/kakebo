import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { sql } from '@/lib/neon';

interface PushSyncBody {
  userSettings?: {
    currency?: string;
    customCategories?: Record<string, string[]>;
    customIncomeCategories?: string[];
    biometricsEnabled?: boolean;
    pinHash?: string | null;
    pinSalt?: string | null;
  };
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
    type: string;
    pillar?: string;
    category: string;
    description?: string;
    isRecurring?: boolean;
  }>;
  reflections?: Array<{
    periodType: string;
    periodKey: string;
    month: string;
    spentTotal: number;
    savedTotal: number;
    targetAchieved: boolean;
    answers: Record<string, unknown>;
  }>;
  savingsGoals?: Array<{
    title: string;
    targetAmount: number;
    currentAmount: number;
    deadline?: string;
    iconKey?: string;
    colorHex?: string;
  }>;
  debtsAndLoans?: Array<{
    type: string;
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
    status?: string;
  }>;
  recurringItems?: Array<{
    title: string;
    amount: number;
    type: string;
    pillar?: string;
    category: string;
    dayOfMonth: number;
    isActive: boolean;
  }>;
  wishlistItems?: Array<{
    title: string;
    amount: number;
    pillar: string;
    category: string;
    reflectionExpiresAt: string;
    status?: string;
    notes?: string;
  }>;
}

export async function POST(req: Request) {
  try {
    const sessionUser = await getAuthenticatedUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const userId = sessionUser.userId;
    const body: PushSyncBody = await req.json();

    // 1. Update user settings
    if (body.userSettings) {
      const currency = body.userSettings.currency || 'XOF';
      const customCategories = JSON.stringify(body.userSettings.customCategories || {});
      const customIncomeCategories = JSON.stringify(body.userSettings.customIncomeCategories || []);
      const biometricsEnabled = Boolean(body.userSettings.biometricsEnabled);
      const pinHash = body.userSettings.pinHash || null;
      const pinSalt = body.userSettings.pinSalt || null;

      await sql`
        INSERT INTO user_settings (user_id, currency, custom_categories, custom_income_categories, biometrics_enabled, pin_hash, pin_salt, updated_at)
        VALUES (${userId}, ${currency}, ${customCategories}::jsonb, ${customIncomeCategories}::jsonb, ${biometricsEnabled}, ${pinHash}, ${pinSalt}, NOW())
        ON CONFLICT (user_id) DO UPDATE SET
          currency = EXCLUDED.currency,
          custom_categories = EXCLUDED.custom_categories,
          custom_income_categories = EXCLUDED.custom_income_categories,
          biometrics_enabled = EXCLUDED.biometrics_enabled,
          pin_hash = EXCLUDED.pin_hash,
          pin_salt = EXCLUDED.pin_salt,
          updated_at = NOW()
      `;
    }

    // 2. Sync Monthly Budgets
    if (body.monthlyBudgets) {
      // Upsert budgets
      for (const b of body.monthlyBudgets) {
        await sql`
          INSERT INTO monthly_budgets (user_id, month, fixed_incomes, extra_incomes, fixed_expenses, target_savings, notes, updated_at)
          VALUES (${userId}, ${b.month}, ${b.fixedIncomes}, ${b.extraIncomes}, ${b.fixedExpenses}, ${b.targetSavings}, ${b.notes || null}, NOW())
          ON CONFLICT (user_id, month) DO UPDATE SET
            fixed_incomes = EXCLUDED.fixed_incomes,
            extra_incomes = EXCLUDED.extra_incomes,
            fixed_expenses = EXCLUDED.fixed_expenses,
            target_savings = EXCLUDED.target_savings,
            notes = EXCLUDED.notes,
            updated_at = NOW()
        `;
      }
    }

    // 3. Sync Transactions (Replace snapshot for full consistency)
    if (body.transactions) {
      await sql`DELETE FROM transactions WHERE user_id = ${userId}`;
      for (const t of body.transactions) {
        await sql`
          INSERT INTO transactions (user_id, month, date, amount, type, pillar, category, description, is_recurring)
          VALUES (${userId}, ${t.month}, ${t.date}, ${t.amount}, ${t.type}, ${t.pillar || null}, ${t.category}, ${t.description || null}, ${t.isRecurring || false})
        `;
      }
    }

    // 4. Sync Reflections
    if (body.reflections) {
      await sql`DELETE FROM reflections WHERE user_id = ${userId}`;
      for (const r of body.reflections) {
        const answersJson = JSON.stringify(r.answers || {});
        await sql`
          INSERT INTO reflections (user_id, period_type, period_key, month, spent_total, saved_total, target_achieved, answers)
          VALUES (${userId}, ${r.periodType}, ${r.periodKey}, ${r.month}, ${r.spentTotal}, ${r.savedTotal}, ${r.targetAchieved}, ${answersJson}::jsonb)
        `;
      }
    }

    // 5. Sync Savings Goals
    if (body.savingsGoals) {
      await sql`DELETE FROM savings_goals WHERE user_id = ${userId}`;
      for (const g of body.savingsGoals) {
        await sql`
          INSERT INTO savings_goals (user_id, title, target_amount, current_amount, deadline, icon_key, color_hex)
          VALUES (${userId}, ${g.title}, ${g.targetAmount}, ${g.currentAmount}, ${g.deadline || null}, ${g.iconKey || 'Target'}, ${g.colorHex || '#059669'})
        `;
      }
    }

    // 6. Sync Debts & Loans
    if (body.debtsAndLoans) {
      await sql`DELETE FROM debts_and_loans WHERE user_id = ${userId}`;
      for (const d of body.debtsAndLoans) {
        await sql`
          INSERT INTO debts_and_loans (user_id, type, title, contact_name, total_amount, paid_amount, monthly_payment, duration_months, interest_rate, total_interest, due_date, day_of_month, notes, status)
          VALUES (${userId}, ${d.type}, ${d.title}, ${d.contactName}, ${d.totalAmount}, ${d.paidAmount}, ${d.monthlyPayment || null}, ${d.durationMonths || null}, ${d.interestRate || null}, ${d.totalInterest || null}, ${d.dueDate || null}, ${d.dayOfMonth || null}, ${d.notes || null}, ${d.status || 'active'})
        `;
      }
    }

    // 7. Sync Recurring Items
    if (body.recurringItems) {
      await sql`DELETE FROM recurring_items WHERE user_id = ${userId}`;
      for (const r of body.recurringItems) {
        await sql`
          INSERT INTO recurring_items (user_id, title, amount, type, pillar, category, day_of_month, is_active)
          VALUES (${userId}, ${r.title}, ${r.amount}, ${r.type}, ${r.pillar || null}, ${r.category}, ${r.dayOfMonth}, ${r.isActive})
        `;
      }
    }

    // 8. Sync Wishlist Items
    if (body.wishlistItems) {
      await sql`DELETE FROM wishlist_items WHERE user_id = ${userId}`;
      for (const w of body.wishlistItems) {
        await sql`
          INSERT INTO wishlist_items (user_id, title, amount, pillar, category, reflection_expires_at, status, notes)
          VALUES (${userId}, ${w.title}, ${w.amount}, ${w.pillar}, ${w.category}, ${w.reflectionExpiresAt}, ${w.status || 'pending'}, ${w.notes || null})
        `;
      }
    }

    return NextResponse.json({ success: true, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Error in /api/sync/push:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la synchronisation vers le cloud' },
      { status: 500 }
    );
  }
}
