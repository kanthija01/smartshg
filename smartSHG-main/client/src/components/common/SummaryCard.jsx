import React from 'react';

export const SummaryCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = 'emerald', // emerald, amber, blue, slate, rose, indigo
  onClick,
}) => {
  const colorStyles = {
    emerald: {
      bg: 'bg-emerald-50/70 text-emerald-700 border-emerald-100',
      iconBg: 'bg-emerald-100 text-emerald-800',
    },
    amber: {
      bg: 'bg-amber-50/70 text-amber-800 border-amber-100',
      iconBg: 'bg-amber-100 text-amber-800',
    },
    blue: {
      bg: 'bg-blue-50/70 text-blue-700 border-blue-100',
      iconBg: 'bg-blue-100 text-blue-800',
    },
    indigo: {
      bg: 'bg-indigo-50/70 text-indigo-700 border-indigo-100',
      iconBg: 'bg-indigo-100 text-indigo-800',
    },
    rose: {
      bg: 'bg-rose-50/70 text-rose-700 border-rose-100',
      iconBg: 'bg-rose-100 text-rose-800',
    },
    slate: {
      bg: 'bg-slate-50 text-slate-700 border-slate-200',
      iconBg: 'bg-slate-100 text-slate-800',
    },
  };

  const scheme = colorStyles[color] || colorStyles.emerald;

  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm transition-all duration-200 hover:shadow-md ${
        onClick ? 'cursor-pointer hover:border-emerald-300' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            {title}
          </p>
          <h3 className="text-2xl font-bold tracking-tight text-slate-900">
            {value}
          </h3>
          {subtitle && (
            <p className="text-xs text-slate-500 flex items-center gap-1 pt-1">
              {subtitle}
            </p>
          )}
        </div>
        {Icon && (
          <div className={`p-3 rounded-xl ${scheme.iconBg}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
      {trend && (
        <div className="mt-3 pt-3 border-t border-slate-100 text-xs font-medium text-slate-600 flex items-center justify-between">
          <span>{trend.label}</span>
          <span className={trend.positive ? 'text-emerald-600' : 'text-rose-600'}>
            {trend.value}
          </span>
        </div>
      )}
    </div>
  );
};
