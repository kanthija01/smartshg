import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { savingsService } from '../../services/savingsService';
import { loanService } from '../../services/loanService';
import { meetingService } from '../../services/meetingService';
import { PageHeader } from '../../components/common/PageHeader';
import { SummaryCard } from '../../components/common/SummaryCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { LoadingState, ErrorState } from '../../components/common/FeedbackStates';
import { ReceiptModal } from '../../components/common/ReceiptModal';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  PiggyBank,
  HandCoins,
  CalendarDays,
  FileText,
  CreditCard,
  CheckCircle,
  Clock,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export const MemberDashboard = () => {
  const { t } = useTranslation();
  const { user, activeGroup } = useAuth();
  const navigate = useNavigate();

  const [savingsSummary, setSavingsSummary] = useState(null);
  const [activeLoan, setActiveLoan] = useState(null);
  const [upcomingMeeting, setUpcomingMeeting] = useState(null);
  const [attendanceSummary, setAttendanceSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [receiptData, setReceiptData] = useState(null);

  const loadData = async () => {
    if (!activeGroup) return;
    try {
      setLoading(true);
      setError('');
      const [savingsRes, loansRes, meetingsRes, attendanceRes] = await Promise.all([
        savingsService.getMySavings(activeGroup._id || activeGroup.id),
        loanService.listLoans(activeGroup._id || activeGroup.id),
        meetingService.listMeetings(activeGroup._id || activeGroup.id, { status: 'SCHEDULED' }),
        meetingService.getMyAttendance(activeGroup._id || activeGroup.id),
      ]);

      if (savingsRes.success) setSavingsSummary(savingsRes.summary);
      if (loansRes.success && loansRes.loans?.length > 0) {
        // Find current active disbursed or requested loan
        const currentLoan = loansRes.loans.find((l) => ['DISBURSED', 'APPROVED', 'REQUESTED'].includes(l.status));
        setActiveLoan(currentLoan || null);
      }
      if (meetingsRes.success && meetingsRes.meetings?.length > 0) {
        setUpcomingMeeting(meetingsRes.meetings[0]);
      }
      if (attendanceRes.success) setAttendanceSummary(attendanceRes.summary);
    } catch (err) {
      setError(err.message || 'Failed to load member dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeGroup]);

  if (loading) return <LoadingState message="Loading your savings & loan summary..." />;
  if (error) return <ErrorState message={error} onRetry={loadData} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('dashboard.memberOverview')}
        subtitle={`${user?.name} • ${activeGroup?.name} (${activeGroup?.villageTown})`}
        badge={<StatusBadge status="ACTIVE" text="Active Member" />}
        actionButton={
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(`/reports/member-statement/${user?.memberId}`)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              {t('nav.myStatement')}
            </button>
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Lifetime Savings */}
        <SummaryCard
          title={t('dashboard.totalSaved')}
          value={formatCurrency(savingsSummary?.totalSavings || 0)}
          subtitle="Your total accumulated group equity"
          icon={PiggyBank}
          color="emerald"
          onClick={() => navigate('/savings')}
        />

        {/* Current Month Savings Status */}
        <SummaryCard
          title={`Savings: ${savingsSummary?.currentPeriod || 'This Month'}`}
          value={formatCurrency(savingsSummary?.currentMonthPaid || 0)}
          subtitle={
            savingsSummary?.currentMonthPending === 0
              ? '✓ Fully paid for this month'
              : `₹${savingsSummary?.currentMonthPending} pending of ₹${savingsSummary?.monthlyExpected}`
          }
          icon={CreditCard}
          color={savingsSummary?.currentMonthPending === 0 ? 'emerald' : 'amber'}
          onClick={() => navigate('/savings')}
        />

        {/* Loan Balance */}
        <SummaryCard
          title={t('dashboard.activeLoan')}
          value={activeLoan ? formatCurrency(activeLoan.outstandingPrincipal) : '₹0'}
          subtitle={activeLoan ? `EMI: ${formatCurrency(activeLoan.emiAmount)} / mo` : 'No active loan'}
          icon={HandCoins}
          color={activeLoan ? 'indigo' : 'slate'}
          onClick={() => navigate('/loans')}
        />
      </div>

      {/* Main Grid: Active Loan Details & Meeting Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Active Loan Details */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">{t('dashboard.activeLoan')}</h3>
              <p className="text-xs text-slate-500">Internal revolving loan status and repayments</p>
            </div>
            {activeLoan ? (
              <StatusBadge status={activeLoan.status} />
            ) : (
              <button
                onClick={() => navigate('/loans')}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-900"
              >
                + Apply for Loan
              </button>
            )}
          </div>

          {activeLoan ? (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-slate-400">Loan ID</span>
                    <p className="font-bold text-slate-800 text-sm">{activeLoan.loanId}</p>
                    <p className="text-xs text-slate-600 mt-0.5">{activeLoan.purpose}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase text-slate-400">Principal</span>
                    <p className="font-bold text-slate-900 text-base">{formatCurrency(activeLoan.principal)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 text-xs">
                  <div>
                    <p className="text-slate-400 text-[10px] uppercase">Interest Rate</p>
                    <p className="font-semibold text-slate-800">{activeLoan.interestRate}% p.a.</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-[10px] uppercase">Monthly EMI</p>
                    <p className="font-bold text-emerald-800">{formatCurrency(activeLoan.emiAmount)}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-[10px] uppercase">Tenure</p>
                    <p className="font-semibold text-slate-800">{activeLoan.tenureMonths} Months</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-slate-500">Total Repaid: <strong className="text-slate-800">{formatCurrency(activeLoan.totalRepaid || 0)}</strong></span>
                <button
                  onClick={() => navigate('/loans')}
                  className="text-xs font-bold text-emerald-800 hover:text-emerald-900 flex items-center gap-1"
                >
                  <span>View Repayment Schedule</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto">
                <HandCoins className="w-6 h-6" />
              </div>
              <div>
                <p className="font-semibold text-slate-800 text-sm">No Active Loans</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  You are eligible to apply for low-interest SHG revolving micro-credit for household or micro-enterprise purposes.
                </p>
              </div>
              <button
                onClick={() => navigate('/loans')}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-sm transition-colors"
              >
                Apply for New Loan
              </button>
            </div>
          )}
        </div>

        {/* Right Col: Upcoming Meeting & Attendance */}
        <div className="space-y-6">
          {/* Upcoming Meeting Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-amber-600" />
              {t('dashboard.upcomingMeeting')}
            </h4>

            {upcomingMeeting ? (
              <div className="p-3.5 bg-amber-50/60 border border-amber-200/60 rounded-xl space-y-2">
                <p className="font-bold text-amber-950 text-xs">{upcomingMeeting.title}</p>
                <div className="text-[11px] text-amber-900 space-y-0.5 font-medium">
                  <p>📅 {formatDate(upcomingMeeting.meetingDate)} at {upcomingMeeting.time}</p>
                  <p>📍 {upcomingMeeting.location}</p>
                </div>
                <p className="text-[11px] text-slate-600 italic border-t border-amber-200/60 pt-1.5">
                  Agenda: {upcomingMeeting.agenda}
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-3">No upcoming meetings scheduled right now.</p>
            )}

            <button
              onClick={() => navigate('/meetings')}
              className="w-full py-2 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors"
            >
              View Meeting History & Minutes
            </button>
          </div>

          {/* Attendance Health */}
          {attendanceSummary && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-700">Meeting Attendance Rate</span>
                <span className="font-bold text-emerald-800">{attendanceSummary.attendancePercentage}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-emerald-600 h-2 rounded-full"
                  style={{ width: `${attendanceSummary.attendancePercentage}%` }}
                ></div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-[10px] text-slate-500 pt-1">
                <div>
                  <strong className="text-slate-800 block text-xs">{attendanceSummary.presentCount}</strong> Present
                </div>
                <div>
                  <strong className="text-slate-800 block text-xs">{attendanceSummary.absentCount}</strong> Absent
                </div>
                <div>
                  <strong className="text-slate-800 block text-xs">{attendanceSummary.lateCount}</strong> Late
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Digital Receipt Modal if payment completed */}
      {receiptData && (
        <ReceiptModal
          isOpen={Boolean(receiptData)}
          onClose={() => setReceiptData(null)}
          receipt={receiptData}
        />
      )}
    </div>
  );
};
