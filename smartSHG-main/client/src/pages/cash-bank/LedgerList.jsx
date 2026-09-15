import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { ledgerService } from '../../services/ledgerService';
import { PageHeader } from '../../components/common/PageHeader';
import { SummaryCard } from '../../components/common/SummaryCard';
import { DataTable } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { LoadingState, ErrorState } from '../../components/common/FeedbackStates';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  Wallet,
  Landmark,
  PiggyBank,
  HandCoins,
  ArrowUpRight,
  ArrowDownRight,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';

export const LedgerList = () => {
  const { t } = useTranslation();
  const { activeGroup, isHead } = useAuth();

  const [balances, setBalances] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [accountFilter, setAccountFilter] = useState('ALL');

  // Bank Deposit Modal
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositRef, setDepositRef] = useState('');
  const [depositNotes, setDepositNotes] = useState('');
  const [submittingDeposit, setSubmittingDeposit] = useState(false);

  // Bank Withdrawal Modal
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawRef, setWithdrawRef] = useState('');
  const [withdrawNotes, setWithdrawNotes] = useState('');
  const [submittingWithdraw, setSubmittingWithdraw] = useState(false);

  // Bank Reconciliation Modal
  const [showReconcileModal, setShowReconcileModal] = useState(false);
  const [passbookBalance, setPassbookBalance] = useState('');
  const [reconcileExplanation, setReconcileExplanation] = useState('');
  const [submittingReconcile, setSubmittingReconcile] = useState(false);

  // Reversal Modal
  const [reversalTarget, setReversalTarget] = useState(null);
  const [reversalReason, setReversalReason] = useState('');
  const [submittingReversal, setSubmittingReversal] = useState(false);

  const loadData = async () => {
    if (!activeGroup) return;
    try {
      setLoading(true);
      setError('');
      const [balRes, txRes] = await Promise.all([
        ledgerService.getBalances(activeGroup._id || activeGroup.id),
        ledgerService.listTransactions(activeGroup._id || activeGroup.id, {
          type: typeFilter !== 'ALL' ? typeFilter : undefined,
          account: accountFilter !== 'ALL' ? accountFilter : undefined,
          page,
          limit: 20,
        }),
      ]);

      if (balRes.success) setBalances(balRes.balances);
      if (txRes.success) {
        setTransactions(txRes.transactions);
        setTotalPages(txRes.totalPages);
      }
    } catch (err) {
      setError(err.message || 'Failed to load ledger data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeGroup, typeFilter, accountFilter, page]);

  const handleDeposit = async (e) => {
    e.preventDefault();
    try {
      setSubmittingDeposit(true);
      await ledgerService.depositCash(activeGroup._id || activeGroup.id, {
        amount: Number(depositAmount),
        reference: depositRef,
        notes: depositNotes,
      });
      setShowDepositModal(false);
      setDepositAmount('');
      setDepositRef('');
      setDepositNotes('');
      loadData();
    } catch (err) {
      alert(err.message || 'Deposit failed');
    } finally {
      setSubmittingDeposit(false);
    }
  };

  const handleWithdrawal = async (e) => {
    e.preventDefault();
    try {
      setSubmittingWithdraw(true);
      await ledgerService.withdrawCash(activeGroup._id || activeGroup.id, {
        amount: Number(withdrawAmount),
        reference: withdrawRef,
        notes: withdrawNotes,
      });
      setShowWithdrawalModal(false);
      setWithdrawAmount('');
      setWithdrawRef('');
      setWithdrawNotes('');
      loadData();
    } catch (err) {
      alert(err.message || 'Withdrawal failed');
    } finally {
      setSubmittingWithdraw(false);
    }
  };

  const handleReconcile = async (e) => {
    e.preventDefault();
    try {
      setSubmittingReconcile(true);
      await ledgerService.reconcileBank(activeGroup._id || activeGroup.id, {
        actualBankBalance: Number(passbookBalance),
        explanation: reconcileExplanation,
      });
      setShowReconcileModal(false);
      setPassbookBalance('');
      setReconcileExplanation('');
      loadData();
    } catch (err) {
      alert(err.message || 'Reconciliation failed');
    } finally {
      setSubmittingReconcile(false);
    }
  };

  const handleReverse = async () => {
    if (!reversalTarget || !reversalReason) return;
    try {
      setSubmittingReversal(true);
      await ledgerService.reverseTransaction(
        activeGroup._id || activeGroup.id,
        reversalTarget.transactionId,
        reversalReason
      );
      setReversalTarget(null);
      setReversalReason('');
      loadData();
    } catch (err) {
      alert(err.message || 'Reversal failed');
    } finally {
      setSubmittingReversal(false);
    }
  };

  const columns = [
    {
      header: 'Transaction ID & Type',
      accessor: 'transactionId',
      render: (row) => (
        <div>
          <span className="font-mono text-slate-800 font-bold text-xs">{row.transactionId}</span>
          <p className="text-[11px] text-slate-500 font-medium">{row.category}</p>
        </div>
      ),
    },
    {
      header: 'Description',
      accessor: 'description',
      render: (row) => (
        <div className="max-w-xs">
          <p className="font-semibold text-slate-800 text-xs truncate">{row.description}</p>
          <span className="text-[10px] text-slate-400 font-mono">
            {row.sourceAccount} &rarr; {row.destinationAccount}
          </span>
        </div>
      ),
    },
    {
      header: 'Amount',
      accessor: 'amount',
      align: 'right',
      render: (row) => {
        const isPositive = ['SAVINGS_COLLECTION', 'LOAN_REPAYMENT', 'BANK_DEPOSIT'].includes(row.transactionType);
        return (
          <span className="font-bold text-sm text-slate-900">
            {formatCurrency(row.amount)}
          </span>
        );
      },
    },
    {
      header: 'Mode',
      accessor: 'paymentMethod',
      render: (row) => (
        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
          {row.paymentMethod}
        </span>
      ),
    },
    {
      header: 'Date',
      accessor: 'date',
      render: (row) => <span className="text-xs text-slate-600">{formatDate(row.date)}</span>,
    },
    {
      header: 'Status',
      accessor: 'status',
      align: 'center',
      render: (row) => <StatusBadge status={row.status} />,
    },
    ...(isHead
      ? [
          {
            header: 'Actions',
            accessor: 'actions',
            align: 'right',
            render: (row) =>
              row.status === 'COMPLETED' && !row.reversalOf ? (
                <button
                  onClick={() => setReversalTarget(row)}
                  className="text-xs font-semibold text-rose-700 hover:text-rose-900 px-2 py-1 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors flex items-center gap-1"
                  title="Reverse Transaction"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reverse
                </button>
              ) : null,
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('ledger.title')}
        subtitle={t('ledger.subtitle')}
        actionButton={
          isHead && (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setShowDepositModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-sm transition-colors"
              >
                <Landmark className="w-4 h-4" />
                Deposit to Bank
              </button>
              <button
                onClick={() => setShowWithdrawalModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors"
              >
                <Wallet className="w-4 h-4" />
                Withdraw Cash
              </button>
              <button
                onClick={() => setShowReconcileModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Passbook Audit
              </button>
            </div>
          )
        }
      />

      {/* Derived Balances Cards */}
      {balances && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard
            title={t('ledger.cashBalance')}
            value={formatCurrency(balances.cashOnHand)}
            subtitle="Derived physically held cash"
            icon={Wallet}
            color="emerald"
          />
          <SummaryCard
            title={t('ledger.bankBalance')}
            value={formatCurrency(balances.bankBalance)}
            subtitle="SBI SHG Savings Account"
            icon={Landmark}
            color="blue"
          />
          <SummaryCard
            title={t('ledger.totalSavings')}
            value={formatCurrency(balances.totalSavingsCollected)}
            subtitle="Accumulated group capital"
            icon={PiggyBank}
            color="amber"
          />
          <SummaryCard
            title="Loan Outstanding"
            value={formatCurrency(balances.outstandingLoanPrincipal)}
            subtitle={`${formatCurrency(balances.totalLoansDisbursed)} disbursed`}
            icon={HandCoins}
            color="indigo"
          />
        </div>
      )}

      {/* Filters Bar */}
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">Filter Type:</span>
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600"
          >
            <option value="ALL">All Types</option>
            <option value="SAVINGS_COLLECTION">Savings Collections</option>
            <option value="BANK_DEPOSIT">Bank Deposits</option>
            <option value="BANK_WITHDRAWAL">Bank Withdrawals</option>
            <option value="LOAN_DISBURSEMENT">Loan Disbursements</option>
            <option value="LOAN_REPAYMENT">Loan Repayments</option>
            <option value="EXPENSE">Expenses</option>
            <option value="ADJUSTMENT">Adjustments / Reversals</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">Account:</span>
          <select
            value={accountFilter}
            onChange={(e) => {
              setAccountFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600"
          >
            <option value="ALL">All Accounts</option>
            <option value="CASH">Cash on Hand</option>
            <option value="BANK">Bank Account</option>
          </select>
        </div>
      </div>

      {loading ? (
        <LoadingState message="Deriving ledger balances from immutable transactions..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadData} />
      ) : (
        <DataTable
          columns={columns}
          data={transactions}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          emptyTitle="No transactions recorded"
          emptyDescription="No financial transaction records match the current filter."
        />
      )}

      {/* Deposit to Bank Modal */}
      <Modal
        isOpen={showDepositModal}
        onClose={() => setShowDepositModal(false)}
        title={t('ledger.depositModalTitle')}
      >
        <form onSubmit={handleDeposit} className="space-y-4">
          <div className="p-3 bg-emerald-50 rounded-xl text-xs text-emerald-800">
            Current Cash on Hand: <strong>{formatCurrency(balances?.cashOnHand || 0)}</strong>.
            Depositing moves funds from vault/cash into the group bank account.
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Deposit Amount (₹) *
            </label>
            <input
              type="number"
              required
              min="1"
              max={balances?.cashOnHand || 999999}
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              placeholder="e.g. 5000"
              className="w-full px-3 py-2 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600 font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Bank Pay-in Slip / Challan Reference
            </label>
            <input
              type="text"
              value={depositRef}
              onChange={(e) => setDepositRef(e.target.value)}
              placeholder="e.g. SBI-CHQ-10492"
              className="w-full px-3 py-2 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Remarks
            </label>
            <input
              type="text"
              value={depositNotes}
              onChange={(e) => setDepositNotes(e.target.value)}
              placeholder="e.g. Deposited monthly collections"
              className="w-full px-3 py-2 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => setShowDepositModal(false)}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border rounded-xl hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingDeposit}
              className="px-4 py-2 text-sm font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-sm disabled:opacity-50"
            >
              {submittingDeposit ? 'Processing...' : 'Confirm Bank Deposit'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Withdraw from Bank Modal */}
      <Modal
        isOpen={showWithdrawalModal}
        onClose={() => setShowWithdrawalModal(false)}
        title={t('ledger.withdrawModalTitle')}
      >
        <form onSubmit={handleWithdrawal} className="space-y-4">
          <div className="p-3 bg-blue-50 rounded-xl text-xs text-blue-800">
            Current Bank Balance: <strong>{formatCurrency(balances?.bankBalance || 0)}</strong>.
            Withdrawing moves money from bank account into group cash on hand.
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Withdrawal Amount (₹) *
            </label>
            <input
              type="number"
              required
              min="1"
              max={balances?.bankBalance || 999999}
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              placeholder="e.g. 2000"
              className="w-full px-3 py-2 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600 font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Cheque / Slip Reference
            </label>
            <input
              type="text"
              value={withdrawRef}
              onChange={(e) => setWithdrawRef(e.target.value)}
              placeholder="e.g. CHQ-99120"
              className="w-full px-3 py-2 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Reason / Remarks
            </label>
            <input
              type="text"
              value={withdrawNotes}
              onChange={(e) => setWithdrawNotes(e.target.value)}
              placeholder="e.g. Cash withdrawn for loan disbursement"
              className="w-full px-3 py-2 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => setShowWithdrawalModal(false)}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border rounded-xl hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingWithdraw}
              className="px-4 py-2 text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-sm disabled:opacity-50"
            >
              {submittingWithdraw ? 'Processing...' : 'Confirm Withdrawal'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Bank Passbook Reconciliation Modal */}
      <Modal
        isOpen={showReconcileModal}
        onClose={() => setShowReconcileModal(false)}
        title={t('ledger.reconcileModalTitle')}
      >
        <form onSubmit={handleReconcile} className="space-y-4">
          <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
            <p className="text-slate-500">System Computed Bank Balance:</p>
            <p className="text-lg font-bold text-slate-900">{formatCurrency(balances?.bankBalance || 0)}</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Actual Passbook Balance (₹) *
            </label>
            <input
              type="number"
              required
              min="0"
              value={passbookBalance}
              onChange={(e) => setPassbookBalance(e.target.value)}
              placeholder="Enter balance from physical passbook"
              className="w-full px-3 py-2 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600 font-bold"
            />
          </div>

          {passbookBalance !== '' && (
            <div className="p-3 rounded-xl border text-xs flex justify-between items-center bg-slate-50">
              <span className="font-semibold text-slate-700">Calculated Difference:</span>
              <span className={`font-bold ${Number(passbookBalance) - (balances?.bankBalance || 0) === 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {formatCurrency(Number(passbookBalance) - (balances?.bankBalance || 0))}
              </span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Reconciliation Notes / Explanation
            </label>
            <textarea
              rows="2"
              value={reconcileExplanation}
              onChange={(e) => setReconcileExplanation(e.target.value)}
              placeholder="e.g. Passbook verified with branch stamp. Interest credit pending."
              className="w-full px-3 py-2 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600"
            ></textarea>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => setShowReconcileModal(false)}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border rounded-xl hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingReconcile}
              className="px-4 py-2 text-sm font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl shadow-sm disabled:opacity-50"
            >
              {submittingReconcile ? 'Saving...' : 'Save Passbook Reconciliation'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Transaction Reversal Modal */}
      {reversalTarget && (
        <Modal
          isOpen={Boolean(reversalTarget)}
          onClose={() => setReversalTarget(null)}
          title="Reverse Financial Transaction"
        >
          <div className="space-y-4">
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
              <p className="font-bold">Important Audit Notice:</p>
              <p>
                Reversing this transaction will create an immutable offsetting adjustment in the ledger. The original entry is not deleted.
              </p>
              <p className="font-mono pt-1">
                {reversalTarget.transactionId} • {formatCurrency(reversalTarget.amount)}
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Reason for Reversal *
              </label>
              <input
                type="text"
                required
                value={reversalReason}
                onChange={(e) => setReversalReason(e.target.value)}
                placeholder="e.g. Incorrect member selected or duplicate voucher"
                className="w-full px-3 py-2 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-rose-600"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={() => setReversalTarget(null)}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border rounded-xl hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReverse}
                disabled={submittingReversal || !reversalReason}
                className="px-4 py-2 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm disabled:opacity-50"
              >
                {submittingReversal ? 'Processing...' : 'Confirm Reversal'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
