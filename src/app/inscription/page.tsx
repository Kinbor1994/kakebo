'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthContext';
import { Mail, Lock, User, UserPlus, ArrowLeft, AlertCircle, Cloud, ShieldCheck } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [migrateData, setMigrateData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Veuillez renseigner votre email et mot de passe');
      return;
    }

    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await register(email, password, name, migrateData);
      if (res.success) {
        router.push('/');
      } else {
        setError(res.error || 'Erreur lors de la création du compte');
      }
    } catch {
      setError('Une erreur réseau est survenue');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-center px-4 py-12">
      <div className="mx-auto w-full max-w-sm space-y-6">
        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Retour au tableau de bord</span>
        </Link>

        {/* Brand & Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md">
            <UserPlus className="h-6 w-6 stroke-[2.2]" />
          </div>
          <h1 className="text-xl font-extrabold tracking-tight">Créer un compte Kakeibo Cloud</h1>
          <p className="text-xs text-slate-500">
            Protégez vos finances et accédez à vos comptes sur tous vos appareils.
          </p>
        </div>

        {/* Form Card */}
        <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center space-x-2 p-3 rounded-2xl bg-rose-50 text-rose-700 text-xs border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/50">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Nom ou prénom (optionnel)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Christian"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs focus:ring-2 focus:ring-emerald-500 outline-hidden transition"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Adresse email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre.email@exemple.com"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs focus:ring-2 focus:ring-emerald-500 outline-hidden transition"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Mot de passe (min. 6 caractères)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs focus:ring-2 focus:ring-emerald-500 outline-hidden transition"
                />
              </div>
            </div>

            {/* Migrate Data option */}
            <label className="flex items-start space-x-2.5 p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40 cursor-pointer">
              <input
                type="checkbox"
                checked={migrateData}
                onChange={(e) => setMigrateData(e.target.checked)}
                className="mt-0.5 rounded-sm text-emerald-600 focus:ring-emerald-500 h-4 w-4"
              />
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200 flex items-center space-x-1">
                  <Cloud className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Transférer mes données actuelles</span>
                </span>
                <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80 leading-tight">
                  Sauvegarder immédiatement toutes vos transactions et cagnottes locales sur votre nouveau compte en ligne.
                </p>
              </div>
            </label>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 flex items-center justify-center space-x-2 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-md active:scale-98 disabled:opacity-50"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>{isSubmitting ? 'Création en cours...' : 'Créer mon compte Cloud'}</span>
            </button>
          </form>
        </div>

        {/* Footer info */}
        <div className="text-center space-y-3">
          <p className="text-xs text-slate-500">
            Déjà inscrit ?{' '}
            <Link
              href="/connexion"
              className="font-bold text-emerald-600 hover:text-emerald-700 underline"
            >
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
