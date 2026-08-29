import { NextResponse } from 'next/server';
import { sql } from '@/lib/neon';
import { hashPassword, createSessionToken, COOKIE_NAME } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface RegisterRequestBody {
  email?: string;
  password?: string;
  name?: string;
  initialData?: {
    userSettings?: {
      currency?: string;
      customCategories?: Record<string, string[]>;
      customIncomeCategories?: string[];
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
  };
}

export async function POST(req: Request) {
  try {
    const body: RegisterRequestBody = await req.json();
    const { email, password, name, initialData } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email et mot de passe requis' },
        { status: 400 }
      );
    }

    const trimmedEmail = email.trim().toLowerCase();
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Le mot de passe doit contenir au moins 6 caractères' },
        { status: 400 }
      );
    }

    // Check if email already registered
    const existingUsers = await sql`SELECT id FROM users WHERE email = ${trimmedEmail} LIMIT 1`;
    if (existingUsers.length > 0) {
      return NextResponse.json(
        { error: 'Un compte existe déjà avec cette adresse email' },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const userName = name?.trim() || trimmedEmail.split('@')[0];

    // Create user
    const insertedUser = await sql`
      INSERT INTO users (email, password_hash, name)
      VALUES (${trimmedEmail}, ${passwordHash}, ${userName})
      RETURNING id, email, name
    `;

    const newUser = insertedUser[0];
    const userId = newUser.id as string;

    // Create user settings
    const currency = initialData?.userSettings?.currency || 'XOF';
    const customCategories = JSON.stringify(initialData?.userSettings?.customCategories || {});
    const customIncomeCategories = JSON.stringify(initialData?.userSettings?.customIncomeCategories || []);

    await sql`
      INSERT INTO user_settings (user_id, currency, custom_categories, custom_income_categories)
      VALUES (${userId}, ${currency}, ${customCategories}::jsonb, ${customIncomeCategories}::jsonb)
      ON CONFLICT (user_id) DO NOTHING
    `;

    // If migrating local data on registration
    if (initialData) {
      if (initialData.monthlyBudgets && initialData.monthlyBudgets.length > 0) {
        for (const b of initialData.monthlyBudgets) {
          await sql`
            INSERT INTO monthly_budgets (user_id, month, fixed_incomes, extra_incomes, fixed_expenses, target_savings, notes)
            VALUES (${userId}, ${b.month}, ${b.fixedIncomes}, ${b.extraIncomes}, ${b.fixedExpenses}, ${b.targetSavings}, ${b.notes || null})
            ON CONFLICT (user_id, month) DO UPDATE SET
              fixed_incomes = EXCLUDED.fixed_incomes,
              extra_incomes = EXCLUDED.extra_incomes,
              fixed_expenses = EXCLUDED.fixed_expenses,
              target_savings = EXCLUDED.target_savings,
              notes = EXCLUDED.notes
          `;
        }
      }

      if (initialData.transactions && initialData.transactions.length > 0) {
        for (const t of initialData.transactions) {
          await sql`
            INSERT INTO transactions (user_id, month, date, amount, type, pillar, category, description, is_recurring)
            VALUES (${userId}, ${t.month}, ${t.date}, ${t.amount}, ${t.type}, ${t.pillar || null}, ${t.category}, ${t.description || null}, ${t.isRecurring || false})
          `;
        }
      }

      if (initialData.savingsGoals && initialData.savingsGoals.length > 0) {
        for (const g of initialData.savingsGoals) {
          await sql`
            INSERT INTO savings_goals (user_id, title, target_amount, current_amount, deadline, icon_key, color_hex)
            VALUES (${userId}, ${g.title}, ${g.targetAmount}, ${g.currentAmount}, ${g.deadline || null}, ${g.iconKey || 'Target'}, ${g.colorHex || '#059669'})
          `;
        }
      }

      if (initialData.debtsAndLoans && initialData.debtsAndLoans.length > 0) {
        for (const d of initialData.debtsAndLoans) {
          await sql`
            INSERT INTO debts_and_loans (user_id, type, title, contact_name, total_amount, paid_amount, monthly_payment, duration_months, interest_rate, total_interest, due_date, day_of_month, notes, status)
            VALUES (${userId}, ${d.type}, ${d.title}, ${d.contactName}, ${d.totalAmount}, ${d.paidAmount}, ${d.monthlyPayment || null}, ${d.durationMonths || null}, ${d.interestRate || null}, ${d.totalInterest || null}, ${d.dueDate || null}, ${d.dayOfMonth || null}, ${d.notes || null}, ${d.status || 'active'})
          `;
        }
      }

      if (initialData.recurringItems && initialData.recurringItems.length > 0) {
        for (const r of initialData.recurringItems) {
          await sql`
            INSERT INTO recurring_items (user_id, title, amount, type, pillar, category, day_of_month, is_active)
            VALUES (${userId}, ${r.title}, ${r.amount}, ${r.type}, ${r.pillar || null}, ${r.category}, ${r.dayOfMonth}, ${r.isActive})
          `;
        }
      }

      if (initialData.wishlistItems && initialData.wishlistItems.length > 0) {
        for (const w of initialData.wishlistItems) {
          await sql`
            INSERT INTO wishlist_items (user_id, title, amount, pillar, category, reflection_expires_at, status, notes)
            VALUES (${userId}, ${w.title}, ${w.amount}, ${w.pillar}, ${w.category}, ${w.reflectionExpiresAt}, ${w.status || 'pending'}, ${w.notes || null})
          `;
        }
      }
    }

    // Generate Session JWT
    const token = await createSessionToken({
      userId,
      email: newUser.email as string,
      name: newUser.name as string,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        userId,
        email: newUser.email,
        name: newUser.name,
      },
    });

    response.cookies.set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Error in /api/auth/register:', error);
    return NextResponse.json(
      { error: 'Une erreur est survenue lors de la création du compte' },
      { status: 500 }
    );
  }
}
