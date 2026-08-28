export type KakeiboPillar = 'needs' | 'wants' | 'culture' | 'unexpected';

export type TransactionType = 'income' | 'expense';

export type ReflectionPeriodType = 'weekly' | 'monthly';

export interface PillarMeta {
  id: KakeiboPillar;
  name: string;
  subtitle: string;
  description: string;
  colorHex: string;
  lightBgHex: string;
  badgeClass: string;
  borderClass: string;
  textClass: string;
  bgClass: string;
  iconName: 'ShoppingBag' | 'Sparkles' | 'BookOpen' | 'AlertTriangle';
  defaultCategories: string[];
}

export const DEFAULT_INCOME_CATEGORIES: string[] = [
  'Salaire & Revenu principal',
  'Prime & Bonus',
  'Vente d\'occasion',
  'Remboursement perçu',
  'Aide ou Don familial',
  'Revenu locatif / Investissement',
  'Autre revenu',
];

export const PILLARS_CONFIG: Record<KakeiboPillar, PillarMeta> = {
  needs: {
    id: 'needs',
    name: 'Besoins essentiels',
    subtitle: 'Vie courante & indispensable',
    description: 'Dépenses vitales indispensables (nourriture, logement, transport, santé, prêts)',
    colorHex: '#059669',
    lightBgHex: '#ECFDF5',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
    borderClass: 'border-emerald-100 dark:border-emerald-900/40',
    textClass: 'text-emerald-700 dark:text-emerald-400',
    bgClass: 'bg-emerald-50/60 dark:bg-emerald-950/20',
    iconName: 'ShoppingBag',
    defaultCategories: [
      'Alimentation & Courses',
      'Loyer & Logement',
      'Prêt Bancaire & Crédit',
      'Factures (Électricité, Eau)',
      'Santé & Pharmacie',
      'Transport & Carburant',
      'Télécoms & Internet',
    ],
  },
  wants: {
    id: 'wants',
    name: 'Envies & Plaisirs',
    subtitle: 'Loisirs & sorties',
    description: 'Achats plaisir, sorties, restaurants et envies personnelles',
    colorHex: '#E11D48',
    lightBgHex: '#FFF1F2',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
    borderClass: 'border-rose-100 dark:border-rose-900/40',
    textClass: 'text-rose-700 dark:text-rose-400',
    bgClass: 'bg-rose-50/60 dark:bg-rose-950/20',
    iconName: 'Sparkles',
    defaultCategories: [
      'Restaurants & Maquis',
      'Sorties & Détente',
      'Shopping & Vêtements',
      'Cadeaux & Friandises',
      'Loisirs & Soirées',
    ],
  },
  culture: {
    id: 'culture',
    name: 'Culture & Formation',
    subtitle: 'Développement personnel',
    description: 'Livres, apprentissage, formations et enrichissement personnel',
    colorHex: '#D97706',
    lightBgHex: '#FFFBEB',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
    borderClass: 'border-amber-100 dark:border-amber-900/40',
    textClass: 'text-amber-700 dark:text-amber-400',
    bgClass: 'bg-amber-50/60 dark:bg-amber-950/20',
    iconName: 'BookOpen',
    defaultCategories: [
      'Livres & Manuels',
      'Formations & Cours',
      'Événements & Conférences',
      'Abonnements éducatifs',
      'Spectacles & Cinéma',
    ],
  },
  unexpected: {
    id: 'unexpected',
    name: 'Imprévus & Extras',
    subtitle: 'Urgences & réparations',
    description: 'Dépenses exceptionnelles, urgences médicales et réparations',
    colorHex: '#2563EB',
    lightBgHex: '#EFF6FF',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200/80 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
    borderClass: 'border-blue-100 dark:border-blue-900/40',
    textClass: 'text-blue-700 dark:text-blue-400',
    bgClass: 'bg-blue-50/60 dark:bg-blue-950/20',
    iconName: 'AlertTriangle',
    defaultCategories: [
      'Réparation urgente (Auto, Moto, Maison)',
      'Frais médicaux imprévus',
      'Aide familiale imprévue',
      'Dépannage d\'urgence',
      'Frais administratifs exceptionnels',
    ],
  },
};

