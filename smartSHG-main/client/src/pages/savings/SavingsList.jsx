import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { savingsService } from '../../services/savingsService';
import { memberService } from '../../services/memberService';
import { PageHeader } from '../../components/common/PageHeader';
import { SummaryCard } from '../../components/common/SummaryCard';
import { DataTable } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { ReceiptModal } from '../../components/common/ReceiptModal';
import { LoadingState, ErrorState } from '../../components/common/FeedbackStates';
import { formatCurrency, formatDate, formatPeriod } from '../../utils/formatters';
import {
  PiggyBank,
  PlusCircle,
  CreditCard,
  FileCheck2,
  Calendar,
  CheckCircle,
  AlertCircle,
  Clock,
  Printer,
} from 'lucide-react';

export const SavingsList = () => {
  const { t } = useTranslation();
  const { activeGroup, isHead, user } = useAuth();

  const [activeTab, setActiveTab] = useState('records'); // 'records' or 'matrix'
  const [savings, setSavings] = useState([]);
  const [matrixData, setMatrixData] = useState(null);
  const [memberSavingsSummary, setMemberSavingsSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Period filter
  const currentPeriodStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const [selectedPeriod, setSelectedPeriod] = useState(currentPeriodStr);

  // Record Savings Modal
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [membersList, setMembersList] = useState([]);
  const [recordMemberId, setRecordMemberId] = useState('');
  const [recordAmount, setRecordAmount] = useState(500);
  const [recordPeriod, setRecordPeriod] = useState(currentPeriodStr);
  const [recordMethod, setRecordMethod] = useState('CASH');
  const [recordNotes, setRecordNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Receipt Modal
  const [activeReceipt, setActiveReceipt] = useState(null);

  const loadData = async () => {
    if (!activeGroup) return;
    try {
      setLoading(true);
      setError('');

      if (isHead) {
        const [savingsRes, summaryRes, membersRes] = await Promise.all([
          savingsService.listSavings(activeGroup._id || activeGroup.id, {
            period: selectedPeriod || undefined,
            page,
            limit: 20,
          }),
          savingsService.getSavingsSummary(activeGroup._id || activeGroup.id, selectedPeriod),
          memberService.listMembers(activeGroup._id || activeGroup.id, { status: 'ACTIVE' }),
        ]);

        if (savingsRes.success) {
          setSavings(savingsRes.savings);
          setTotalPages(savingsRes.totalPages);
        }
        if (summaryRes.success) {
          setMatrixData(summaryRes);
        }
        if (membersRes.success) {
          setMembersList(membersRes.members);
          if (membersRes.members.length > 0 && !recordMemberId) {
            setRecordMemberId(membersRes.members[0]._id);
          }
        }
      } else {
        // Member view
        const memberRes = await savingsService.getMySavings(activeGroup._id || activeGroup.id);
        if (memberRes.success) {
          setMemberSavingsSummary(memberRes.summary);
          setSavings(memberRes.history);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load savings records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeGroup, selectedPeriod, page]);

  const handleRecordSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await savingsService.recordSavings(activeGroup._id || activeGroup.id, {
        memberId: recordMemberId,
        amount: Number(recordAmount),
        period: recordPeriod,
        paymentMethod: recordMethod,
        notes: recordNotes,
      });

      setShowRecordModal(false);
      setRecordNotes('');
      if (res.receipt) {
        setActiveReceipt(res.receipt);
      }
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to record savings');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      header: 'Receipt & Period',
      accessor: 'receiptNumber',
      render: (row) => (
        <div>
          <span className="font-bold text-slate-800 text-xs">{row.receiptNumber}</span>
          <p className="text-[11px] text-emerald-800 font-semibold">{formatPeriod(row.period)}</p>
        </div>
      ),
    },
    ...(isHead
      ? [
          {
            header: 'Member',
            accessor: 'memberId',
            render: (row) => (
              <div>
                <p className="font-semibold text-slate-800 text-xs">
                  {row.memberId?.userId?.name || 'Member'}
                </p>
                <p className="text-[10px] text-slate-400 font-mono">
                  {row.memberId?.memberNumber}
                </p>
              </div>
            ),
          },
        ]
      : []),
    {
      header: 'Amount',
      accessor: 'amount',
      align: 'right',
      render: (row) => (
        <span className="font-bold text-emerald-800 text-sm">
          {formatCurrency(row.amount)}
        </span>
      ),
    },
    {
      header: 'Payment Mode',
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
      header: 'Actions',
      accessor: 'actions',
      align: 'right',
      render: (row) => (
        <button
          onClick={() =>
            setActiveReceipt({
              receiptNumber: row.receiptNumber,
              transactionId: row.transactionId,
              group: {
                name: activeGroup?.name,
                code: activeGroup?.code,
                location: `${activeGroup?.villageTown}, ${activeGroup?.district}`,
              },
              member: {
                name: isHead ? row.memberId?.userId?.name : user?.name,
                number: row.memberId?.memberNumber || 'N/A',
              },
              payment: {
                amount: row.amount,
                amountInWords: '',
                purpose: `Monthly Savings (${formatPeriod(row.period)})`,
                method: row.paymentMethod,
                date: formatDate(row.date),
                notes: row.notes,
              },
              issuer: { recordedBy: row.recordedBy?.name || 'Group Head' },
              disclaimer:
                'This is an internal Self-Help Group computerized record. Not an official government treasury receipt.',
            })
          }
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
        >
          <Printer className="w-3.5 h-3.5" />
          Receipt
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('savings.title')}
        subtitle={t('savings.subtitle')}
        actionButton={
          isHead ? (
            <button
              onClick={() => setShowRecordModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-sm transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              {t('dashboard.recordSavings')}
            </button>
          ) : null
        }
      />

      {/* Summary KPI Cards */}
      {isHead && matrixData?.summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SummaryCard
            title={`${formatPeriod(selectedPeriod)} Target`}
            value={formatCurrency(matrixData.summary.groupExpected)}
            subtitle={`${matrixData.summary.totalActiveMembers} active members × ₹${matrixData.summary.expectedPerMember}`}
            icon={PiggyBank}
            color="slate"
          />
          <SummaryCard
            title="Collected This Month"
            value={formatCurrency(matrixData.summary.groupCollected)}
            subtitle={`${matrixData.summary.fullyPaidCount} fully paid, ${matrixData.summary.partialCount} partial`}
            icon={CheckCircle}
            color="emerald"
          />
          <SummaryCard
            title="Pending Collection"
            value={formatCurrency(matrixData.summary.groupPending)}
            subtitle={`${matrixData.summary.pendingCount} members pending`}
            icon={Clock}
            color={matrixData.summary.groupPending > 0 ? 'amber' : 'emerald'}
          />
        </div>
      )}

      {/* Member View KPI Cards */}
      {!isHead && memberSavingsSummary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SummaryCard
            title="Total Lifetime Savings"
            value={formatCurrency(memberSavingsSummary.totalSavings)}
            subtitle="Your accumulated group balance"
            icon={PiggyBank}
            color="emerald"
          />
          <SummaryCard
            title={`Paid: ${formatPeriod(memberSavingsSummary.currentPeriod)}`}
            value={formatCurrency(memberSavingsSummary.currentMonthPaid)}
            subtitle={`Monthly expected: ₹${memberSavingsSummary.monthlyExpected}`}
            icon={CheckCircle}
            color={memberSavingsSummary.currentMonthPaid >= memberSavingsSummary.monthlyExpected ? 'emerald' : 'amber'}
          />
          <SummaryCard
            title="Pending for this Month"
            value={formatCurrency(memberSavingsSummary.currentMonthPending)}
            subtitle={memberSavingsSummary.currentMonthPending === 0 ? '✓ Complete' : 'Due by 10th'}
            icon={Clock}
            color={memberSavingsSummary.currentMonthPending === 0 ? 'slate' : 'amber'}
          />
        </div>
      )}

      {/* Toggle View for Head: Transaction List vs Member Matrix */}
      {isHead && (
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('records')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                activeTab === 'records'
                  ? 'bg-emerald-800 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              All Transaction Records
            </button>
            <button
              onClick={() => setActiveTab('matrix')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                activeTab === 'matrix'
                  ? 'bg-emerald-800 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Member-wise Monthly Status
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Period:</span>
            <input
              type="month"
              value={selectedPeriod}
              onChange={(e) => {
                setSelectedPeriod(e.target.value);
                setPage(1);
              }}
              className="text-xs px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>
        </div>
      )}

      {loading ? (
        <LoadingState message="Loading savings ledger..." />
      ) : error ? (
        <ErrorState message={error} onRetry={loadData} />
      ) : isHead && activeTab === 'matrix' ? (
        /* Member-wise Monthly Matrix Table */
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
              {formatPeriod(selectedPeriod)} Member Savings Collection Status
            </h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/80 text-[10px] uppercase font-semibold text-slate-500 border-b">
                <tr>
                  <th className="px-5 py-3">Member</th>
                  <th className="px-5 py-3 text-right">Expected</th>
                  <th className="px-5 py-3 text-right">Collected</th>
                  <th className="px-5 py-3 text-right">Pending</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {matrixData?.members?.map((m) => (
                  <tr key={m.memberId} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-bold text-slate-800">{m.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{m.memberNumber} • {m.phone}</p>
                    </td>
                    <td className="px-5 py-3.5 text-right font-medium">{formatCurrency(m.expected)}</td>
                    <td className="px-5 py-3.5 text-right font-bold text-emerald-800">{formatCurrency(m.paid)}</td>
                    <td className="px-5 py-3.5 text-right font-semibold text-amber-700">{formatCurrency(m.pending)}</td>
                    <td className="px-5 py-3.5 text-center">
                      <StatusBadge status={m.status} text={m.status === 'PAID' ? 'Fully Paid' : m.status === 'PARTIAL' ? 'Partial' : 'Pending'} />
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => {
                          setRecordMemberId(m.memberId);
                          setRecordAmount(m.pending > 0 ? m.pending : 500);
                          setRecordPeriod(selectedPeriod);
                          setShowRecordModal(true);
                        }}
                        className="px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg"
                      >
                        + Collect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Regular Transaction History List */
        <DataTable
          columns={columns}
          data={savings}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          emptyTitle="No savings records found"
          emptyDescription="There are no savings records recorded for this selection."
        />
      )}

      {/* Record Savings Modal (HEAD only) */}
      <Modal
        isOpen={showRecordModal}
        onClose={() => setShowRecordModal(false)}
        title={t('savings.recordModalTitle')}
      >
        <form onSubmit={handleRecordSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Select Member *
            </label>
            <select
              required
              value={recordMemberId}
              onChange={(e) => setRecordMemberId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600"
            >
              {membersList.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.userId?.name} ({m.memberNumber || 'N/A'})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Amount (₹) *
              </label>
              <input
                type="number"
                required
                min="1"
                value={recordAmount}
                onChange={(e) => setRecordAmount(e.target.value)}
                placeholder="500"
                className="w-full px-3 py-2 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600 font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Savings Period *
              </label>
              <input
                type="month"
                required
                value={recordPeriod}
                onChange={(e) => setRecordPeriod(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Payment Method *
            </label>
            <select
              value={recordMethod}
              onChange={(e) => setRecordMethod(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600"
            >
              <option value="CASH">Cash (Increases Cash on Hand)</option>
              <option value="UPI">UPI / QR (Increases Bank Balance)</option>
              <option value="BANK_TRANSFER">Direct Bank Transfer</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
              Notes / Remarks
            </label>
            <input
              type="text"
              value={recordNotes}
              onChange={(e) => setRecordNotes(e.target.value)}
              placeholder="e.g. Paid during monthly group meeting"
              className="w-full px-3 py-2 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => setShowRecordModal(false)}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border rounded-xl hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-sm disabled:opacity-50"
            >
              {submitting ? 'Recording...' : 'Confirm & Generate Receipt'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Digital Receipt Modal */}
      {activeReceipt && (
        <ReceiptModal
          isOpen={Boolean(activeReceipt)}
          onClose={() => setActiveReceipt(null)}
          receipt={activeReceipt}
        />
      )}
    </div>
  );
};
