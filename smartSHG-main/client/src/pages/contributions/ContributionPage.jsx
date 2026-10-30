import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import { contributionService } from "../../services/contributionService";
import { PageHeader } from "../../components/common/PageHeader";
import { SummaryCard } from "../../components/common/SummaryCard";
import { StatusBadge } from "../../components/common/StatusBadge";
import { Modal } from "../../components/common/Modal";
import { LoadingState, ErrorState } from "../../components/common/FeedbackStates";
import { ReceiptModal } from "../../components/common/ReceiptModal";
import { formatCurrency, formatDate } from "../../utils/formatters";
import {
  PiggyBank,
  CreditCard,
  CheckCircle,
  Clock,
  AlertCircle,
  PlusCircle,
  Smartphone,
} from "lucide-react";

// Dynamically load the Razorpay checkout script
function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export const ContributionPage = () => {
  const { t } = useTranslation();
  const { user, activeGroup, isHead } = useAuth();

  const [contribution, setContribution] = useState(null);
  const [history, setHistory] = useState([]);
  const [summary, setSummary] = useState(null);
  const [groupInfo, setGroupInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [processingPayment, setProcessingPayment] = useState(false);
  const [receiptData, setReceiptData] = useState(null);

  // HEAD cash recording modal
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [recordTarget, setRecordTarget] = useState(null);
  const [recordAmount, setRecordAmount] = useState("");
  const [recordMethod, setRecordMethod] = useState("CASH");
  const [recordNotes, setRecordNotes] = useState("");
  const [recording, setRecording] = useState(false);

  const loadData = useCallback(async () => {
    if (!activeGroup) return;
    try {
      setLoading(true);
      setError("");
      if (isHead) {
        const res = await contributionService.getContributionSummary(activeGroup._id || activeGroup.id);
        if (res.success) {
          setSummary(res.summary);
          setHistory(res.contributions || []);
        }
      } else {
        const res = await contributionService.getMyContribution(activeGroup._id || activeGroup.id);
        if (res.success) {
          setContribution(res.contribution);
          setHistory(res.history || []);
          setGroupInfo(res.group);
        }
      }
    } catch (err) {
      setError(err.message || "Failed to load contribution data");
    } finally {
      setLoading(false);
    }
  }, [activeGroup, isHead]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRazorpayPayment = async () => {
    if (!contribution || contribution.pendingBalance <= 0) return;
    try {
      setProcessingPayment(true);

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        alert("Razorpay script could not be loaded. Check internet connection.");
        return;
      }

      const groupId = activeGroup._id || activeGroup.id;
      const orderData = await contributionService.createRazorpayOrder(groupId, contribution._id);

      if (!orderData.success) {
        alert(orderData.message || "Failed to create payment order.");
        return;
      }

      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: activeGroup?.name || "SmartSHG",
        description: `Monthly Savings - ${contribution.period}`,
        order_id: orderData.orderId,
        prefill: {
          name: user?.name || "",
          contact: user?.phone || "",
          email: user?.email || "",
        },
        notes: {
          period: contribution.period,
          contributionId: contribution._id,
        },
        theme: { color: "#065f46" },
        handler: async (response) => {
          try {
            const verifyRes = await contributionService.verifyPayment(groupId, contribution._id, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            if (verifyRes.success) {
              setReceiptData({
                receiptNumber: verifyRes.receiptNumber,
                transactionId: response.razorpay_payment_id,
                group: {
                  name: activeGroup?.name,
                  code: activeGroup?.code,
                  location: `${activeGroup?.villageTown}, ${activeGroup?.district}`,
                },
                member: { name: user?.name, number: user?.memberId || "N/A" },
                payment: {
                  amount: verifyRes.amountPaid,
                  purpose: `Monthly Savings (${contribution.period})`,
                  method: "UPI / Online",
                  date: formatDate(new Date()),
                },
                issuer: { recordedBy: "Razorpay TEST Gateway" },
                disclaimer: "TEST MODE payment. Razorpay TEST credentials used.",
              });
              loadData();
            } else {
              alert("Payment verification failed: " + verifyRes.message);
            }
          } catch (e) {
            alert("Verification error: " + e.message);
          }
        },
        modal: {
          ondismiss: () => {
            setProcessingPayment(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (res) => {
        alert("Payment failed: " + res.error.description);
        setProcessingPayment(false);
      });
      rzp.open();
    } catch (err) {
      alert(err.message || "Payment initiation failed");
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleRecordOffline = async (e) => {
    e.preventDefault();
    if (!recordTarget) return;
    try {
      setRecording(true);
      const groupId = activeGroup._id || activeGroup.id;
      const res = await contributionService.recordOfflinePayment(groupId, recordTarget._id, {
        amount: Number(recordAmount),
        paymentMethod: recordMethod,
        notes: recordNotes,
      });
      if (res.success) {
        setShowRecordModal(false);
        setRecordTarget(null);
        setRecordAmount("");
        setRecordNotes("");
        loadData();
        setReceiptData({
          receiptNumber: res.receiptNumber,
          transactionId: res.receiptNumber,
          group: { name: activeGroup?.name, code: activeGroup?.code, location: `${activeGroup?.villageTown}` },
          member: {
            name: recordTarget.memberId?.userId?.name || "Member",
            number: recordTarget.memberId?.memberNumber || "",
          },
          payment: {
            amount: Number(recordAmount),
            purpose: `Monthly Savings (${recordTarget.period})`,
            method: recordMethod,
            date: formatDate(new Date()),
          },
          issuer: { recordedBy: user?.name },
          disclaimer: "Internal SmartSHG record.",
        });
      }
    } catch (err) {
      alert(err.message || "Failed to record payment");
    } finally {
      setRecording(false);
    }
  };

  if (loading) return <LoadingState message="Loading monthly contribution records..." />;
  if (error) return <ErrorState message={error} onRetry={loadData} />;

  // ---- MEMBER VIEW ----
  if (!isHead) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Monthly Savings & Contributions"
          subtitle={`${activeGroup?.name} • ${contribution?.period || ""}`}
          badge={contribution ? <StatusBadge status={contribution.status} /> : null}
        />

        {contribution && (
          <>
            {/* Contribution Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <SummaryCard
                title="Expected This Month"
                value={formatCurrency(contribution.expectedAmount)}
                subtitle={`Due by ${groupInfo?.dueDayOfMonth || 10}th`}
                icon={PiggyBank}
                color="emerald"
              />
              <SummaryCard
                title="Carried Forward"
                value={formatCurrency(contribution.carriedForwardAmount)}
                subtitle="Unpaid from previous months"
                icon={Clock}
                color={contribution.carriedForwardAmount > 0 ? "rose" : "slate"}
              />
              <SummaryCard
                title="Total Payable"
                value={formatCurrency(contribution.totalPayable)}
                subtitle="Current + carried forward"
                icon={CreditCard}
                color="amber"
              />
              <SummaryCard
                title="Amount Paid"
                value={formatCurrency(contribution.amountPaid)}
                subtitle={`Pending: ${formatCurrency(contribution.pendingBalance)}`}
                icon={CheckCircle}
                color={contribution.pendingBalance === 0 ? "emerald" : "indigo"}
              />
            </div>

            {/* Pay Now Panel */}
            {contribution.pendingBalance > 0 && (
              <div className="bg-white p-6 rounded-2xl border border-emerald-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900">Pay Now — {contribution.period}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Pending balance: <strong>{formatCurrency(contribution.pendingBalance)}</strong>
                      {contribution.carriedForwardAmount > 0 && (
                        <span className="ml-2 text-rose-600">
                          (includes {formatCurrency(contribution.carriedForwardAmount)} carry-forward)
                        </span>
                      )}
                    </p>
                  </div>
                  <StatusBadge status={contribution.status} />
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                  <strong>TEST MODE:</strong> This uses Razorpay TEST credentials. Use test card 4111 1111 1111 1111 or UPI: success@razorpay. No real money is charged.
                </div>

                <button
                  onClick={handleRazorpayPayment}
                  disabled={processingPayment}
                  className="inline-flex items-center gap-2 px-6 py-3 text-sm font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-sm disabled:opacity-50 transition-colors"
                >
                  <Smartphone className="w-4 h-4" />
                  {processingPayment ? "Opening Payment..." : `Pay ₹${contribution.pendingBalance} Online (Razorpay TEST)`}
                </button>
              </div>
            )}

            {contribution.pendingBalance === 0 && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-700" />
                <p className="text-sm font-semibold text-emerald-800">
                  You have fully paid your contribution for {contribution.period}. Well done!
                </p>
              </div>
            )}
          </>
        )}

        {/* Payment History */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
          <h3 className="font-bold text-slate-900 text-sm mb-4 border-b border-slate-100 pb-3">
            Contribution History (Last 12 Months)
          </h3>
          {history.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No history found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-[10px] uppercase font-semibold text-slate-500 border-b">
                  <tr>
                    <th className="px-3 py-2.5">Period</th>
                    <th className="px-3 py-2.5 text-right">Expected</th>
                    <th className="px-3 py-2.5 text-right">Carry Fwd</th>
                    <th className="px-3 py-2.5 text-right">Total Due</th>
                    <th className="px-3 py-2.5 text-right">Paid</th>
                    <th className="px-3 py-2.5 text-right">Pending</th>
                    <th className="px-3 py-2.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {history.map((c) => (
                    <tr key={c._id} className="hover:bg-slate-50/50">
                      <td className="px-3 py-2.5 font-mono font-semibold">{c.period}</td>
                      <td className="px-3 py-2.5 text-right">{formatCurrency(c.expectedAmount)}</td>
                      <td className="px-3 py-2.5 text-right text-rose-600 font-medium">
                        {c.carriedForwardAmount > 0 ? formatCurrency(c.carriedForwardAmount) : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold">{formatCurrency(c.totalPayable)}</td>
                      <td className="px-3 py-2.5 text-right font-semibold text-emerald-800">{formatCurrency(c.amountPaid)}</td>
                      <td className="px-3 py-2.5 text-right text-slate-500">{formatCurrency(c.pendingBalance)}</td>
                      <td className="px-3 py-2.5 text-center"><StatusBadge status={c.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {receiptData && (
          <ReceiptModal isOpen={Boolean(receiptData)} onClose={() => setReceiptData(null)} receipt={receiptData} />
        )}
      </div>
    );
  }

  // ---- HEAD VIEW ----
  return (
    <div className="space-y-6">
      <PageHeader
        title="Monthly Contribution Collection"
        subtitle={`${activeGroup?.name} — member-wise status`}
      />

      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard title="Total Expected" value={formatCurrency(summary.totalExpected)} icon={PiggyBank} color="amber" />
          <SummaryCard title="Total Collected" value={formatCurrency(summary.totalCollected)} icon={CheckCircle} color="emerald" />
          <SummaryCard title="Total Pending" value={formatCurrency(summary.totalPending)} icon={Clock} color={summary.totalPending > 0 ? "rose" : "slate"} />
          <SummaryCard title="Paid / Total" value={`${summary.paidCount} / ${summary.totalMembers}`} icon={CreditCard} color="indigo" />
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
        <h3 className="font-bold text-slate-900 text-sm mb-4 border-b border-slate-100 pb-3">Member-wise Contribution Status</h3>
        {history.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">No records found for this period.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-[10px] uppercase font-semibold text-slate-500 border-b">
                <tr>
                  <th className="px-3 py-2.5">Member</th>
                  <th className="px-3 py-2.5 text-right">Total Due</th>
                  <th className="px-3 py-2.5 text-right">Paid</th>
                  <th className="px-3 py-2.5 text-right">Pending</th>
                  <th className="px-3 py-2.5 text-center">Status</th>
                  <th className="px-3 py-2.5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((c) => (
                  <tr key={c._id} className="hover:bg-slate-50/50">
                    <td className="px-3 py-2.5 font-semibold text-slate-800">
                      {c.memberId?.userId?.name || "Member"}
                      {c.carriedForwardAmount > 0 && (
                        <span className="ml-2 text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded font-bold">
                          +{formatCurrency(c.carriedForwardAmount)} CF
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right font-bold">{formatCurrency(c.totalPayable)}</td>
                    <td className="px-3 py-2.5 text-right text-emerald-800 font-semibold">{formatCurrency(c.amountPaid)}</td>
                    <td className="px-3 py-2.5 text-right text-slate-500">{formatCurrency(c.pendingBalance)}</td>
                    <td className="px-3 py-2.5 text-center"><StatusBadge status={c.status} /></td>
                    <td className="px-3 py-2.5 text-center">
                      {c.pendingBalance > 0 && (
                        <button
                          onClick={() => { setRecordTarget(c); setRecordAmount(c.pendingBalance); setShowRecordModal(true); }}
                          className="px-2.5 py-1 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                        >
                          Record Cash
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record offline payment modal */}
      <Modal isOpen={showRecordModal} onClose={() => setShowRecordModal(false)} title="Record Cash Payment">
        <form onSubmit={handleRecordOffline} className="space-y-4">
          {recordTarget && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900">
              <strong>Member:</strong> {recordTarget.memberId?.userId?.name}<br />
              <strong>Period:</strong> {recordTarget.period} •
              <strong> Pending:</strong> {formatCurrency(recordTarget.pendingBalance)}
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Amount (₹) *</label>
            <input
              type="number" required min="1"
              value={recordAmount}
              onChange={(e) => setRecordAmount(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600 font-bold"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Payment Method</label>
            <select
              value={recordMethod}
              onChange={(e) => setRecordMethod(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600"
            >
              <option value="CASH">Cash</option>
              <option value="UPI">UPI</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Notes</label>
            <input
              type="text" value={recordNotes}
              onChange={(e) => setRecordNotes(e.target.value)}
              placeholder="Optional remarks"
              className="w-full px-3 py-2 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-600"
            />
          </div>
          <div className="flex gap-3 justify-end pt-3 border-t">
            <button type="button" onClick={() => setShowRecordModal(false)}
              className="px-4 py-2 text-sm text-slate-600 bg-white border rounded-xl hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={recording}
              className="px-4 py-2 text-sm font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-sm disabled:opacity-50">
              {recording ? "Recording..." : "Record Payment"}
            </button>
          </div>
        </form>
      </Modal>

      {receiptData && (
        <ReceiptModal isOpen={Boolean(receiptData)} onClose={() => setReceiptData(null)} receipt={receiptData} />
      )}
    </div>
  );
};