export interface MonthlyBudget {
  id?: number;
  month: string;                // Format 'YYYY-MM'
  fixedIncomes: number;         // Salaires, revenus réguliers
  extraIncomes: number;         // Primes, ventes occasionnelles, aides
  fixedExpenses: number;        // Loyer, factures, charges fixes, prêts
  targetSavings: number;        // Épargne décidée en début de mois
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id?: number;
  month: string;                // Format 'YYYY-MM'
  date: string;                 // Format 'YYYY-MM-DD'
  amount: number;               // Toujours positif
  type: TransactionType;        // 'income' ou 'expense'
  pillar?: KakeiboPillar;       // Requis si expense
  category: string;             // Catégorie précise
  description?: string;         // Note / Marchand
  isRecurring?: boolean;        // Issu d'une récurrence
  savingsGoalId?: number;       // Si associé à un dépôt vers une cagnotte
  createdAt: string;
}

export interface ReflectionAnswers {
  spentReview: string;
  savingSuccess: string;
  criticalAssessment: string;
  futureCommitment: string;
}

export interface Reflection {
  id?: number;
  periodType: ReflectionPeriodType;
  periodKey: string;            // 'YYYY-MM-W1' à 'W5' ou 'YYYY-MM'
  month: string;                // 'YYYY-MM'
  spentTotal: number;
  savedTotal: number;
  targetAchieved: boolean;
  answers: ReflectionAnswers;
  createdAt: string;
}

export interface SavingsGoal {
  id?: number;
  title: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  iconKey: 'Target' | 'Shield' | 'Compass' | 'Home' | 'Car' | 'Heart' | 'Laptop' | 'Sun';
  colorHex: string;
  createdAt: string;
}

export interface RecurringItem {
  id?: number;
  title: string;
  amount: number;
  type: TransactionType;
  pillar?: KakeiboPillar;
  category: string;
  dayOfMonth: number;
  isActive: boolean;
  createdAt: string;
}

// Module Wishlist 48h (Liste de réflexion pour achats non essentiels)
export interface WishlistItem {
  id?: number;
  title: string;
  amount: number;
  pillar: KakeiboPillar;
  category: string;
  createdAt: string;            // ISO String
  reflectionExpiresAt: string;  // createdAt + 48h (ISO String)
  status: 'pending' | 'bought' | 'abandoned';
  notes?: string;
}

// Module Dettes, Créances, Tontines & Prêts Bancaires
export type DebtLoanType = 'bank_loan' | 'tontine' | 'lent' | 'borrowed';

export interface DebtOrLoan {
  id?: number;
  type: DebtLoanType;
  title: string;
  contactName: string;          // Nom de la banque (BOA, Ecobank...) ou contact
  totalAmount: number;          // Montant total du capital emprunté
  paidAmount: number;           // Montant déjà remboursé (amorti)
  monthlyPayment?: number;      // Mensualité fixe en F CFA
  interestRate?: number;        // Taux d'intérêt annuel en %
  dueDate?: string;             // Date d'échéance de fin (YYYY-MM-DD)
  dayOfMonth?: number;          // 1-31 (jour de prélèvement de la mensualité)
  notes?: string;
  status: 'active' | 'settled';
  createdAt: string;
}

// Module Défis d'épargne (No Spend Days, etc.)
export interface SavingsChallenge {
  id?: number;
  type: 'no_spend' | '52_weeks' | 'custom';
  title: string;
  description: string;
  targetCount: number;
  currentCount: number;
  month: string;                // YYYY-MM
  status: 'active' | 'completed';
  createdAt: string;
}

export interface UserSettings {
  id?: number;
  currency: string;
  isPinEnabled: boolean;
  pinHash?: string;
  pinSalt?: string;
  isBiometricEnabled?: boolean;
  biometricCredentialId?: string;
  autoLockMinutes: number;
  userName?: string;
  theme: 'light' | 'dark' | 'system';
  customCategories: Record<KakeiboPillar, string[]>;
  customIncomeCategories: string[];
}

export interface MonthlyStats {
  totalIncome: number;
  totalFixedExpenses: number;
  targetSavings: number;
  allocatedBudget: number;
  totalSpent: number;
  remainingToSpend: number;
  currentSavings: number;
  savingsRatePercentage: number;
  spentByPillar: Record<KakeiboPillar, number>;
  percentageByPillar: Record<KakeiboPillar, number>;
  weeklyBreakdown: Array<{
    weekIndex: number;
    weekLabel: string;
    spent: number;
    budget: number;
  }>;
}
