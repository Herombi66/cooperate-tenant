import React from 'react';
import { ShieldCheck, CheckCircle2, QrCode } from 'lucide-react';
import { ContractLayoutConfig } from '../../services/documentTemplateService';

interface ContractPreviewProps {
  layout: ContractLayoutConfig;
  contractType?: string;
  sampleData?: {
    agreementRef?: string;
    loanId?: string;
    version?: string;
    status?: string;
    recordedDate?: string;
    signatureRef?: string;
    borrowerName?: string;
    borrowerPsn?: string;
    borrowerPhone?: string;
    borrowerEmail?: string;
    principal?: number;
    profit?: number;
    totalSalePrice?: number;
    tenureMonths?: number;
    monthlyRepayment?: number;
  };
}

export const ContractPreview: React.FC<ContractPreviewProps> = ({
  layout,
  sampleData
}) => {
  const { colors, header, logo, sections, terms, stamp } = layout;

  const agreementRef = sampleData?.agreementRef || 'AG-00152';
  const loanId = sampleData?.loanId || '#234';
  const contractVersion = sampleData?.version || 'v1.0';
  const status = sampleData?.status || 'ACCEPTED';
  const recordedDate = sampleData?.recordedDate || '25 September 2026';
  const signatureRef = sampleData?.signatureRef || 'SIG-20260925-38762';
  const borrowerName = sampleData?.borrowerName || 'Mohammed Kabir Ahmed';
  const borrowerPsn = sampleData?.borrowerPsn || '38762';
  const borrowerPhone = sampleData?.borrowerPhone || '0806 573 6114';
  const borrowerEmail = sampleData?.borrowerEmail || 'mkabirahmed143@gmail.com';

  const principal = sampleData?.principal || 800000;
  const profit = sampleData?.profit || 80000;
  const totalSalePrice = sampleData?.totalSalePrice || 880000;
  const tenureMonths = sampleData?.tenureMonths || 7;
  const monthlyRepayment = sampleData?.monthlyRepayment || 125714.28;

  const formatNgn = (amt: number) => {
    return '₦' + amt.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const sampleSchedule = [
    { no: 1, date: '25 October 2026', amount: monthlyRepayment, status: 'SCHEDULED' },
    { no: 2, date: '25 November 2026', amount: monthlyRepayment, status: 'SCHEDULED' },
    { no: 3, date: '25 December 2026', amount: monthlyRepayment, status: 'SCHEDULED' },
    { no: 4, date: '25 January 2027', amount: monthlyRepayment, status: 'SCHEDULED' },
    { no: 5, date: '25 February 2027', amount: monthlyRepayment, status: 'SCHEDULED' },
    { no: 6, date: '25 March 2027', amount: monthlyRepayment, status: 'SCHEDULED' },
    { no: 7, date: '25 April 2027', amount: monthlyRepayment, status: 'SCHEDULED' }
  ];

  return (
    <div
      className="w-full max-w-[800px] mx-auto bg-white rounded-lg shadow-2xl border transition-all duration-200 relative overflow-hidden"
      style={{
        backgroundColor: colors.background || '#FFFFFF',
        borderColor: colors.border || '#E5E7EB',
        color: colors.text || '#111827',
        fontFamily: layout.typography?.font_family || 'Inter, sans-serif'
      }}
    >
      {/* Sample Watermark Banner */}
      {sections.show_watermark && (
        <div className="w-full py-1.5 bg-amber-500/10 border-b border-amber-300 text-amber-800 text-[10px] sm:text-xs font-semibold uppercase tracking-widest text-center flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>SAMPLE PREVIEW — NOT A VALID AGREEMENT</span>
        </div>
      )}

      <div className="p-6 sm:p-10 space-y-6">
        {/* ========================================================= */}
        {/* 1. OFFICIAL BRANDED HEADER                                 */}
        {/* ========================================================= */}
        {sections.show_header && (
          <div className="space-y-4">
            <div
              className={`flex flex-col sm:flex-row items-center gap-4 ${
                logo.position === 'center'
                  ? 'sm:flex-col text-center justify-center'
                  : logo.position === 'right'
                  ? 'sm:flex-row-reverse text-right'
                  : 'text-left'
              }`}
            >
              {sections.show_logo && logo.show_on_print && (
                <div
                  className="flex-shrink-0 flex items-center justify-center"
                  style={{ width: logo.width || 60, height: logo.height || 60 }}
                >
                  <img
                    src={logo.url || '/logo.png'}
                    alt="Cooperative Logo"
                    className="max-h-full max-w-full object-contain"
                    onError={(e) => {
                      // Fallback icon if logo path fails
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
              )}

              <div className="flex-1 space-y-1">
                <h1
                  className="text-lg sm:text-xl font-bold tracking-tight uppercase"
                  style={{ color: colors.primary }}
                >
                  {header.org_name || 'IMAN MULTIPURPOSE COOPERATIVE SOCIETY'}
                </h1>
                <p className="text-xs sm:text-sm font-semibold" style={{ color: colors.secondary }}>
                  {header.chapter || 'Gombe State Chapter'}
                </p>
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  {[
                    header.registration_no ? `Reg No: ${header.registration_no}` : null,
                    header.address,
                    header.phone,
                    header.email,
                    header.website
                  ]
                    .filter(Boolean)
                    .join(' • ')}
                </p>
              </div>
            </div>

            {/* Contract Title Banner */}
            <div
              className="py-2.5 px-4 text-center rounded text-white font-bold text-xs sm:text-sm tracking-wider uppercase shadow-sm"
              style={{ backgroundColor: colors.primary }}
            >
              {header.contract_title || 'MURABAHA SALES CONTRACT'}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 2. DOCUMENT INFORMATION PANEL                             */}
        {/* ========================================================= */}
        {sections.show_metadata && (
          <div
            className="p-3.5 rounded border grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs"
            style={{
              backgroundColor: colors.accent || '#ECFDF5',
              borderColor: colors.border || '#CBD5E1'
            }}
          >
            <div className="space-y-1">
              <span className="font-semibold block uppercase tracking-wide text-[10px]" style={{ color: colors.primary }}>
                Document Reference Details
              </span>
              <div>
                <span className="text-gray-500">Agreement Reference: </span>
                <span className="font-bold">{agreementRef}</span>
              </div>
              <div>
                <span className="text-gray-500">Loan Application ID: </span>
                <span className="font-bold">{loanId}</span>
                <span className="text-gray-400"> • Version: </span>
                <span className="font-semibold">{contractVersion}</span>
              </div>
            </div>

            <div className="space-y-1 sm:text-right">
              <span className="font-semibold block uppercase tracking-wide text-[10px]" style={{ color: colors.primary }}>
                Authentication & Status
              </span>
              <div className="flex items-center sm:justify-end gap-1.5">
                <span className="text-gray-500">Status: </span>
                <span className="inline-flex items-center gap-1 font-bold text-emerald-600 bg-emerald-100/80 px-2 py-0.5 rounded text-[11px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  {status}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Recorded Date: </span>
                <span className="font-semibold">{recordedDate}</span>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 3. BORROWER DETAILS CARD                                  */}
        {/* ========================================================= */}
        {sections.show_borrower_card && (
          <div
            className="rounded border p-4 text-xs space-y-2 relative"
            style={{ borderColor: colors.border || '#E5E7EB', backgroundColor: '#FFFFFF' }}
          >
            <div className="absolute top-0 left-0 right-0 h-1 rounded-t" style={{ backgroundColor: colors.primary }} />
            <h3 className="font-bold text-xs uppercase tracking-wide" style={{ color: colors.primary }}>
              Buyer / Borrower Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-gray-700">
              <div>
                <span className="text-gray-500">Full Name: </span>
                <span className="font-semibold">{borrowerName}</span>
              </div>
              <div>
                <span className="text-gray-500">Member PSN: </span>
                <span className="font-semibold">{borrowerPsn}</span>
              </div>
              <div>
                <span className="text-gray-500">Phone: </span>
                <span className="font-semibold">{borrowerPhone}</span>
              </div>
              <div>
                <span className="text-gray-500">Email: </span>
                <span className="font-semibold">{borrowerEmail}</span>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 4. FINANCING DETAILS & COST-PLUS-PROFIT BREAKDOWN         */}
        {/* ========================================================= */}
        {(sections.show_financing_card || sections.show_breakdown_card) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {sections.show_financing_card && (
              <div
                className="p-3.5 rounded border relative space-y-2 bg-white"
                style={{ borderColor: colors.border || '#E5E7EB' }}
              >
                <div className="absolute top-0 left-0 right-0 h-1 rounded-t" style={{ backgroundColor: colors.secondary }} />
                <h4 className="font-bold uppercase tracking-wide text-[11px]" style={{ color: colors.secondary }}>
                  Financing Facility
                </h4>
                <div className="space-y-1 text-gray-700">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Financing Type:</span>
                    <span className="font-semibold">Murabaha Asset Financing</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Repayment Tenure:</span>
                    <span className="font-semibold">{tenureMonths} Months</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Monthly Repayment:</span>
                    <span className="font-bold" style={{ color: colors.primary }}>{formatNgn(monthlyRepayment)}</span>
                  </div>
                </div>
              </div>
            )}

            {sections.show_breakdown_card && (
              <div
                className="p-3.5 rounded border relative space-y-2"
                style={{
                  borderColor: colors.border || '#E5E7EB',
                  backgroundColor: colors.accent || '#ECFDF5'
                }}
              >
                <div className="absolute top-0 left-0 right-0 h-1 rounded-t" style={{ backgroundColor: colors.primary }} />
                <h4 className="font-bold uppercase tracking-wide text-[11px]" style={{ color: colors.primary }}>
                  Cost-Plus-Profit Breakdown
                </h4>
                <div className="space-y-1 text-gray-700">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Cooperative Cost / Principal:</span>
                    <span className="font-semibold">{formatNgn(principal)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Agreed Murabaha Profit:</span>
                    <span>+ {formatNgn(profit)}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-emerald-200/80 font-bold" style={{ color: colors.primary }}>
                    <span>TOTAL SALE PRICE:</span>
                    <span className="text-sm">{formatNgn(totalSalePrice)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* 5. DYNAMIC REPAYMENT SCHEDULE TABLE                       */}
        {/* ========================================================= */}
        {sections.show_schedule && (
          <div className="space-y-2">
            <h3 className="font-bold text-xs uppercase tracking-wide" style={{ color: colors.primary }}>
              Repayment Schedule & Installment Breakdown
            </h3>
            <div className="overflow-x-auto rounded border" style={{ borderColor: colors.border || '#E5E7EB' }}>
              <table className="w-full text-[11px] text-left">
                <thead className="text-white uppercase text-[10px]" style={{ backgroundColor: colors.primary }}>
                  <tr>
                    <th className="py-2 px-3">No.</th>
                    <th className="py-2 px-3">Installment Due Date</th>
                    <th className="py-2 px-3">Installment Amount</th>
                    <th className="py-2 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sampleSchedule.map((row, idx) => (
                    <tr key={row.no} className={idx % 2 === 1 ? 'bg-gray-50/70' : 'bg-white'}>
                      <td className="py-1.5 px-3 font-medium text-gray-600">{row.no}</td>
                      <td className="py-1.5 px-3 text-gray-700">{row.date}</td>
                      <td className="py-1.5 px-3 font-bold text-gray-900">{formatNgn(row.amount)}</td>
                      <td className="py-1.5 px-3">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold bg-gray-100 text-gray-700">
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 6. NUMBERED ISLAMIC CONTRACT CLAUSES                      */}
        {/* ========================================================= */}
        {sections.show_terms && terms && terms.length > 0 && (
          <div className="space-y-2.5">
            <h3 className="font-bold text-xs uppercase tracking-wide" style={{ color: colors.primary }}>
              Islamic Murabaha Contract Terms & General Conditions
            </h3>
            <div className="space-y-2 text-[11px] leading-relaxed text-gray-700 text-justify">
              {terms.map((term, index) => (
                <p key={term.clause_no || index}>
                  <strong style={{ color: colors.primary }}>
                    {term.clause_no || index + 1}. {term.title}:
                  </strong>{' '}
                  {term.text}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 7. ELECTRONIC SIGNATURE CERTIFICATION BOX                */}
        {/* ========================================================= */}
        {sections.show_signatures && (
          <div
            className="rounded border p-4 text-xs space-y-3 relative bg-slate-50/70"
            style={{ borderColor: colors.border || '#CBD5E1' }}
          >
            <div className="absolute top-0 left-0 right-0 h-1 rounded-t" style={{ backgroundColor: colors.primary }} />
            <h3 className="font-bold text-xs uppercase tracking-wide" style={{ color: colors.primary }}>
              Buyer Declaration & Electronic Signature Certification
            </h3>
            <p className="text-[10px] text-gray-600 italic">
              "I confirm that I have reviewed, understood, and irrevocably accepted all terms and conditions of this Murabaha Sales Contract electronically through the authenticated IMAN Cooperative Portal."
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-gray-200 text-[11px]">
              <div>
                <span className="text-gray-500">Signed By: </span>
                <span className="font-semibold text-gray-900">{borrowerName} (PSN: {borrowerPsn})</span>
              </div>
              <div>
                <span className="text-gray-500">Timestamp: </span>
                <span className="font-semibold text-gray-900">{recordedDate}, 8:59 PM</span>
              </div>
              <div className="flex items-center gap-1 text-emerald-700 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>✓ ACCEPTED & SIGNED ELECTRONICALLY</span>
              </div>
              <div>
                <span className="text-gray-500">Signature Ref: </span>
                <span className="font-mono font-bold" style={{ color: colors.primary }}>{signatureRef}</span>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 8. OFFICIAL CIRCULAR STAMP & QR CODE                      */}
        {/* ========================================================= */}
        {(sections.show_stamp || sections.show_qr_code) && (
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-6 border-t border-gray-200">
            {/* Stamp on Left */}
            {sections.show_stamp && stamp.show !== false && (
              <div className="flex items-center gap-3">
                <div
                  className="w-20 h-20 rounded-full border-2 border-double flex flex-col items-center justify-center p-1 text-center font-bold text-[8px] uppercase tracking-tighter"
                  style={{
                    borderColor: stamp.color || colors.primary,
                    color: stamp.color || colors.primary
                  }}
                >
                  <span className="leading-tight">IMAN COOPERATIVE</span>
                  <span className="text-[7px] text-amber-600 my-0.5">★ OFFICIAL SEAL ★</span>
                  <span className="text-[6.5px] text-gray-500">{recordedDate}</span>
                  <span className="text-[7px]">GOMBE STATE</span>
                </div>
                <div className="text-[10px] text-gray-500">
                  <span className="font-bold block text-gray-800">OFFICIAL VERIFIED SEAL</span>
                  <span>Digitally applied upon acceptance</span>
                </div>
              </div>
            )}

            {/* QR Code on Right */}
            {sections.show_qr_code && (
              <div className="flex items-center gap-3 sm:text-right">
                <div className="text-[10px] text-gray-500">
                  <span className="font-bold block text-gray-800">PUBLIC REGISTRY VERIFICATION</span>
                  <span>Scan to verify contract authenticity</span>
                  <span className="block font-mono text-[9px]" style={{ color: colors.primary }}>
                    /verify/agreement/{agreementRef}
                  </span>
                </div>
                <div className="p-1.5 bg-white border rounded shadow-sm flex items-center justify-center">
                  <QrCode className="w-12 h-12" style={{ color: colors.primary }} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* 9. RUNNING FOOTER                                         */}
        {/* ========================================================= */}
        {sections.show_footer && (
          <div className="pt-4 border-t border-gray-200 text-center text-[10px] text-gray-400 space-y-0.5">
            <p>
              {header.org_name || 'IMAN MULTIPURPOSE COOPERATIVE SOCIETY'} • Official Murabaha Agreement • Ref:{' '}
              {agreementRef} • Page 1 of 1
            </p>
            <p className="text-[9px]">
              This document was electronically generated and certified by the IMAN Multipurpose Cooperative Society System.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
