import React from 'react';

const statusStyles = {
  ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  PAID: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  APPROVED: 'bg-blue-50 text-blue-700 border-blue-200',
  DISBURSED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  SCHEDULED: 'bg-blue-50 text-blue-700 border-blue-200',
  PRESENT: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CAPTURED: 'bg-emerald-50 text-emerald-700 border-emerald-200',

  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  REQUESTED: 'bg-amber-50 text-amber-700 border-amber-200',
  PARTIALLY_PAID: 'bg-amber-50 text-amber-700 border-amber-200',
  PARTIAL: 'bg-amber-50 text-amber-700 border-amber-200',
  LATE: 'bg-amber-50 text-amber-700 border-amber-200',

  INACTIVE: 'bg-slate-100 text-slate-600 border-slate-200',
  CLOSED: 'bg-slate-100 text-slate-700 border-slate-200',
  CANCELLED: 'bg-slate-100 text-slate-600 border-slate-200',

  REJECTED: 'bg-rose-50 text-rose-700 border-rose-200',
  FAILED: 'bg-rose-50 text-rose-700 border-rose-200',
  OVERDUE: 'bg-rose-50 text-rose-700 border-rose-200',
  ABSENT: 'bg-rose-50 text-rose-700 border-rose-200',
  REVERSED: 'bg-rose-50 text-rose-700 border-rose-200',
};

export const StatusBadge = ({ status, text }) => {
  const normalized = (status || '').toUpperCase();
  const style = statusStyles[normalized] || 'bg-slate-50 text-slate-700 border-slate-200';

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${style}`}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-75"></span>
      {text || status}
    </span>
  );
};
