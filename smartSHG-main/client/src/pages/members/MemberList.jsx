import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { memberService } from '../../services/memberService';
import { PageHeader } from '../../components/common/PageHeader';
import { DataTable } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { LoadingState, ErrorState } from '../../components/common/FeedbackStates';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { UserPlus, Check, X, Shield, Phone, Mail, UserCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const MemberList = () => {
  const { t } = useTranslation();
  const { activeGroup, isHead } = useAuth();
  const navigate = useNavigate();

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Add Member Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newDesignation, setNewDesignation] = useState('MEMBER');
  const [addingMember, setAddingMember] = useState(false);

  // Confirm Action (Approve / Reject) State
  const [confirmData, setConfirmData] = useState(null); // { action: 'approve'|'reject', memberId, memberName }
  const [actionLoading, setActionLoading] = useState(false);

  const fetchMembers = async () => {
    if (!activeGroup) return;
    try {
      setLoading(true);
      setError('');
      const data = await memberService.listMembers(activeGroup._id || activeGroup.id, {
        status: statusFilter,
        search,
        page,
        limit: 20,
      });
      if (data.success) {
        setMembers(data.members);
        setTotalPages(data.totalPages);
      }
    } catch (err) {
      setError(err.message || 'Failed to load member list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [activeGroup, statusFilter, page]);

  const handleSearchSubmit = (val) => {
    setSearch(val);
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    try {
      setAddingMember(true);
      await memberService.addMember(activeGroup._id || activeGroup.id, {
        name: newName,
        phone: newPhone,
        email: newEmail || undefined,
        designation: newDesignation,
      });
      setShowAddModal(false);
      setNewName('');
      setNewPhone('');
      setNewEmail('');
      fetchMembers();
    } catch (err) {
      alert(err.message || 'Failed to add member');
    } finally {
      setAddingMember(false);
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmData) return;
    try {
      setActionLoading(true);
      if (confirmData.action === 'approve') {
        await memberService.approveMember(activeGroup._id || activeGroup.id, confirmData.memberId);
      } else {
        await memberService.rejectMember(activeGroup._id || activeGroup.id, confirmData.memberId);
      }
      setConfirmData(null);
      fetchMembers();
    } catch (err) {
      alert(err.message || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const columns = [
    {
      header: 'Member Name',
      accessor: 'name',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center">
            {row.userId?.name?.charAt(0) || 'M'}
          </div>
          <div>
            <p className="font-bold text-slate-800 text-xs">{row.userId?.name}</p>
            <p className="text-[10px] text-slate-400 font-mono">{row.memberNumber || 'Pending ID'}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Designation',
      accessor: 'designation',
      render: (row) => (
        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
          {row.designation}
        </span>
      ),
    },
    {
      header: 'Contact',
      accessor: 'phone',
      render: (row) => (
        <div className="text-xs text-slate-600">
          <p>{row.userId?.phone || '-'}</p>
        </div>
      ),
    },
    {
      header: 'Total Savings',
      accessor: 'totalSavings',
      align: 'right',
      render: (row) => (
        <span className="font-bold text-emerald-800 text-xs">
          {formatCurrency(row.totalSavings || 0)}
        </span>
      ),
    },
    {
      header: 'Outstanding Loan',
      accessor: 'outstandingLoan',
      align: 'right',
      render: (row) => (
        <span className={`text-xs font-semibold ${row.outstandingLoan > 0 ? 'text-indigo-800' : 'text-slate-400'}`}>
          {formatCurrency(row.outstandingLoan || 0)}
        </span>
      ),
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
            render: (row) => (
              <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                {row.status === 'PENDING' ? (
                  <>
                    <button
                      onClick={() =>
                        setConfirmData({
                          action: 'approve',
                          memberId: row._id,
                          memberName: row.userId?.name,
                        })
                      }
                      className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      title="Approve Member"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() =>
                        setConfirmData({
                          action: 'reject',
                          memberId: row._id,
                          memberName: row.userId?.name,
                        })
                      }
                      className="p-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100"
                      title="Reject Request"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => navigate(`/reports/member-statement/${row._id}`)}
                    className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 px-2 py-1 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                  >
                    Statement
                  </button>
                )}
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('nav.members')}
        subtitle="Self-Help Group membership directory and roster"
        actionButton={
          isHead && (
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-sm transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Add Member
            </button>
          )
        }
      />

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2">
        {['ALL', 'ACTIVE', 'PENDING', 'INACTIVE'].map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setStatusFilter(tab);
              setPage(1);
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              statusFilter === tab
                ? 'bg-emerald-800 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab === 'ALL' ? 'All Members' : tab}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingState message="Loading group member roster..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchMembers} />
      ) : (
        <DataTable
          columns={columns}
          data={members}
          searchValue={search}
          onSearchChange={handleSearchSubmit}
          searchPlaceholder="Search by member name, phone or ID..."
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          onRowClick={(row) => navigate(`/reports/member-statement/${row._id}`)}
          emptyTitle="No members found"
          emptyDescription="There are no members matching this filter."
        />
      )}

      {/* Add Member Modal (HEAD only) */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add New SHG Member">
        <form onSubmit={handleAddMember} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Full Name *</label>
            <input
              type="text"
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Kumari Devi"
              className="w-full px-3 py-2 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">10-Digit Mobile Number *</label>
            <input
              type="tel"
              required
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              placeholder="9876543210"
              className="w-full px-3 py-2 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Email Address (Optional)</label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="member@example.com"
              className="w-full px-3 py-2 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Designation</label>
            <select
              value={newDesignation}
              onChange={(e) => setNewDesignation(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600"
            >
              <option value="MEMBER">Member</option>
              <option value="SECRETARY">Secretary</option>
              <option value="TREASURER">Treasurer</option>
              <option value="PRESIDENT">President</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border rounded-xl hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={addingMember}
              className="px-4 py-2 text-sm font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-sm disabled:opacity-50"
            >
              {addingMember ? 'Saving...' : 'Add Member to SHG'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Approve / Reject Dialog */}
      {confirmData && (
        <ConfirmDialog
          isOpen={Boolean(confirmData)}
          onClose={() => setConfirmData(null)}
          onConfirm={handleConfirmAction}
          title={confirmData.action === 'approve' ? 'Approve Member Application' : 'Reject Member Request'}
          message={`Are you sure you want to ${confirmData.action} ${confirmData.memberName}'s membership request?`}
          confirmText={confirmData.action === 'approve' ? 'Approve Member' : 'Reject Request'}
          isDestructive={confirmData.action === 'reject'}
          loading={actionLoading}
        />
      )}
    </div>
  );
};
