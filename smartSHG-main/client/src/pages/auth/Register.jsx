import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Building2, Lock, Phone, Mail, User, ArrowRight, Globe } from 'lucide-react';

export const Register = () => {
  const { t } = useTranslation();
  const { register } = useAuth();
  const { toggleLanguage, isTelugu } = useLanguage();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('MEMBER');
  const [preferredLanguage, setPreferredLanguage] = useState('en');
  const [groupCode, setGroupCode] = useState('');
  const [groupName, setGroupName] = useState('');
  const [villageTown, setVillageTown] = useState('');
  const [district, setDistrict] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await register({
        name,
        phone,
        email: email || undefined,
        password,
        role,
        preferredLanguage: isTelugu ? 'te' : preferredLanguage,
        groupCode: role === 'MEMBER' ? groupCode : undefined,
        groupName: role === 'HEAD' ? groupName : undefined,
        villageTown: role === 'HEAD' ? villageTown : undefined,
        district: role === 'HEAD' ? district : undefined,
      });
      if (data.success) {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-900 via-emerald-950 to-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative">
      <button
        type="button"
        onClick={() => { toggleLanguage(); setPreferredLanguage(isTelugu ? 'en' : 'te'); }}
        className="absolute top-4 right-4 sm:top-8 sm:right-8 flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-emerald-700 bg-emerald-900/60 text-emerald-200 text-xs font-semibold hover:bg-emerald-800 transition-all shadow-md"
      >
        <Globe className="w-4 h-4 text-amber-400" />
        <span>{isTelugu ? 'English' : 'తెలుగు'}</span>
      </button>
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center px-4">
        <div className="inline-flex p-3 bg-gradient-to-tr from-emerald-600 to-amber-500 rounded-2xl text-white shadow-xl mb-4">
          <Building2 className="w-8 h-8" />
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight text-white">
          {t('auth.createAccount')}
        </h2>
        <p className="mt-2 text-sm text-emerald-200/80">
          {t('auth.subtitle')}
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
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                {t('auth.fullName')}
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('auth.namePlaceholder')}
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:bg-white focus:outline-none transition-all font-medium text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                {t('auth.phone')}
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t('auth.phonePlaceholder')}
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:bg-white focus:outline-none transition-all font-medium text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                {t('auth.email')}
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('auth.emailPlaceholder')}
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:bg-white focus:outline-none transition-all font-medium text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                {t('auth.role')}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole('MEMBER')}
                  className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all ${
                    role === 'MEMBER'
                      ? 'bg-emerald-50 border-emerald-600 text-emerald-800 ring-1 ring-emerald-600'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {t('auth.member')}
                </button>
                <button
                  type="button"
                  onClick={() => setRole('HEAD')}
                  className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all ${
                    role === 'HEAD'
                      ? 'bg-emerald-50 border-emerald-600 text-emerald-800 ring-1 ring-emerald-600'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {t('auth.leader')}
                </button>
              </div>
            </div>

            {role === 'MEMBER' ? (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  {t('auth.groupCode')}
                </label>
                <input
                  type="text"
                  required
                  value={groupCode}
                  onChange={(e) => setGroupCode(e.target.value.toUpperCase())}
                  placeholder={t('auth.groupCodePlaceholder')}
                  className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:bg-white focus:outline-none transition-all font-medium text-slate-900"
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">{t('auth.groupName')}</label>
                  <input type="text" required value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder={t('auth.groupNamePlaceholder')} className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:bg-white focus:outline-none transition-all font-medium text-slate-900" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" required value={villageTown} onChange={(e) => setVillageTown(e.target.value)} placeholder={t('auth.villagePlaceholder')} aria-label={t('auth.village')} className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:bg-white focus:outline-none transition-all font-medium text-slate-900" />
                  <input type="text" required value={district} onChange={(e) => setDistrict(e.target.value)} placeholder={t('auth.districtPlaceholder')} aria-label={t('auth.district')} className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:bg-white focus:outline-none transition-all font-medium text-slate-900" />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                {t('auth.password')}
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('auth.passwordPlaceholder')}
                  className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:bg-white focus:outline-none transition-all font-medium text-slate-900"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 text-sm font-bold text-white bg-emerald-800 hover:bg-emerald-900 rounded-xl shadow-lg transition-all disabled:opacity-50"
            >
              <span>{loading ? t('common.loading') : t('auth.register')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-slate-500">
            {t('auth.alreadyAccount')}{' '}
            <Link to="/login" className="font-bold text-emerald-800 hover:text-emerald-900">
              {t('auth.signIn')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
