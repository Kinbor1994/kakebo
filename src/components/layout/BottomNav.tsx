'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ReceiptText, Plus, BookOpenCheck, Target, Settings } from 'lucide-react';

interface BottomNavProps {
  onOpenQuickAdd: () => void;
}

export function BottomNav({ onOpenQuickAdd }: BottomNavProps) {
  const pathname = usePathname();

  const navItems = [
    { label: 'Accueil', href: '/', icon: LayoutDashboard },
    { label: 'Journal', href: '/transactions', icon: ReceiptText },
    { label: 'Bilans', href: '/bilan', icon: BookOpenCheck },
    { label: 'Cagnottes', href: '/cagnottes', icon: Target },
    { label: 'Réglages', href: '/parametres', icon: Settings },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 px-1.5 pt-1.5 backdrop-blur-xl shadow-lg"
      style={{ paddingBottom: 'max(0.4rem, env(safe-area-inset-bottom, 0.4rem))' }}
    >
      <div className="mx-auto flex max-w-md items-center justify-around">
        {navItems.slice(0, 2).map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
                isActive
                  ? 'text-emerald-700 dark:text-emerald-400 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Icon className={`h-4.5 w-4.5 sm:h-5 sm:w-5 ${isActive ? 'stroke-[2.4]' : 'stroke-[1.7]'}`} />
              <span className="text-[10px] sm:text-[11px] tracking-tight mt-0.5 whitespace-nowrap">{item.label}</span>
            </Link>
          );
        })}

        {/* Central Action Plus Button */}
        <button
          type="button"
          onClick={onOpenQuickAdd}
          className="relative -top-2 flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/30 transition-all active:scale-95 hover:bg-emerald-700 hover:scale-105"
          aria-label="Ajouter une transaction"
        >
          <Plus className="h-5 w-5 sm:h-6 sm:w-6 stroke-[2.5]" />
        </button>

        {navItems.slice(2).map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
                isActive
                  ? 'text-emerald-700 dark:text-emerald-400 font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Icon className={`h-4.5 w-4.5 sm:h-5 sm:w-5 ${isActive ? 'stroke-[2.4]' : 'stroke-[1.7]'}`} />
              <span className="text-[10px] sm:text-[11px] tracking-tight mt-0.5 whitespace-nowrap">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
