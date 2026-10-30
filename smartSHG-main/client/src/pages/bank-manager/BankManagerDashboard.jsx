import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { bankManagerService } from "../../services/bankManagerService";
import { PageHeader } from "../../components/common/PageHeader";
import { SummaryCard } from "../../components/common/SummaryCard";
import { StatusBadge } from "../../components/common/StatusBadge";
import { Modal } from "../../components/common/Modal";
import { LoadingState, ErrorState } from "../../components/common/FeedbackStates";
import { formatCurrency, formatDate } from "../../utils/formatters";
import { Building2, HandCoins, Clock, CheckCircle2, XCircle, Eye, FileCheck } from "lucide-react";

export const BankManagerDashboard = () => {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState(null);
  const [recentApplications, setRecentApplications] = useState([]);
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loanStatusFilter, setLoanStatusFilter] = useState("REQUESTED,UNDER_REVIEW");
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [loanDetail, setLoanDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Review form
  const [reviewStatus, setReviewStatus] = useState("DOCUMENTS_CHECKED");
  const [reviewRemarks, setReviewRemarks] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  // Approve form
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approveTarget, setApproveTarget] = useState(null);
  const [approvedPrincipal, setApprovedPrincipal] = useState("");
  const [approvedRate, setApprovedRate] = useState("");
  const [approvedTenure, setApprovedTenure] = useState("");
  const [approveRemarks, setApproveRemarks] = useState("");
  const [submittingApprove, setSubmittingApprove] = useState(false);

  // Reject form
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [submittingReject, setSubmittingReject] = useState(false);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError("");
      const [dashRes, loansRes] = await Promise.all([
        bankManagerService.getDashboard(),
        bankManagerService.listLoans({ status: loanStatusFilter }),
      ]);
      if (dashRes.success) {
        setMetrics(dashRes.metrics);
        setRecentApplications(dashRes.recentApplications || []);
      }
      if (loansRes.success) setLoans(loansRes.loans || []);
    } catch (err) {
      setError(err.message || "Failed to load Bank Manager dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDashboard(); }, [loanStatusFilter]);

  const handleViewLoan = async (loan) => {
    try {
      setSelectedLoan(loan);
      setLoadingDetail(true);
      const res = await bankManagerService.getLoan(loan._id);
      if (res.success) setLoanDetail(res);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!selectedLoan) return;
    try {
      setSubmittingReview(true);
      await bankManagerService.submitReview(selectedLoan._id, {
        verificationStatus: reviewStatus,
        remarks: reviewRemarks,
      });
      setSelectedLoan(null);
      setReviewRemarks("");
      loadDashboard();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleApproveLoan = async (e) => {
    e.preventDefault();
    if (!approveTarget) return;
    try {
      setSubmittingApprove(true);
      await bankManagerService.approveLoan(approveTarget._id, {
        approvedPrincipal: approvedPrincipal ? Number(approvedPrincipal) : undefined,
        approvedInterestRate: approvedRate ? Number(approvedRate) : undefined,
        approvedTenureMonths: approvedTenure ? Number(approvedTenure) : undefined,
        remarks: approveRemarks,
      });
      setShowApproveModal(false);
      setApproveTarget(null);
      loadDashboard();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmittingApprove(false);
    }
  };

  const handleRejectLoan = async (e) => {
    e.preventDefault();
    if (!rejectTarget) return;
    try {
      setSubmittingReject(true);
      await bankManagerService.rejectLoan(rejectTarget._id, { reason: rejectReason });
      setShowRejectModal(false);
      setRejectTarget(null);
      loadDashboard();
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmittingReject(false);
    }
  };

  if (loading) return <LoadingState message="Loading Bank Manager dashboard..." />;
  if (error) return <ErrorState message={error} onRetry={loadDashboard} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bank Manager Dashboard"
        subtitle={`Welcome, ${user?.name} — Loan review and SHG financial oversight`}
        badge={<StatusBadge status="ACTIVE" text="Bank Manager" />}
      />

      {/* Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard title="Active Groups" value={metrics.activeGroups} icon={Building2} color="emerald" />
          <SummaryCard title="Pending Review" value={metrics.pendingReview + metrics.underReview}
            subtitle={`${metrics.pendingReview} new, ${metrics.underReview} in review`} icon={Clock} color="amber" />
          <SummaryCard title="Approved Loans" value={metrics.approved} icon={CheckCircle2} color="blue" />
          <SummaryCard title="Active Loans" value={metrics.activeLoans}
            subtitle={`Total disbursed: ${formatCurrency(metrics.totalDisbursed)}`} icon={HandCoins} color="indigo" />
        </div>
      )}

      {/* Loan Applications List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4 border-b pb-3">
          <h3 className="font-bold text-slate-900 text-sm">Loan Applications for Review</h3>
          <div className="flex gap-2">
            {["REQUESTED,UNDER_REVIEW", "APPROVED", "REJECTED", "ACTIVE", "ALL"].map((f) => (
              <button key={f} onClick={() => setLoanStatusFilter(f)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-xl transition-colors ${
                  loanStatusFilter === f ? "bg-emerald-800 text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {f === "REQUESTED,UNDER_REVIEW" ? "Pending" : f}
              </button>
            ))}
          </div>
        </div>

        {loans.length === 0 ? (
          <p className="text-xs text-slate-400 py-8 text-center">No loan applications in this category.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-[10px] uppercase font-semibold text-slate-500 border-b">
                <tr>
                  <th className="px-3 py-2.5">Loan & Member</th>
                  <th className="px-3 py-2.5">Group</th>
                  <th className="px-3 py-2.5 text-right">Amount</th>
                  <th className="px-3 py-2.5">Purpose</th>
                  <th className="px-3 py-2.5 text-center">Status</th>
                  <th className="px-3 py-2.5 text-center">Bank Verify</th>
                  <th className="px-3 py-2.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loans.map((loan) => (
                  <tr key={loan._id} className="hover:bg-slate-50/50">
                    <td className="px-3 py-2.5">
                      <span className="font-mono font-bold text-slate-800">{loan.loanId}</span>
                      <p className="text-slate-500">{loan.memberId?.userId?.name}</p>
                    </td>
                    <td className="px-3 py-2.5 text-slate-600">{loan.groupId?.name}</td>
                    <td className="px-3 py-2.5 text-right font-bold">{formatCurrency(loan.principal)}</td>
                    <td className="px-3 py-2.5 text-slate-500 max-w-[120px] truncate">{loan.purpose}</td>
                    <td className="px-3 py-2.5 text-center"><StatusBadge status={loan.status} /></td>
                    <td className="px-3 py-2.5 text-center">
                      <span className="text-[10px] font-semibold bg-slate-100 px-1.5 py-0.5 rounded">
                        {loan.bankVerificationStatus || "NOT_SUBMITTED"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5 justify-center">
                        <button onClick={() => handleViewLoan(loan)}
                          className="p-1.5 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg" title="View Details">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {["REQUESTED", "UNDER_REVIEW"].includes(loan.status) && (
                          <>
                            <button
                              onClick={() => { setApproveTarget(loan); setApprovedPrincipal(loan.principal); setApprovedRate(loan.interestRate); setApprovedTenure(loan.tenureMonths); setShowApproveModal(true); }}
                              className="px-2 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg"
                            >Approve</button>
                            <button
                              onClick={() => { setRejectTarget(loan); setShowRejectModal(true); }}
                              className="px-2 py-1 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg"
                            >Reject</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Loan Detail + Review Modal */}
      {selectedLoan && (
        <Modal isOpen={Boolean(selectedLoan)} onClose={() => setSelectedLoan(null)}
          title={`Loan Review — ${selectedLoan.loanId}`} maxWidth="max-w-2xl">
          {loadingDetail ? <LoadingState message="Loading loan details..." /> : loanDetail ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-slate-400 uppercase text-[10px]">Member</p>
                  <p className="font-bold">{loanDetail.loan?.memberId?.userId?.name}</p>
                  <p className="text-slate-500">{loanDetail.loan?.memberId?.userId?.phone}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-slate-400 uppercase text-[10px]">Group</p>
                  <p className="font-bold">{loanDetail.loan?.groupId?.name}</p>
                  <p className="text-slate-500">{loanDetail.loan?.groupId?.villageTown}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-slate-400 uppercase text-[10px]">Loan Amount</p>
                  <p className="font-bold text-base">{formatCurrency(loanDetail.loan?.principal)}</p>
                  <p className="text-slate-500">{loanDetail.loan?.tenureMonths} months @ {loanDetail.loan?.interestRate}%</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-slate-400 uppercase text-[10px]">Purpose</p>
                  <p className="font-semibold">{loanDetail.loan?.purpose}</p>
                </div>
              </div>

              {/* Savings History */}
              {loanDetail.savingsHistory?.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-slate-700 mb-2">Last 6 Months Savings History</p>
                  <div className="flex gap-2 flex-wrap">
                    {loanDetail.savingsHistory.map((s) => (
                      <span key={s._id} className={`text-[10px] font-bold px-2 py-1 rounded-lg ${
                        s.status === "PAID" ? "bg-emerald-100 text-emerald-800" :
                        s.status === "PARTIAL" ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-800"
                      }`}>
                        {s.period}: {s.status}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Review form */}
              {["REQUESTED", "UNDER_REVIEW"].includes(loanDetail.loan?.status) && (
                <div className="border-t pt-4 space-y-3">
                  <p className="text-xs font-bold text-slate-700">Submit Verification Remarks</p>
                  <select value={reviewStatus} onChange={(e) => setReviewStatus(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border rounded-xl focus:ring-2 focus:ring-emerald-600">
                    <option value="PENDING">Pending Review</option>
                    <option value="DOCUMENTS_CHECKED">Documents Checked</option>
                    <option value="VERIFIED">Verified — Ready for Approval</option>
                    <option value="DECLINED">Declined</option>
                  </select>
                  <textarea value={reviewRemarks} onChange={(e) => setReviewRemarks(e.target.value)}
                    rows={2} placeholder="Remarks for this verification..."
                    className="w-full px-3 py-2 text-sm bg-slate-50 border rounded-xl focus:ring-2 focus:ring-emerald-600" />
                  <div className="flex gap-3 justify-end">
                    <button onClick={() => setSelectedLoan(null)}
                      className="px-4 py-2 text-sm text-slate-600 bg-white border rounded-xl hover:bg-slate-50">Close</button>
                    <button onClick={handleSubmitReview} disabled={submittingReview}
                      className="px-4 py-2 text-sm font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl disabled:opacity-50">
                      <FileCheck className="w-3.5 h-3.5 inline mr-1.5" />
                      {submittingReview ? "Saving..." : "Save Review"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </Modal>
      )}

      {/* Approve Modal */}
      <Modal isOpen={showApproveModal} onClose={() => setShowApproveModal(false)} title="Approve Loan Application">
        <form onSubmit={handleApproveLoan} className="space-y-4">
          {approveTarget && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900">
              Approving <strong>{approveTarget.loanId}</strong> for <strong>{approveTarget.memberId?.userId?.name}</strong>.
              You may adjust the terms below (leave blank to use requested terms).
            </div>
          )}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Principal (₹)</label>
              <input type="number" value={approvedPrincipal} onChange={(e) => setApprovedPrincipal(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border rounded-xl focus:ring-2 focus:ring-emerald-600" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Rate (%)</label>
              <input type="number" step="0.1" value={approvedRate} onChange={(e) => setApprovedRate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border rounded-xl focus:ring-2 focus:ring-emerald-600" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Months</label>
              <input type="number" value={approvedTenure} onChange={(e) => setApprovedTenure(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border rounded-xl focus:ring-2 focus:ring-emerald-600" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Approval Remarks</label>
            <input type="text" value={approveRemarks} onChange={(e) => setApproveRemarks(e.target.value)}
              placeholder="Optional remarks"
              className="w-full px-3 py-2 text-sm bg-slate-50 border rounded-xl focus:ring-2 focus:ring-emerald-600" />
          </div>
          <div className="flex gap-3 justify-end pt-3 border-t">
            <button type="button" onClick={() => setShowApproveModal(false)}
              className="px-4 py-2 text-sm text-slate-600 bg-white border rounded-xl hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={submittingApprove}
              className="px-4 py-2 text-sm font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl disabled:opacity-50">
              {submittingApprove ? "Approving..." : "Confirm Approval"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Reject Modal */}
      <Modal isOpen={showRejectModal} onClose={() => setShowRejectModal(false)} title="Reject Loan Application">
        <form onSubmit={handleRejectLoan} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Rejection Reason *</label>
            <textarea required value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
              rows={3} placeholder="State the reason for rejection..."
              className="w-full px-3 py-2 text-sm bg-slate-50 border rounded-xl focus:ring-2 focus:ring-emerald-600" />
          </div>
          <div className="flex gap-3 justify-end pt-3 border-t">
            <button type="button" onClick={() => setShowRejectModal(false)}
              className="px-4 py-2 text-sm text-slate-600 bg-white border rounded-xl hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={submittingReject}
              className="px-4 py-2 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl disabled:opacity-50">
              {submittingReject ? "Rejecting..." : "Confirm Rejection"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
