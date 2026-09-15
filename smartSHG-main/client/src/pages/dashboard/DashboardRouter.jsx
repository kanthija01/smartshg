import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { HeadDashboard } from './HeadDashboard';
import { MemberDashboard } from './MemberDashboard';

export const DashboardRouter = () => {
  const { isHead } = useAuth();
  return isHead ? <HeadDashboard /> : <MemberDashboard />;
};
