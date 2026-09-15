import React from 'react';
import { FolderSearch, AlertCircle, RefreshCw, Loader2 } from 'lucide-react';

export const EmptyState = ({
  title = 'No records found',
  description = 'There are no items matching your criteria yet.',
  action,
  icon: Icon = FolderSearch,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-2xl border border-dashed border-slate-300 my-4">
      <div className="p-3 bg-slate-100 text-slate-500 rounded-2xl mb-3">
        <Icon className="w-8 h-8" />
      </div>
      <h3 className="text-base font-semibold text-slate-800">{title}</h3>
      <p className="text-sm text-slate-500 max-w-sm mt-1 mb-4">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
};

export const LoadingState = ({ message = 'Loading records...' }) => {
  return (
    <div className="flex flex-col items-center justify-center p-16 text-center">
      <Loader2 className="w-8 h-8 text-emerald-700 animate-spin mb-3" />
      <p className="text-sm font-medium text-slate-500">{message}</p>
    </div>
  );
};

export const ErrorState = ({
  message = 'Failed to load data. Please try again.',
  onRetry,
}) => {
  return (
    <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-center my-4">
      <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
      <h4 className="text-sm font-semibold text-red-900">Something went wrong</h4>
      <p className="text-xs text-red-700 max-w-md mx-auto mt-1 mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry
        </button>
      )}
    </div>
  );
};
