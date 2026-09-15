import React from 'react';
import { Modal } from './Modal';
import { Printer, CheckCircle2, Building2 } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

export const ReceiptModal = ({ isOpen, onClose, receipt }) => {
  if (!receipt) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Digital Transaction Receipt" maxWidth="max-w-xl">
      <div className="space-y-6">
        {/* Printable Area */}
        <div className="print-area bg-white border-2 border-dashed border-slate-300 rounded-2xl p-6 relative">
          {/* Header */}
          <div className="flex items-start justify-between border-b pb-4 border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-700" />
                <h4 className="font-bold text-slate-900 text-lg">SmartSHG</h4>
              </div>
              <p className="text-xs text-slate-500 font-medium">Digital Community Microfinance</p>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                VERIFIED PAYMENT
              </span>
              <p className="text-[11px] text-slate-500 font-mono mt-1">
                Receipt: {receipt.receiptNumber}
              </p>
            </div>
          </div>

          {/* Group & Member Info */}
          <div className="grid grid-cols-2 gap-4 my-4 py-3 bg-slate-50 rounded-xl p-3 text-xs">
            <div>
              <p className="text-slate-400 uppercase font-semibold">Self-Help Group</p>
              <p className="font-bold text-slate-800 text-sm mt-0.5">{receipt.group?.name}</p>
              <p className="text-slate-600 font-mono text-[11px]">{receipt.group?.code} • {receipt.group?.location}</p>
            </div>
            <div>
              <p className="text-slate-400 uppercase font-semibold">Paid By (Member)</p>
              <p className="font-bold text-slate-800 text-sm mt-0.5">{receipt.member?.name}</p>
              <p className="text-slate-600 font-mono text-[11px]">Member ID: {receipt.member?.number}</p>
            </div>
          </div>

          {/* Amount Box */}
          <div className="my-5 p-4 rounded-xl bg-emerald-50/80 border border-emerald-200/80 text-center">
            <p className="text-xs font-semibold uppercase text-emerald-800 tracking-wider">
              Amount Received
            </p>
            <h2 className="text-3xl font-extrabold text-emerald-900 mt-1">
              {formatCurrency(receipt.payment?.amount)}
            </h2>
            <p className="text-xs font-medium text-emerald-700 italic mt-1">
              ({receipt.payment?.amountInWords})
            </p>
          </div>

          {/* Transaction Metadata */}
          <div className="space-y-2 text-xs border-t border-slate-200 pt-3">
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Purpose</span>
              <span className="font-semibold text-slate-800">{receipt.payment?.purpose}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Payment Mode</span>
              <span className="font-semibold text-slate-800">{receipt.payment?.method}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Transaction ID</span>
              <span className="font-mono text-slate-700">{receipt.transactionId}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100">
              <span className="text-slate-500">Recorded Date</span>
              <span className="font-medium text-slate-800">{receipt.payment?.date}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Recorded By</span>
              <span className="font-medium text-slate-800">{receipt.issuer?.recordedBy}</span>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="mt-4 pt-3 border-t border-slate-200 text-[10px] text-slate-400 text-center leading-normal">
            {receipt.disclaimer}
          </div>
        </div>

        {/* Modal Action Buttons */}
        <div className="flex items-center justify-end gap-3 no-print">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-sm transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print Receipt
          </button>
        </div>
      </div>
    </Modal>
  );
};
