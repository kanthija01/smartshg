import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext";
import { contributionService } from "../../services/contributionService";
import { PageHeader } from "../../components/common/PageHeader";
import { SummaryCard } from "../../components/common/SummaryCard";
import { StatusBadge } from "../../components/common/StatusBadge";
import { LoadingState, ErrorState } from "../../components/common/FeedbackStates";
import { ReceiptModal } from "../../components/common/ReceiptModal";
import { formatCurrency, formatDate, formatPeriod } from "../../utils/formatters";
import {
  PiggyBank,
  CreditCard,
  CheckCircle,
  Clock,
  Smartphone,
  AlertCircle,
  History,
} from "lucide-react";

/** Dynamically load Razorpay checkout script */
function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export const MyPaymentsPage = () => {
  const { t } = useTranslation();
  const { user, activeGroup } = useAuth();

  const [contribution, setContribution] = useState(null);
  const [history, setHistory] = useState([]);
  const [groupInfo, setGroupInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [processingPayment, setProcessingPayment] = useState(false);
  const [receiptData, setReceiptData] = useState(null);

  const groupId = activeGroup?._id || activeGroup?.id;

  const loadData = useCallback(async () => {
    if (!groupId) return;
    try {
      setLoading(true);
      setError("");
      const res = await contributionService.getMyContribution(groupId);
      if (res.success) {
        setContribution(res.contribution);
        setHistory(res.history || []);
        setGroupInfo(res.group);
      }
    } catch (err) {
      setError(err.message || "Failed to load payment data");
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRazorpayPayment = async () => {
    if (!contribution || contribution.pendingBalance <= 0) return;
    try {
      setProcessingPayment(true);

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        alert("Razorpay script could not be loaded. Please check your internet connection.");
        setProcessingPayment(false);
        return;
      }

      const orderData = await contributionService.createRazorpayOrder(groupId, contribution._id);
      if (!orderData.success) {
        alert(orderData.message || "Failed to create payment order.");
        setProcessingPayment(false);
        return;
      }

      const options = {
        key: orderData.keyId,
        amount: orderData.amount,       // in paise
        currency: orderData.currency,
        name: activeGroup?.name || "SmartSHG",
        description: `Monthly Savings — ${contribution.period}`,
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
                member: {
                  name: user?.name,
                  number: user?.memberProfile?.memberNumber || "N/A",
                },
                payment: {
                  amount: verifyRes.amountPaid,
                  purpose: `Monthly Savings (${contribution.period})`,
                  method: "UPI / Online",
                  date: formatDate(new Date()),
                },
                issuer: { recordedBy: "Razorpay TEST Gateway" },
                disclaimer:
                  "TEST MODE payment. Razorpay TEST credentials used. No real money charged.",
              });
              loadData();
            } else {
              alert("Payment verification failed: " + verifyRes.message);
            }
          } catch (e) {
            alert("Verification error: " + e.message);
          } finally {
            setProcessingPayment(false);
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
        alert("Payment failed: " + (res.error?.description || "Unknown error"));
        setProcessingPayment(false);
      });
      rzp.open();
    } catch (err) {
      alert(err.message || "Payment initiation failed");
      setProcessingPayment(false);
    }
  };

  if (loading) return <LoadingState message="Loading your payment details..." />;
  if (error) return <ErrorState message={error} onRetry={loadData} />;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={t("myPayments.title")}
        subtitle={`${activeGroup?.name} • ${contribution?.period ? formatPeriod(contribution.period) : ""}`}
        badge={contribution ? <StatusBadge status={contribution.status} /> : null}
      />

      {contribution ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <SummaryCard
              title={t("myPayments.expectedThisMonth")}
              value={formatCurrency(contribution.expectedAmount)}
              subtitle={t("myPayments.dueBy", { day: groupInfo?.dueDayOfMonth || 10 })}
              icon={PiggyBank}
              color="emerald"
            />
            <SummaryCard
              title={t("myPayments.carriedForward")}
              value={formatCurrency(contribution.carriedForwardAmount)}
              subtitle={t("myPayments.pendingFrom")}
              icon={Clock}
              color={contribution.carriedForwardAmount > 0 ? "rose" : "slate"}
            />
            <SummaryCard
              title={t("myPayments.totalPayable")}
              value={formatCurrency(contribution.totalPayable)}
              subtitle={t("myPayments.currentAndCarried")}
              icon={CreditCard}
              color="amber"
            />
            <SummaryCard
              title={t("myPayments.amountPaid")}
              value={formatCurrency(contribution.amountPaid)}
              subtitle={`${t("myPayments.pendingBalance")}: ${formatCurrency(contribution.pendingBalance)}`}
              icon={CheckCircle}
              color={contribution.pendingBalance === 0 ? "emerald" : "indigo"}
            />
            <SummaryCard
              title={t("myPayments.pendingBalance")}
              value={formatCurrency(contribution.pendingBalance)}
              subtitle={contribution.pendingBalance === 0 ? "✓ Fully paid" : "Outstanding due"}
              icon={contribution.pendingBalance === 0 ? CheckCircle : AlertCircle}
              color={contribution.pendingBalance === 0 ? "emerald" : "rose"}
            />
          </div>

          {/* Pay Now Panel */}
          {contribution.pendingBalance > 0 && (
            <div className="bg-white p-6 rounded-2xl border border-emerald-200 shadow-sm space-y-4">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    {t("myPayments.payNowTitle", { period: contribution.period })}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {t("myPayments.pendingBalance")}:{" "}
                    <strong className="text-slate-800">
                      {formatCurrency(contribution.pendingBalance)}
                    </strong>
                    {contribution.carriedForwardAmount > 0 && (
                      <span className="ml-2 text-rose-600 font-medium">
                        (
                        {t("myPayments.carryForwardNote", {
                          amount: formatCurrency(contribution.carriedForwardAmount),
                        })}
                        )
                      </span>
                    )}
                  </p>
                </div>
                <StatusBadge status={contribution.status} />
              </div>

              {/* TEST MODE notice */}
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
                <span>
                  <strong>TEST MODE:</strong> {t("myPayments.testModeNote")}
                </span>
              </div>

              {/* Pay Now Button */}
              <button
                onClick={handleRazorpayPayment}
                disabled={processingPayment}
                className="inline-flex items-center gap-2.5 px-6 py-3 text-sm font-bold text-white bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 rounded-xl shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Smartphone className="w-4 h-4" />
                {processingPayment
                  ? t("myPayments.openingPayment")
                  : `Pay ₹${contribution.pendingBalance} Online (Razorpay TEST)`}
              </button>

              {/* Payment method hints */}
              <div className="text-[11px] text-slate-400 space-y-0.5 pt-1 border-t border-slate-100">
                <p>Test Card: <span className="font-mono">4111 1111 1111 1111</span> • Expiry: any future date • CVV: any 3 digits</p>
                <p>Test UPI: <span className="font-mono">success@razorpay</span></p>
              </div>
            </div>
          )}

          {/* Fully Paid Banner */}
          {contribution.pendingBalance === 0 && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-700 shrink-0" />
              <p className="text-sm font-semibold text-emerald-800">
                {t("myPayments.fullyPaid", { period: contribution.period })}
              </p>
            </div>
          )}
        </>
      ) : (
        <div className="p-10 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
          <PiggyBank className="w-10 h-10 mx-auto text-slate-300 mb-3" />
          <p className="text-sm text-slate-500">No contribution record found for this period.</p>
        </div>
      )}

      {/* Payment History Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
        <h3 className="font-bold text-slate-900 text-sm mb-4 pb-3 border-b border-slate-100 flex items-center gap-2">
          <History className="w-4 h-4 text-slate-400" />
          {t("myPayments.paymentHistory")}
        </h3>

        {history.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">{t("myPayments.noHistory")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-[10px] uppercase font-semibold text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2.5">{t("myPayments.colPeriod")}</th>
                  <th className="px-3 py-2.5 text-right">{t("myPayments.colExpected")}</th>
                  <th className="px-3 py-2.5 text-right">{t("myPayments.colCarryFwd")}</th>
                  <th className="px-3 py-2.5 text-right">{t("myPayments.colTotalDue")}</th>
                  <th className="px-3 py-2.5 text-right">{t("myPayments.colPaid")}</th>
                  <th className="px-3 py-2.5 text-right">{t("myPayments.colPending")}</th>
                  <th className="px-3 py-2.5 text-center">{t("myPayments.colStatus")}</th>
                  <th className="px-3 py-2.5 text-center">Attempts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((c) => (
                  <tr key={c._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-3 py-2.5 font-mono font-semibold text-slate-700">
                      {formatPeriod(c.period)}
                      <span className="ml-1 text-[9px] text-slate-400 font-sans">({c.period})</span>
                    </td>
                    <td className="px-3 py-2.5 text-right text-slate-600">
                      {formatCurrency(c.expectedAmount)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium">
                      {c.carriedForwardAmount > 0 ? (
                        <span className="text-rose-600">{formatCurrency(c.carriedForwardAmount)}</span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right font-bold text-slate-800">
                      {formatCurrency(c.totalPayable)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold text-emerald-700">
                      {formatCurrency(c.amountPaid)}
                    </td>
                    <td className="px-3 py-2.5 text-right text-slate-500">
                      {c.pendingBalance > 0 ? (
                        <span className="text-rose-600 font-medium">{formatCurrency(c.pendingBalance)}</span>
                      ) : (
                        <span className="text-emerald-600 font-semibold">Nil</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-3 py-2.5 text-center text-slate-400">
                      {c.paymentAttempts?.length > 0 ? (
                        <span className="inline-block px-1.5 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded">
                          {c.paymentAttempts.filter((a) => a.status === "CAPTURED").length} paid
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Digital Receipt Modal */}
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
