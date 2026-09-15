import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Building2, Lock, Phone, ArrowRight, Globe, CheckCircle2 } from 'lucide-react';

export const Login = () => {
  const { t } = useTranslation();
  const { login } = useAuth();
  const { toggleLanguage, isTelugu } = useLanguage();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState('radha@smartshg.org');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await login({ identifier, password });
      if (data.success) {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const setDemoCredentials = (email) => {
    setIdentifier(email);
    setPassword('password123');
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-900 via-emerald-950 to-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative selection:bg-amber-400 selection:text-slate-900">
      {/* Top Language Toggle */}
      <div className="absolute top-4 right-4 sm:top-8 sm:right-8">
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-emerald-700 bg-emerald-900/60 text-emerald-200 text-xs font-semibold hover:bg-emerald-800 transition-all shadow-md"
        >
          <Globe className="w-4 h-4 text-amber-400" />
          <span>{isTelugu ? 'English' : 'తెలుగు'}</span>
        </button>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center px-4">
        <div className="inline-flex p-3 bg-gradient-to-tr from-emerald-600 to-amber-500 rounded-2xl text-white shadow-xl mb-4">
          <Building2 className="w-9 h-9" />
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          {t('auth.signInTitle')}
        </h2>
        <p className="mt-2 text-sm text-emerald-200/80 font-medium">
          {t('app.subtitle')}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 sm:px-10 rounded-3xl shadow-2xl border border-slate-100">
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">{t('auth.identifier')}</label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={t('auth.identifierPlaceholder')}
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:bg-white focus:outline-none transition-all font-medium text-slate-900"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-emerald-700 hover:text-emerald-800 font-semibold"
                >
                  {t('auth.forgot')}
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:bg-white focus:outline-none transition-all font-medium text-slate-900"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 text-sm font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-xl shadow-lg shadow-emerald-900/20 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-600 disabled:opacity-50"
            >
              <span>{loading ? t('common.loading') : t('auth.signInButton')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick 1-Click Demo Logins */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider text-center mb-2.5">
              {t('auth.demoAccounts')}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDemoCredentials('radha@smartshg.org')}
                className="p-2.5 text-left rounded-xl border border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/50 transition-colors"
              >
                <p className="text-xs font-bold text-emerald-900 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                  {t('auth.demoLeader')}
                </p>
                <p className="text-[10px] text-emerald-700 truncate mt-0.5">Radha Devi (President)</p>
              </button>
              <button
                type="button"
                onClick={() => setDemoCredentials('lakshmi@smartshg.org')}
                className="p-2.5 text-left rounded-xl border border-amber-200 bg-amber-50/50 hover:bg-amber-100/50 transition-colors"
              >
                <p className="text-xs font-bold text-amber-900 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-amber-700" />
                  {t('auth.demoMember')}
                </p>
                <p className="text-[10px] text-amber-700 truncate mt-0.5">Lakshmi Bai</p>
              </button>
            </div>
          </div>

          <div className="mt-6 text-center text-xs text-slate-500">
            {t('auth.noAccount')}{' '}
            <Link to="/register" className="font-bold text-emerald-800 hover:text-emerald-900">
              {t('auth.registerHere')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
