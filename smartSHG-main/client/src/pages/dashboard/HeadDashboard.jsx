import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { groupService } from '../../services/groupService';
import { reportService } from '../../services/reportService';
import { PageHeader } from '../../components/common/PageHeader';
import { SummaryCard } from '../../components/common/SummaryCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { LoadingState, ErrorState } from '../../components/common/FeedbackStates';
import { FinancialFlowChart } from '../../components/charts/FinancialFlowChart';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  Users,
  Wallet,
  Landmark,
  PiggyBank,
  HandCoins,
  AlertOctagon,
  CalendarDays,
  PlusCircle,
  ArrowDownRight,
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react';

export const HeadDashboard = () => {
  const { t } = useTranslation();
  const { activeGroup } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = async () => {
    if (!activeGroup) return;
    try {
      setLoading(true);
      setError('');
      const [statsRes, reportRes] = await Promise.all([
        groupService.getGroupStats(activeGroup._id || activeGroup.id),
        reportService.getFinancialSummary(activeGroup._id || activeGroup.id, 'MONTH'),
      ]);

      if (statsRes.success) setStats(statsRes.stats);
      if (reportRes.success && reportRes.chartData) setChartData(reportRes.chartData);
    } catch (err) {
      setError(err.message || 'Failed to load group statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeGroup]);

  if (loading) return <LoadingState message="Loading SHG metrics & live ledger..." />;
  if (error) return <ErrorState message={error} onRetry={loadData} />;
  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* Top Welcome & Header */}
      <PageHeader
        title={t('dashboard.headOverview')}
        subtitle={`${activeGroup?.name} (${activeGroup?.code}) • ${activeGroup?.villageTown}, ${activeGroup?.district}`}
        badge={<StatusBadge status="ACTIVE" text="SHG Active" />}
        actionButton={
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/savings')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-sm transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              {t('dashboard.recordSavings')}
            </button>
            <button
              onClick={() => navigate('/cash-bank')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-900 bg-emerald-100 hover:bg-emerald-200/80 rounded-xl transition-colors"
            >
              <Landmark className="w-3.5 h-3.5" />
              {t('dashboard.depositBank')}
            </button>
          </div>
        }
      />

      {/* Upcoming Meeting Banner if scheduled */}
      {stats.upcomingMeeting && (
        <div className="p-4 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200/80 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-sm">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                {t('dashboard.upcomingMeeting')}
              </p>
              <p className="text-sm font-semibold text-slate-800">
                {stats.upcomingMeeting.title} • {formatDate(stats.upcomingMeeting.meetingDate)} at {stats.upcomingMeeting.time}
              </p>
              <p className="text-xs text-slate-500">{stats.upcomingMeeting.location}</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/meetings')}
            className="px-3 py-1.5 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-xl transition-colors"
          >
            View Meeting & Agenda
          </button>
        </div>
      )}

      {/* Key Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Derived Cash on Hand */}
        <SummaryCard
          title={t('dashboard.cashOnHand')}
          value={formatCurrency(stats.cashOnHand)}
          subtitle="Vault / Box cash derived from receipts"
          icon={Wallet}
          color="emerald"
          onClick={() => navigate('/cash-bank')}
        />

        {/* Derived Bank Balance */}
        <SummaryCard
          title={t('dashboard.bankBalance')}
          value={formatCurrency(stats.bankBalance)}
          subtitle="Passbook balance in SBI account"
          icon={Landmark}
          color="blue"
          onClick={() => navigate('/cash-bank')}
        />

        {/* Savings This Month */}
        <SummaryCard
          title={t('dashboard.savingsThisMonth')}
          value={formatCurrency(stats.savingsThisMonth)}
          subtitle={`Pending: ${formatCurrency(stats.pendingMonthlySavings)}`}
          icon={PiggyBank}
          color="amber"
          onClick={() => navigate('/savings')}
        />

        {/* Active Loan Portfolio */}
        <SummaryCard
          title={t('dashboard.outstandingLoans')}
          value={formatCurrency(stats.outstandingLoans)}
          subtitle={`${stats.activeLoansCount} active loans (${stats.overdueLoansCount} overdue)`}
          icon={HandCoins}
          color={stats.overdueLoansCount > 0 ? 'rose' : 'indigo'}
          onClick={() => navigate('/loans')}
        />
      </div>

      {/* Secondary Row: Member Health & Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Financial Trends Chart */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">{t('dashboard.savingsTrends')}</h3>
              <p className="text-xs text-slate-500">Savings collections, repayments, and operational expenses</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg">
              Last 6 Months
            </span>
          </div>
          <FinancialFlowChart data={chartData} />
        </div>

        {/* Right Col: Group Status & Quick Links */}
        <div className="space-y-6">
          {/* Members Overview Box */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-700" />
              Member Directory Status
            </h4>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-xl font-bold text-slate-900">{stats.totalMembers}</p>
                <p className="text-[10px] uppercase font-semibold text-slate-500 mt-0.5">Total</p>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl">
                <p className="text-xl font-bold text-emerald-800">{stats.activeMembers}</p>
                <p className="text-[10px] uppercase font-semibold text-emerald-600 mt-0.5">Active</p>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl">
                <p className="text-xl font-bold text-amber-800">{stats.pendingMembers}</p>
                <p className="text-[10px] uppercase font-semibold text-amber-600 mt-0.5">Pending</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/members')}
              className="w-full py-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors"
            >
              Manage Members & Approvals
            </button>
          </div>

          {/* Monthly Savings Target Widget */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-700">Monthly Savings Goal</span>
              <span className="font-bold text-emerald-800">
                {formatCurrency(stats.savingsThisMonth)} / {formatCurrency(stats.expectedMonthlySavings)}
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-emerald-600 h-2.5 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, (stats.savingsThisMonth / (stats.expectedMonthlySavings || 1)) * 100)}%`,
                }}
              ></div>
            </div>
            <p className="text-[11px] text-slate-500">
              {stats.pendingMonthlySavings > 0
                ? `₹${stats.pendingMonthlySavings} remaining to be collected from members this month.`
                : 'All members have fully contributed monthly savings!'}
            </p>
          </div>
        </div>
      </div>

      {/* Recent Ledger Movements Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">{t('dashboard.recentTransactions')}</h3>
            <p className="text-xs text-slate-500">Audit-verified double entry movements</p>
          </div>
          <button
            onClick={() => navigate('/cash-bank')}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-900"
          >
            View Complete Ledger &rarr;
          </button>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          {stats.recentTransactions && stats.recentTransactions.length > 0 ? (
            stats.recentTransactions.map((tx) => (
              <div key={tx._id} className="py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-xl ${
                      ['SAVINGS_COLLECTION', 'LOAN_REPAYMENT', 'BANK_DEPOSIT'].includes(tx.transactionType)
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {['SAVINGS_COLLECTION', 'LOAN_REPAYMENT'].includes(tx.transactionType) ? (
                      <ArrowDownRight className="w-4 h-4" />
                    ) : (
                      <ArrowUpRight className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">{tx.description}</p>
                    <p className="text-[11px] text-slate-400 font-mono">
                      {tx.transactionId} • {formatDate(tx.date)} • {tx.paymentMethod}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-900 text-sm">{formatCurrency(tx.amount)}</p>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {tx.sourceAccount} &rarr; {tx.destinationAccount}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p className="py-6 text-center text-slate-400 text-xs">No recent ledger movements recorded.</p>
          )}
        </div>
      </div>
    </div>
  );
};
