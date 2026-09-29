'use client';

import React from 'react';
import { type FinancialAlert } from '@/lib/financial-engine';
import { AlertTriangle, ShieldAlert, Flame } from 'lucide-react';

interface AlertsBannerProps {
  alerts: FinancialAlert[];
}

export function AlertsBanner({ alerts }: AlertsBannerProps) {
  if (!alerts || alerts.length === 0) return null;

  return (
    <section className="space-y-2" aria-label="Alertes budgétaires">
      {alerts.map((alert) => {
        const isCritical = alert.severity === 'danger';
        const Icon =
          alert.type === 'negative_balance_overdraft_risk'
            ? Flame
            : alert.type === 'liquid_below_safety_threshold'
            ? ShieldAlert
            : AlertTriangle;

        return (
          <div
            key={alert.id}
            className={`flex items-start space-x-3 rounded-2xl border p-3.5 shadow-2xs transition ${
              isCritical
                ? 'border-rose-300 dark:border-rose-900/70 bg-rose-50/90 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200'
                : 'border-amber-300 dark:border-amber-900/70 bg-amber-50/90 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200'
            }`}
          >
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                isCritical
                  ? 'bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-300'
                  : 'bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-300'
              }`}
            >
              <Icon className="h-4 w-4" />
            </div>

            <div className="min-w-0 flex-1 space-y-0.5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-extrabold tracking-tight">{alert.title}</h3>
                <span
                  className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                    isCritical
                      ? 'bg-rose-200/80 dark:bg-rose-900 text-rose-800 dark:text-rose-200'
                      : 'bg-amber-200/80 dark:bg-amber-900 text-amber-800 dark:text-amber-200'
                  }`}
                >
                  {isCritical ? 'Critique' : 'Vigilance'}
                </span>
              </div>
              <p className="text-[11px] leading-relaxed opacity-90">{alert.message}</p>
            </div>
          </div>
        );
      })}
    </section>
  );
}
