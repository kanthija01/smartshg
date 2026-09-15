import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';
import i18n from '../i18n';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('smartshg_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [activeGroup, setActiveGroupState] = useState(() => {
    try {
      const saved = localStorage.getItem('smartshg_active_group');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(true);

  const setActiveGroup = (group) => {
    setActiveGroupState(group);
    if (group) {
      localStorage.setItem('smartshg_active_group', JSON.stringify(group));
      localStorage.setItem('smartshg_active_group_id', group._id || group.id);
    } else {
      localStorage.removeItem('smartshg_active_group');
      localStorage.removeItem('smartshg_active_group_id');
    }
  };

  const login = async (credentials) => {
    const data = await authService.login(credentials);
    if (data.success && data.token) {
      localStorage.setItem('smartshg_token', data.token);
      localStorage.setItem('smartshg_user', JSON.stringify(data.user));
      setUser(data.user);

      if (data.user.preferredLanguage) {
        i18n.changeLanguage(data.user.preferredLanguage);
        localStorage.setItem('smartshg_lang', data.user.preferredLanguage);
      }

      if (data.user.defaultGroup) {
        setActiveGroup(data.user.defaultGroup);
      }
    }
    return data;
  };
const register = async (userData) => {
  const data = await authService.register(userData);

  if (data.success && data.token) {
    localStorage.setItem('smartshg_token', data.token);
    localStorage.setItem('smartshg_user', JSON.stringify(data.user));

    setUser(data.user);

    if (data.user.preferredLanguage) {
      i18n.changeLanguage(data.user.preferredLanguage);
      localStorage.setItem('smartshg_lang', data.user.preferredLanguage);
    }

    if (data.user.defaultGroup) {
      setActiveGroup(data.user.defaultGroup);
    }
  }

  return data;
};
  const logout = () => {
    localStorage.removeItem('smartshg_token');
    localStorage.removeItem('smartshg_user');
    localStorage.removeItem('smartshg_active_group');
    localStorage.removeItem('smartshg_active_group_id');
    setUser(null);
    setActiveGroupState(null);
    window.location.href = '/login';
  };

  const refreshUser = async () => {
    try {
      const token = localStorage.getItem('smartshg_token');
      if (!token) {
        setLoading(false);
        return;
      }
      const data = await authService.getMe();
      if (data.success && data.user) {
        setUser(data.user);
        localStorage.setItem('smartshg_user', JSON.stringify(data.user));

        if (!activeGroup && data.user.defaultGroup) {
          setActiveGroup(data.user.defaultGroup);
        }
      }
    } catch (err) {
      console.warn('Failed to refresh user:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const value = {
    user,
    activeGroup,
    setActiveGroup,
    isAuthenticated: Boolean(user),
    isHead: user?.role === 'HEAD',
    isMember: user?.role === 'MEMBER',
    login,
    register,
    logout,
    refreshUser,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
