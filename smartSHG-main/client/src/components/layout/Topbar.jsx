import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useNotification } from '../../context/NotificationContext';
import { Menu, Bell, Globe, Check, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Topbar = ({ onOpenMobileMenu }) => {
  const { t } = useTranslation();
  const { user, activeGroup } = useAuth();
  const { language, toggleLanguage, isTelugu } = useLanguage();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotification();
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 py-3 flex items-center justify-between">
      {/* Left: Mobile hamburger & Active Group */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:block">
          {activeGroup ? (
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <span className="font-semibold text-slate-900">{activeGroup.name}</span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-500">{activeGroup.villageTown}, {activeGroup.district}</span>
            </div>
          ) : (
            <span className="text-xs text-amber-700 font-medium">SmartSHG Digital Platform</span>
          )}
        </div>
      </div>

      {/* Right: Language switcher & Notifications & Profile */}
      <div className="flex items-center gap-3">
        {/* Bilingual Language Switcher */}
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-emerald-300 bg-slate-50 hover:bg-emerald-50/50 text-xs font-semibold text-slate-700 hover:text-emerald-800 transition-all shadow-sm"
          title="Toggle English / తెలుగు"
        >
          <Globe className="w-3.5 h-3.5 text-emerald-600" />
          <span>{isTelugu ? 'English' : 'తెలుగు'}</span>
        </button>

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-rose-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notification Menu */}
          {showNotifications && (
            <div
              className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden z-50 animate-fade-in"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Notifications ({unreadCount} new)
                </h4>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-[11px] text-emerald-700 hover:text-emerald-900 font-semibold"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                {notifications && notifications.length > 0 ? (
                  notifications.map((n) => {
                    const titleText = typeof n.title === 'object' ? (isTelugu ? n.title.te : n.title.en) : n.title;
                    const messageText = typeof n.message === 'object' ? (isTelugu ? n.message.te : n.message.en) : n.message;

                    return (
                      <div
                        key={n._id}
                        className={`p-3.5 text-xs transition-colors hover:bg-slate-50 flex items-start justify-between gap-2 ${
                          !n.read ? 'bg-emerald-50/40 font-medium' : ''
                        }`}
                      >
                        <div className="space-y-0.5 flex-1">
                          <p className="font-semibold text-slate-900">{titleText}</p>
                          <p className="text-slate-600 leading-relaxed">{messageText}</p>
                          <span className="text-[10px] text-slate-400 block pt-1">
                            {new Date(n.createdAt).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        {!n.read && (
                          <button
                            onClick={() => markAsRead(n._id)}
                            className="p-1 text-slate-400 hover:text-emerald-700"
                            title="Mark as read"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="p-6 text-center text-xs text-slate-400">
                    No notifications yet.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Mini Badge */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center border border-emerald-200">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <span className="hidden md:inline-block text-xs font-semibold text-slate-800 truncate max-w-[120px]">
            {user?.name?.split(' ')[0]}
          </span>
        </div>
      </div>
    </header>
  );
};
