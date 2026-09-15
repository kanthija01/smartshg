import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { LayoutDashboard, PiggyBank, HandCoins, CalendarDays } from 'lucide-react';

export const MobileNav = () => {
  const { t } = useTranslation();
  const { isHead } = useAuth();

  const navItems = [
    { to: '/dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
    { to: '/savings', label: t('nav.savings'), icon: PiggyBank },
    { to: '/loans', label: t('nav.loans'), icon: HandCoins },
    { to: '/meetings', label: t('nav.meetings'), icon: CalendarDays },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 px-2 py-1.5 flex items-center justify-around shadow-lg">
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center p-1 rounded-xl text-[10px] font-medium transition-colors ${
                isActive
                  ? 'text-emerald-700 font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`
            }
          >
            <Icon className="w-5 h-5 mb-0.5" />
            <span className="truncate max-w-[64px]">{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
};
