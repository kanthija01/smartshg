import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { HeadDashboard } from './HeadDashboard';
import { MemberDashboard } from './MemberDashboard';
import { BankManagerDashboard } from '../bank-manager/BankManagerDashboard';

export const DashboardRouter = () => {
  const { user, isHead } = useAuth();
  if (user?.role === 'BANK_MANAGER') return <BankManagerDashboard />;
  return isHead ? <HeadDashboard /> : <MemberDashboard />;
};
