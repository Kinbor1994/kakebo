'use client';

import React from 'react';
import { type KakeiboPillar, PILLARS_CONFIG, type Transaction } from '@/types/kakebo';
import { formatCurrency } from '@/lib/utils';
import { ShoppingBag, Sparkles, BookOpen, AlertTriangle } from 'lucide-react';

interface PillarCardProps {
  pillar: KakeiboPillar;
  spent: number;
  percentage: number;
  currency: string;
  transactions: Transaction[];
  onClick?: () => void;
}

const PILLAR_ICONS = {
  needs: ShoppingBag,
  wants: Sparkles,
  culture: BookOpen,
  unexpected: AlertTriangle,
};

export function PillarCard({
  pillar,
  spent,
  percentage,
  currency,
  transactions,
  onClick,
}: PillarCardProps) {
  const config = PILLARS_CONFIG[pillar];
  const Icon = PILLAR_ICONS[pillar];

  // Calculate top categories for this pillar
  const categorySums: Record<string, number> = {};
  transactions
    .filter((t) => t.type === 'expense' && t.pillar === pillar)
    .forEach((t) => {
      categorySums[t.category] = (categorySums[t.category] || 0) + t.amount;
    });

  const sortedCategories = Object.entries(categorySums)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 2);

  const purchaseCount = transactions.filter((t) => t.type === 'expense' && t.pillar === pillar).length;

  return (
    <div
      onClick={onClick}
      className="group relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 transition-all duration-200 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer shadow-xs"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl ${config.badgeClass} border shadow-2xs`}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
              {config.name}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {config.subtitle}
            </p>
          </div>
        </div>

        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${config.badgeClass} border`}
        >
          {percentage}%
        </span>
      </div>

      <div className="mt-3 space-y-1.5">
        <div className="flex items-baseline justify-between">
          <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {formatCurrency(spent, currency)}
          </span>
          <span className="text-[11px] font-medium text-slate-400">
            {purchaseCount} {purchaseCount > 1 ? 'dépenses' : 'dépense'}
          </span>
        </div>

        {/* Smooth progress bar */}
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(100, Math.max(spent > 0 ? 5 : 0, percentage))}%`,
              backgroundColor: config.colorHex,
            }}
          />
        </div>
      </div>

      {/* Top categories tags */}
      {sortedCategories.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1 border-t border-slate-100 dark:border-slate-800/80 pt-2.5">
          {sortedCategories.map(([cat, amt]) => (
            <span
              key={cat}
              className="inline-flex items-center rounded-lg px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800"
            >
              {cat} ({formatCurrency(amt, currency)})
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
