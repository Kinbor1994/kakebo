import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { sql } from '@/lib/neon';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sessionUser = await getAuthenticatedUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const userId = sessionUser.userId;

    // Fetch all entities for this user in parallel
    const [
      settingsRows,
      budgetsRows,
      transactionsRows,
      reflectionsRows,
      goalsRows,
      recurringRows,
      wishlistRows,
      debtsRows,
    ] = await Promise.all([
      sql`SELECT * FROM user_settings WHERE user_id = ${userId} LIMIT 1`,
      sql`SELECT * FROM monthly_budgets WHERE user_id = ${userId}`,
      sql`SELECT * FROM transactions WHERE user_id = ${userId}`,
      sql`SELECT * FROM reflections WHERE user_id = ${userId}`,
      sql`SELECT * FROM savings_goals WHERE user_id = ${userId}`,
      sql`SELECT * FROM recurring_items WHERE user_id = ${userId}`,
      sql`SELECT * FROM wishlist_items WHERE user_id = ${userId}`,
      sql`SELECT * FROM debts_and_loans WHERE user_id = ${userId}`,
    ]);

    const userSettings = settingsRows[0] || null;

    return NextResponse.json({
      success: true,
      data: {
        userSettings: userSettings
          ? {
              currency: userSettings.currency,
              customCategories: userSettings.custom_categories || {},
              customIncomeCategories: userSettings.custom_income_categories || [],
              biometricsEnabled: userSettings.biometrics_enabled,
              pinHash: userSettings.pin_hash,
              pinSalt: userSettings.pin_salt,
            }
          : null,
        monthlyBudgets: budgetsRows.map((b) => ({
          month: b.month,
          fixedIncomes: Number(b.fixed_incomes) || 0,
          extraIncomes: Number(b.extra_incomes) || 0,
          fixedExpenses: Number(b.fixed_expenses) || 0,
          targetSavings: Number(b.target_savings) || 0,
          notes: b.notes || undefined,
        })),
        transactions: transactionsRows.map((t) => ({
          month: t.month,
          date: t.date,
          amount: Number(t.amount) || 0,
          type: t.type,
          pillar: t.pillar || undefined,
          category: t.category,
          description: t.description || undefined,
          isRecurring: Boolean(t.is_recurring),
          createdAt: t.created_at,
        })),
        reflections: reflectionsRows.map((r) => ({
          periodType: r.period_type,
          periodKey: r.period_key,
          month: r.month,
          spentTotal: Number(r.spent_total) || 0,
          savedTotal: Number(r.saved_total) || 0,
          targetAchieved: Boolean(r.target_achieved),
          answers: r.answers || {},
        })),
        savingsGoals: goalsRows.map((g) => ({
          title: g.title,
          targetAmount: Number(g.target_amount) || 0,
          currentAmount: Number(g.current_amount) || 0,
          deadline: g.deadline || undefined,
          iconKey: g.icon_key,
          colorHex: g.color_hex,
          createdAt: g.created_at,
        })),
        recurringItems: recurringRows.map((r) => ({
          title: r.title,
          amount: Number(r.amount) || 0,
          type: r.type,
          pillar: r.pillar || undefined,
          category: r.category,
          dayOfMonth: Number(r.day_of_month),
          isActive: Boolean(r.is_active),
        })),
        wishlistItems: wishlistRows.map((w) => ({
          title: w.title,
          amount: Number(w.amount) || 0,
          pillar: w.pillar,
          category: w.category,
          reflectionExpiresAt: w.reflection_expires_at,
          status: w.status,
          notes: w.notes || undefined,
          createdAt: w.created_at,
        })),
        debtsAndLoans: debtsRows.map((d) => ({
          type: d.type,
          title: d.title,
          contactName: d.contact_name,
          totalAmount: Number(d.total_amount) || 0,
          paidAmount: Number(d.paid_amount) || 0,
          monthlyPayment: d.monthly_payment ? Number(d.monthly_payment) : undefined,
          durationMonths: d.duration_months ? Number(d.duration_months) : undefined,
          interestRate: d.interest_rate ? Number(d.interest_rate) : undefined,
          totalInterest: d.total_interest ? Number(d.total_interest) : undefined,
          dueDate: d.due_date || undefined,
          dayOfMonth: d.day_of_month ? Number(d.day_of_month) : undefined,
          notes: d.notes || undefined,
          status: d.status,
          createdAt: d.created_at,
        })),
      },
    });
  } catch (error) {
    console.error('Error in /api/sync/pull:', error);
    return NextResponse.json(
      { error: 'Erreur lors du téléchargement des données' },
      { status: 500 }
    );
  }
}
