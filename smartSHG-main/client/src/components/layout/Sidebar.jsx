import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  PiggyBank,
  Landmark,
  HandCoins,
  CalendarDays,
  LogOut,
  Building2,
} from 'lucide-react';

export const Sidebar = ({ onCloseMobile }) => {
  const { t } = useTranslation();
  const { user, isHead, isMember, activeGroup, logout } = useAuth();

  const navItems = [
    { to: '/dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
    ...(isHead
      ? [
          { to: '/members', label: t('nav.members'), icon: Users },
          { to: '/savings', label: t('nav.savings'), icon: PiggyBank },
          { to: '/cash-bank', label: t('nav.cashBank'), icon: Landmark },
          { to: '/loans', label: t('nav.loans'), icon: HandCoins },
          { to: '/meetings', label: t('nav.meetings'), icon: CalendarDays },
        ]
      : [
          { to: '/savings', label: t('nav.mySavings'), icon: PiggyBank },
          { to: '/loans', label: t('nav.myLoans'), icon: HandCoins },
          { to: '/meetings', label: t('nav.myAttendance'), icon: CalendarDays },
          { to: '/savings', label: t('nav.mySavings'), icon: PiggyBank },
        ]),
  ];

  return (
    <aside className="w-64 bg-emerald-950 text-emerald-100 flex flex-col h-full border-r border-emerald-900/60 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-emerald-900/60 flex items-center gap-3">
        <div className="p-2 bg-gradient-to-tr from-emerald-600 to-amber-500 rounded-xl text-white shadow-md">
          <Building2 className="w-6 h-6" />
        </div>
        <div>
          <h2 className="font-bold text-white text-lg tracking-tight leading-tight">
            Smart<span className="text-amber-400">SHG</span>
          </h2>
          <p className="text-[11px] text-emerald-300/80 font-medium">Community Microfinance</p>
        </div>
      </div>

      {/* Active SHG Group Pill */}
      {activeGroup && (
        <div className="px-4 py-3 bg-emerald-900/40 border-b border-emerald-900/40">
          <div className="p-2.5 rounded-xl bg-emerald-900/60 border border-emerald-800/60">
            <p className="text-[10px] uppercase font-bold text-amber-300 tracking-wider">
              Active SHG
            </p>
            <p className="text-xs font-semibold text-white truncate mt-0.5" title={activeGroup.name}>
              {activeGroup.name}
            </p>
            <p className="text-[10px] text-emerald-300/70 font-mono">
              Code: {activeGroup.code}
            </p>
          </div>
        </div>
      )}

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-emerald-800 text-white font-semibold shadow-sm border border-emerald-700/60'
                    : 'text-emerald-200/80 hover:bg-emerald-900/50 hover:text-white'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* User Info & Logout */}
      <div className="p-4 border-t border-emerald-900/60 bg-emerald-950/80">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-full bg-amber-500/20 text-amber-300 font-bold text-sm flex items-center justify-center border border-amber-400/30">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div className="overflow-hidden flex-1">
            <p className="text-xs font-semibold text-white truncate">{user?.name}</p>
            <span className="inline-block text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-800/80 text-emerald-200 uppercase tracking-wider mt-0.5">
              {user?.role === 'HEAD' ? t('roles.head') : t('roles.member')}
            </span>
          </div>
        </div>

        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-emerald-300 hover:text-white hover:bg-emerald-900/70 rounded-xl transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>{t('nav.logout')}</span>
        </button>
      </div>
    </aside>
  );
};
