'use client';

import React, { useState } from 'react';
import { type KakeiboPillar, PILLARS_CONFIG } from '@/types/kakebo';
import { formatCurrency } from '@/lib/utils';
import { ShoppingBag, Sparkles, BookOpen, AlertTriangle } from 'lucide-react';

interface PillarDonutChartProps {
  spentByPillar: Record<KakeiboPillar, number>;
  totalSpent: number;
  currency: string;
}

const PILLAR_ICONS = {
  needs: ShoppingBag,
  wants: Sparkles,
  culture: BookOpen,
  unexpected: AlertTriangle,
};

export function PillarDonutChart({ spentByPillar, totalSpent, currency }: PillarDonutChartProps) {
  const [hoveredPillar, setHoveredPillar] = useState<KakeiboPillar | null>(null);

  const pillars: KakeiboPillar[] = ['needs', 'wants', 'culture', 'unexpected'];

  // Calculate SVG arc paths
  const radius = 70;
  const strokeWidth = 24;
  const circumference = 2 * Math.PI * radius;

  let cumulativePercent = 0;

  const slices = pillars.map((pKey) => {
    const amount = spentByPillar[pKey];
    const percent = totalSpent > 0 ? (amount / totalSpent) * 100 : 0;
    const strokeDasharray = `${(percent / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -((cumulativePercent / 100) * circumference);
    cumulativePercent += percent;

    return {
      pillar: pKey,
      config: PILLARS_CONFIG[pKey],
      amount,
      percent: Math.round(percent),
      strokeDasharray,
      strokeDashoffset,
    };
  });

  const activePillarData = hoveredPillar ? slices.find((s) => s.pillar === hoveredPillar) : null;

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          Répartition des 4 Piliers
        </h3>
        <span className="text-xs font-bold text-slate-500">
          Total : {formatCurrency(totalSpent, currency)}
        </span>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-around gap-6 pt-2">
        {/* SVG Donut */}
        <div className="relative flex items-center justify-center">
          <svg width="180" height="180" viewBox="0 0 200 200" className="-rotate-90">
            {/* Background circle */}
            <circle
              cx="100"
              cy="100"
              r={radius}
              fill="transparent"
              stroke="#F1F5F9"
              strokeWidth={strokeWidth}
            />

            {/* Slices */}
            {totalSpent > 0 &&
              slices.map((slice) => {
                if (slice.amount === 0) return null;
                const isHovered = hoveredPillar === slice.pillar;
                return (
                  <circle
                    key={slice.pillar}
                    cx="100"
                    cy="100"
                    r={radius}
                    fill="transparent"
                    stroke={slice.config.colorHex}
                    strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                    strokeDasharray={slice.strokeDasharray}
                    strokeDashoffset={slice.strokeDashoffset}
                    className="transition-all duration-300 cursor-pointer"
                    onMouseEnter={() => setHoveredPillar(slice.pillar)}
                    onMouseLeave={() => setHoveredPillar(null)}
                  />
                );
              })}
          </svg>

          {/* Center text */}
          <div className="absolute flex flex-col items-center justify-center text-center pointer-events-none px-2">
            {activePillarData ? (
              <>
                <span className="text-[11px] font-bold" style={{ color: activePillarData.config.colorHex }}>
                  {activePillarData.config.name}
                </span>
                <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                  {activePillarData.percent}%
                </span>
              </>
            ) : (
              <>
                <span className="text-[10px] uppercase font-bold text-slate-400">Total</span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {formatCurrency(totalSpent, currency)}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 sm:grid-cols-1 gap-2.5 w-full sm:w-auto">
          {slices.map((s) => {
            const Icon = PILLAR_ICONS[s.pillar];
            return (
              <div
                key={s.pillar}
                onMouseEnter={() => setHoveredPillar(s.pillar)}
                onMouseLeave={() => setHoveredPillar(null)}
                className={`flex items-center justify-between p-2 rounded-xl border transition cursor-pointer ${
                  hoveredPillar === s.pillar
                    ? `${s.config.borderClass} ${s.config.bgClass} shadow-2xs`
                    : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <div
                    className="flex h-6 w-6 items-center justify-center rounded-lg text-white"
                    style={{ backgroundColor: s.config.colorHex }}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {s.config.name}
                  </span>
                </div>

                <div className="text-right pl-3">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block">
                    {formatCurrency(s.amount, currency)}
                  </span>
                  <span className="text-[10px] font-medium text-slate-400">
                    {s.percent}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
