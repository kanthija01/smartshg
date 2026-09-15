import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { loanService } from '../../services/loanService';
import { memberService } from '../../services/memberService';
import { PageHeader } from '../../components/common/PageHeader';
import { SummaryCard } from '../../components/common/SummaryCard';
import { DataTable } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { ReceiptModal } from '../../components/common/ReceiptModal';
import { LoadingState, ErrorState } from '../../components/common/FeedbackStates';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  HandCoins,
  PlusCircle,
  CheckCircle2,
  XCircle,
  Banknote,
  Calendar,
  Layers,
  ArrowRight,
  TrendingDown,
  Info,
} from 'lucide-react';

export const LoanList = () => {
  const { t } = useTranslation();
  const { activeGroup, isHead, user } = useAuth();

  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Request Loan Modal
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [membersList, setMembersList] = useState([]);
  const [loanMemberId, setLoanMemberId] = useState('');
  const [loanPrincipal, setLoanPrincipal] = useState(10000);
  const [loanPurpose, setLoanPurpose] = useState('');
  const [loanTenure, setLoanTenure] = useState(12);
  const [loanInterestRate, setLoanInterestRate] = useState(12);
  const [loanInterestMethod, setLoanInterestMethod] = useState('REDUCING_BALANCE');
  const [submittingLoan, setSubmittingLoan] = useState(false);

  // Approve / Reject State
  const [approveTarget, setApproveTarget] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Disburse Modal State (Separate Action from Approval!)
  const [disburseTarget, setDisburseTarget] = useState(null);
  const [disburseMethod, setDisburseMethod] = useState('BANK_TRANSFER');
  const [disburseRef, setDisburseRef] = useState('');
  const [disbursing, setDisbursing] = useState(false);

  // Repayment Modal State
  const [repayTarget, setRepayTarget] = useState(null);
  const [repayAmount, setRepayAmount] = useState('');
  const [repayMethod, setRepayMethod] = useState('CASH');
  const [repayRef, setRepayRef] = useState('');
  const [repaying, setRepaying] = useState(false);

  // Installment Schedule Modal State
  const [selectedLoanDetails, setSelectedLoanDetails] = useState(null);
  const [installments, setInstallments] = useState([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);

  // Receipt Modal State
  const [receiptData, setReceiptData] = useState(null);

  const loadLoans = async () => {
    if (!activeGroup) return;
    try {
      setLoading(true);
      setError('');
      const [loansRes, membersRes] = await Promise.all([
        loanService.listLoans(activeGroup._id || activeGroup.id, {
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
          page,
          limit: 20,
        }),
        isHead ? memberService.listMembers(activeGroup._id || activeGroup.id, { status: 'ACTIVE' }) : Promise.resolve({ success: true, members: [] }),
      ]);

      if (loansRes.success) {
        setLoans(loansRes.loans);
        setTotalPages(loansRes.totalPages);
      }
      if (membersRes.success && membersRes.members?.length > 0) {
        setMembersList(membersRes.members);
        if (!loanMemberId) setLoanMemberId(membersRes.members[0]._id);
      }
    } catch (err) {
      setError(err.message || 'Failed to load loans');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLoans();
  }, [activeGroup, statusFilter, page]);

  const handleRequestLoan = async (e) => {
    e.preventDefault();
    try {
      setSubmittingLoan(true);
      await loanService.requestLoan(activeGroup._id || activeGroup.id, {
        memberId: isHead ? loanMemberId : undefined,
        principal: Number(loanPrincipal),
        purpose: loanPurpose,
        tenureMonths: Number(loanTenure),
        interestRate: Number(loanInterestRate),
        interestMethod: loanInterestMethod,
      });
      setShowRequestModal(false);
      setLoanPurpose('');
      loadLoans();
    } catch (err) {
      alert(err.message || 'Failed to request loan');
    } finally {
      setSubmittingLoan(false);
    }
  };

  const handleApprove = async () => {
    if (!approveTarget) return;
    try {
      setActionLoading(true);
      await loanService.approveLoan(activeGroup._id || activeGroup.id, approveTarget._id);
      setApproveTarget(null);
      loadLoans();
    } catch (err) {
      alert(err.message || 'Loan approval failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    try {
      setActionLoading(true);
      await loanService.rejectLoan(activeGroup._id || activeGroup.id, rejectTarget._id, rejectionReason);
      setRejectTarget(null);
      setRejectionReason('');
      loadLoans();
    } catch (err) {
      alert(err.message || 'Loan rejection failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisburse = async (e) => {
    e.preventDefault();
    if (!disburseTarget) return;
    try {
      setDisbursing(true);
      await loanService.disburseLoan(activeGroup._id || activeGroup.id, disburseTarget._id, {
        disbursementMethod: disburseMethod,
        reference: disburseRef,
      });
      setDisburseTarget(null);
      setDisburseRef('');
      loadLoans();
    } catch (err) {
      alert(err.message || 'Disbursement failed');
    } finally {
      setDisbursing(false);
    }
  };

  const handleRepay = async (e) => {
    e.preventDefault();
    if (!repayTarget) return;
    try {
      setRepaying(true);
      const res = await loanService.repayLoan(activeGroup._id || activeGroup.id, repayTarget._id, {
        amount: Number(repayAmount),
        paymentMethod: repayMethod,
        reference: repayRef,
      });
      setRepayTarget(null);
      setRepayAmount('');
      setRepayRef('');
      loadLoans();

      if (res.receiptNumber) {
        setReceiptData({
          receiptNumber: res.receiptNumber,
          transactionId: res.transactionId,
          group: {
            name: activeGroup?.name,
            code: activeGroup?.code,
            location: `${activeGroup?.villageTown}, ${activeGroup?.district}`,
          },
          member: {
            name: repayTarget.memberId?.userId?.name || user?.name,
            number: repayTarget.memberId?.memberNumber || 'N/A',
          },
          payment: {
            amount: Number(repayAmount),
            amountInWords: '',
            purpose: `Loan Repayment (${repayTarget.loanId})`,
            method: repayMethod,
            date: formatDate(new Date()),
          },
          issuer: { recordedBy: user?.name || 'Group Head' },
          disclaimer: 'This is an internal Self-Help Group record. Not an official government document.',
        });
      }
    } catch (err) {
      alert(err.message || 'Repayment failed');
    } finally {
      setRepaying(false);
    }
  };

  const handleViewSchedule = async (loan) => {
    try {
      setSelectedLoanDetails(loan);
      setLoadingSchedule(true);
      const data = await loanService.getLoanDetails(activeGroup._id || activeGroup.id, loan._id);
      if (data.success) {
        setInstallments(data.installments || []);
      }
    } catch (err) {
      alert(err.message || 'Failed to load schedule');
    } finally {
      setLoadingSchedule(false);
    }
  };

  const columns = [
    {
      header: 'Loan ID & Member',
      accessor: 'loanId',
      render: (row) => (
        <div>
          <span className="font-mono text-slate-800 font-bold text-xs">{row.loanId}</span>
          <p className="font-semibold text-slate-700 text-xs">
            {row.memberId?.userId?.name || 'Member'}
          </p>
          <p className="text-[11px] text-slate-400 truncate max-w-xs">{row.purpose}</p>
        </div>
      ),
    },
    {
      header: 'Principal',
      accessor: 'principal',
      align: 'right',
      render: (row) => (
        <div>
          <span className="font-bold text-slate-900 text-sm">{formatCurrency(row.principal)}</span>
          <p className="text-[10px] text-slate-500 font-medium">{row.tenureMonths} Mo @ {row.interestRate}%</p>
        </div>
      ),
    },
    {
      header: 'Monthly EMI',
      accessor: 'emiAmount',
      align: 'right',
      render: (row) => (
        <span className="font-bold text-emerald-800 text-xs">{formatCurrency(row.emiAmount)}</span>
      ),
    },
    {
      header: 'Outstanding',
      accessor: 'outstandingPrincipal',
      align: 'right',
      render: (row) => (
        <div>
          <span className="font-bold text-indigo-900 text-xs">
            {formatCurrency(row.outstandingPrincipal)}
          </span>
          <p className="text-[10px] text-slate-400">Repaid: {formatCurrency(row.totalRepaid || 0)}</p>
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: 'status',
      align: 'center',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      header: 'Actions',
      accessor: 'actions',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          {/* Schedule Button */}
          <button
            onClick={() => handleViewSchedule(row)}
            className="p-1.5 text-xs text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/70 rounded-lg transition-colors"
            title="View Repayment Schedule"
          >
            <Layers className="w-3.5 h-3.5" />
          </button>

          {/* HEAD Approval Actions */}
          {isHead && row.status === 'REQUESTED' && (
            <>
              <button
                onClick={() => setApproveTarget(row)}
                className="px-2 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
              >
                Approve
              </button>
              <button
                onClick={() => setRejectTarget(row)}
                className="px-2 py-1 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors"
              >
                Reject
              </button>
            </>
          )}

          {/* HEAD Disburse Action */}
          {isHead && row.status === 'APPROVED' && (
            <button
              onClick={() => {
                setDisburseTarget(row);
                setDisburseRef(`DISB-${row.loanId}`);
              }}
              className="px-2.5 py-1 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"
            >
              Disburse
            </button>
          )}

          {/* Repay Action for Disbursed Loans */}
          {row.status === 'DISBURSED' && (
            <button
              onClick={() => {
                setRepayTarget(row);
                setRepayAmount(row.emiAmount);
              }}
              className="px-2.5 py-1 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
            >
              Repay EMI
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('loans.title')}
        subtitle={t('loans.subtitle')}
        actionButton={
          <button
            onClick={() => setShowRequestModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-sm transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            Apply for Loan
          </button>
        }
      />

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2">
        {['ALL', 'REQUESTED', 'APPROVED', 'DISBURSED', 'CLOSED', 'REJECTED'].map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setStatusFilter(tab);
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              statusFilter === tab
                ? 'bg-emerald-800 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingState message="Loading loan portfolio and amortization records..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadLoans} />
      ) : (
        <DataTable
          columns={columns}
          data={loans}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          onRowClick={handleViewSchedule}
          emptyTitle="No loans found"
          emptyDescription="There are no loan applications in this state."
        />
      )}

      {/* Request Loan Modal */}
      <Modal
        isOpen={showRequestModal}
        onClose={() => setShowRequestModal(false)}
        title={t('loans.requestModalTitle')}
      >
        <form onSubmit={handleRequestLoan} className="space-y-4">
          {isHead && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Select Member *
              </label>
              <select
                required
                value={loanMemberId}
                onChange={(e) => setLoanMemberId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600"
              >
                {membersList.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.userId?.name} ({m.memberNumber || 'N/A'})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Principal Amount (₹) *
              </label>
              <input
                type="number"
                required
                min="500"
                value={loanPrincipal}
                onChange={(e) => setLoanPrincipal(e.target.value)}
                placeholder="10000"
                className="w-full px-3 py-2 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600 font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Tenure (Months) *
              </label>
              <select
                value={loanTenure}
                onChange={(e) => setLoanTenure(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600 font-bold"
              >
                <option value="6">6 Months</option>
                <option value="12">12 Months</option>
                <option value="18">18 Months</option>
                <option value="24">24 Months</option>
                <option value="36">36 Months</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Annual Interest Rate (%)
              </label>
              <input
                type="number"
                min="0"
                max="36"
                value={loanInterestRate}
                onChange={(e) => setLoanInterestRate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Interest Method
              </label>
              <select
                value={loanInterestMethod}
                onChange={(e) => setLoanInterestMethod(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600"
              >
                <option value="REDUCING_BALANCE">Reducing Balance (Standard EMI)</option>
                <option value="SIMPLE_INTEREST">Simple Flat Interest</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Loan Purpose *
            </label>
            <input
              type="text"
              required
              value={loanPurpose}
              onChange={(e) => setLoanPurpose(e.target.value)}
              placeholder="e.g. Purchase of tailoring machine, cattle feed, shop stock"
              className="w-full px-3 py-2 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => setShowRequestModal(false)}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border rounded-xl hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingLoan}
              className="px-4 py-2 text-sm font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-sm disabled:opacity-50"
            >
              {submittingLoan ? 'Submitting...' : 'Submit Loan Application'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Disburse Loan Modal (Separate Action from Approval!) */}
      {disburseTarget && (
        <Modal
          isOpen={Boolean(disburseTarget)}
          onClose={() => setDisburseTarget(null)}
          title="Disburse Approved Loan Funds"
        >
          <form onSubmit={handleDisburse} className="space-y-4">
            <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-900 space-y-1">
              <p className="font-bold">Disbursement Details:</p>
              <p>Member: {disburseTarget.memberId?.userId?.name}</p>
              <p>Loan Amount: <strong>{formatCurrency(disburseTarget.principal)}</strong></p>
              <p className="text-[11px] text-indigo-700">
                Disbursing will create a ledger movement, deducting funds from the selected source account.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Disbursement Method *
              </label>
              <select
                value={disburseMethod}
                onChange={(e) => setDisburseMethod(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600"
              >
                <option value="BANK_TRANSFER">Bank Transfer (Deducts from Bank Balance)</option>
                <option value="CASH">Cash in Hand (Deducts from Cash on Hand)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Transaction / UTR Reference
              </label>
              <input
                type="text"
                value={disburseRef}
                onChange={(e) => setDisburseRef(e.target.value)}
                placeholder="e.g. UTR-9948214"
                className="w-full px-3 py-2 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600 font-mono"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={() => setDisburseTarget(null)}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border rounded-xl hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={disbursing}
                className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm disabled:opacity-50"
              >
                {disbursing ? 'Disbursing...' : 'Confirm Loan Disbursement'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Repay Loan Modal */}
      {repayTarget && (
        <Modal
          isOpen={Boolean(repayTarget)}
          onClose={() => setRepayTarget(null)}
          title="Record Loan Repayment (EMI)"
        >
          <form onSubmit={handleRepay} className="space-y-4">
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1">
              <p className="font-bold">Repayment Details:</p>
              <p>Loan: {repayTarget.loanId} • {repayTarget.memberId?.userId?.name}</p>
              <p>Outstanding Principal: {formatCurrency(repayTarget.outstandingPrincipal)}</p>
              <p>Standard Monthly EMI: <strong>{formatCurrency(repayTarget.emiAmount)}</strong></p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Repayment Amount (₹) *
              </label>
              <input
                type="number"
                required
                min="1"
                value={repayAmount}
                onChange={(e) => setRepayAmount(e.target.value)}
                placeholder="Amount to repay"
                className="w-full px-3 py-2 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600 font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Payment Mode *
              </label>
              <select
                value={repayMethod}
                onChange={(e) => setRepayMethod(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600"
              >
                <option value="CASH">Cash (Increases Cash on Hand)</option>
                <option value="UPI">UPI / Online (Increases Bank Balance)</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Reference / Receipt Notes
              </label>
              <input
                type="text"
                value={repayRef}
                onChange={(e) => setRepayRef(e.target.value)}
                placeholder="Optional reference"
                className="w-full px-3 py-2 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={() => setRepayTarget(null)}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border rounded-xl hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={repaying}
                className="px-4 py-2 text-sm font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-sm disabled:opacity-50"
              >
                {repaying ? 'Recording...' : 'Record Payment & Generate Receipt'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Repayment Schedule & Amortization Modal */}
      {selectedLoanDetails && (
        <Modal
          isOpen={Boolean(selectedLoanDetails)}
          onClose={() => setSelectedLoanDetails(null)}
          title={`Loan Schedule - ${selectedLoanDetails.loanId}`}
          maxWidth="max-w-3xl"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-xl text-xs">
              <div>
                <span className="text-slate-400 uppercase text-[10px]">Principal</span>
                <p className="font-bold text-slate-800">{formatCurrency(selectedLoanDetails.principal)}</p>
              </div>
              <div>
                <span className="text-slate-400 uppercase text-[10px]">Monthly EMI</span>
                <p className="font-bold text-emerald-800">{formatCurrency(selectedLoanDetails.emiAmount)}</p>
              </div>
              <div>
                <span className="text-slate-400 uppercase text-[10px]">Total Repaid</span>
                <p className="font-bold text-slate-800">{formatCurrency(selectedLoanDetails.totalRepaid || 0)}</p>
              </div>
              <div>
                <span className="text-slate-400 uppercase text-[10px]">Outstanding</span>
                <p className="font-bold text-indigo-900">{formatCurrency(selectedLoanDetails.outstandingPrincipal)}</p>
              </div>
            </div>

            {loadingSchedule ? (
              <LoadingState message="Loading installment breakdown..." />
            ) : installments.length > 0 ? (
              <div className="overflow-x-auto border rounded-xl">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-[10px] uppercase font-semibold text-slate-500 border-b">
                    <tr>
                      <th className="px-3.5 py-2.5">#</th>
                      <th className="px-3.5 py-2.5">Due Date</th>
                      <th className="px-3.5 py-2.5 text-right">Principal</th>
                      <th className="px-3.5 py-2.5 text-right">Interest</th>
                      <th className="px-3.5 py-2.5 text-right">EMI Due</th>
                      <th className="px-3.5 py-2.5 text-right">Paid</th>
                      <th className="px-3.5 py-2.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {installments.map((inst) => (
                      <tr key={inst._id} className="hover:bg-slate-50/50">
                        <td className="px-3.5 py-2.5 font-bold">{inst.installmentNumber}</td>
                        <td className="px-3.5 py-2.5">{formatDate(inst.dueDate)}</td>
                        <td className="px-3.5 py-2.5 text-right font-mono">{formatCurrency(inst.principalAmount)}</td>
                        <td className="px-3.5 py-2.5 text-right font-mono">{formatCurrency(inst.interestAmount)}</td>
                        <td className="px-3.5 py-2.5 text-right font-bold text-slate-800 font-mono">{formatCurrency(inst.emiAmount)}</td>
                        <td className="px-3.5 py-2.5 text-right font-semibold text-emerald-800 font-mono">{formatCurrency(inst.paidAmount)}</td>
                        <td className="px-3.5 py-2.5 text-center">
                          <StatusBadge status={inst.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="py-6 text-center text-xs text-slate-400">
                Repayment schedule will activate once the loan is approved and disbursed.
              </p>
            )}
          </div>
        </Modal>
      )}

      {/* Confirmation Dialogs for Approve / Reject */}
      {approveTarget && (
        <ConfirmDialog
          isOpen={Boolean(approveTarget)}
          onClose={() => setApproveTarget(null)}
          onConfirm={handleApprove}
          title="Approve Loan Application"
          message={`Approve ${approveTarget.loanId} for ${approveTarget.memberId?.userId?.name} (Amount: ${formatCurrency(approveTarget.principal)})? This will generate the installment repayment schedule.`}
          confirmText="Approve Loan"
          loading={actionLoading}
        />
      )}

      {rejectTarget && (
        <Modal
          isOpen={Boolean(rejectTarget)}
          onClose={() => setRejectTarget(null)}
          title="Reject Loan Application"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600">
              Please enter the reason for rejecting loan {rejectTarget.loanId} of {formatCurrency(rejectTarget.principal)}:
            </p>
            <input
              type="text"
              required
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Existing active loan pending closure"
              className="w-full px-3 py-2 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-rose-600"
            />
            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={() => setRejectTarget(null)}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border rounded-xl hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={actionLoading || !rejectionReason}
                className="px-4 py-2 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm disabled:opacity-50"
              >
                {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Digital Receipt Modal for Repayments */}
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
