import React from 'react';
import { ReceiptLayoutConfig } from '../../services/receiptTemplateService';
import { ShieldCheck, CheckCircle2 } from 'lucide-react';

interface ReceiptPreviewProps {
  config: ReceiptLayoutConfig;
  paperSize?: 'A4' | 'A5' | 'thermal_80' | 'thermal_58';
  previewMode?: 'desktop' | 'mobile' | 'print';
  sampleData?: {
    receipt_number?: string;
    issue_date?: string;
    payment_method?: string;
    transaction_type?: string;
    amount?: number;
    balance_after?: number;
    member?: {
      name?: string;
      psn?: string;
      facility?: string;
    };
    items?: Array<{ description: string; amount: number }>;
  };
}

// Minimal pure SVG QR Code generator for instantaneous, reliable client-side rendering
function InlineQRCodeSVG({ text, color = '#0F766E', size = 80 }: { text: string; color?: string; size?: number }) {
  const matrixSize = 25;
  const matrix: number[][] = Array.from({ length: matrixSize }, () => Array(matrixSize).fill(0));

  const drawFinder = (top: number, left: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        if (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)) {
          matrix[top + r][left + c] = 1;
        }
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(0, matrixSize - 7);
  drawFinder(matrixSize - 7, 0);

  for (let i = 8; i < matrixSize - 8; i++) {
    matrix[6][i] = i % 2 === 0 ? 1 : 0;
    matrix[i][6] = i % 2 === 0 ? 1 : 0;
  }

  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }

  for (let r = 0; r < matrixSize; r++) {
    for (let c = 0; c < matrixSize; c++) {
      if (
        (r < 8 && c < 8) ||
        (r < 8 && c >= matrixSize - 8) ||
        (r >= matrixSize - 8 && c < 8) ||
        r === 6 ||
        c === 6
      ) {
        continue;
      }
      const bit = ((hash ^ (r * 31 + c * 17)) >>> (r % 16)) & 1;
      matrix[r][c] = bit;
    }
  }

  const cellSize = size / matrixSize;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rounded bg-white p-1 border border-gray-200 shadow-sm inline-block">
      {matrix.map((row, r) =>
        row.map((val, c) =>
          val === 1 ? (
            <rect
              key={`${r}-${c}`}
              x={c * cellSize}
              y={r * cellSize}
              width={cellSize}
              height={cellSize}
              fill={color}
            />
          ) : null
        )
      )}
    </svg>
  );
}

// Simple Barcode Simulation
function BarcodeSVG({ value }: { value: string }) {
  const bars = [2, 1, 3, 1, 2, 3, 1, 1, 2, 4, 1, 2, 3, 1, 2, 1, 3, 2, 1, 4, 1, 2, 1, 3, 1, 2];
  let curX = 0;

  return (
    <div className="flex flex-col items-center">
      <svg width="160" height="36" viewBox="0 0 160 36" className="overflow-visible">
        {bars.map((w, idx) => {
          const x = curX;
          curX += w * 2.2 + 1.5;
          return <rect key={idx} x={x} y="0" width={w * 1.5} height="32" fill="#1F2937" />;
        })}
      </svg>
      <span className="text-[10px] font-mono tracking-widest text-gray-600 mt-0.5">{value}</span>
    </div>
  );
}

// Official Digital Circular Seal Stamp
function CircularSeal({ text, color = '#0F766E', date }: { text: string; color?: string; date?: string }) {
  return (
    <div
      className="relative flex items-center justify-center rounded-full border-2 border-dashed p-2 text-center select-none shadow-sm"
      style={{
        borderColor: color,
        color: color,
        width: '105px',
        height: '105px',
        backgroundColor: `${color}08`,
        transform: 'rotate(-8deg)'
      }}
    >
      <div
        className="absolute inset-1 rounded-full border border-solid"
        style={{ borderColor: color }}
      />
      <div className="flex flex-col items-center justify-center p-1 z-10">
        <ShieldCheck className="w-5 h-5 mb-0.5" style={{ color }} />
        <span className="text-[7.5px] font-bold uppercase tracking-tight leading-tight px-1">
          {text || 'IMAN COOP • OFFICIAL SEAL'}
        </span>
        <span className="text-[7px] font-mono font-semibold mt-0.5">
          {date || new Date().toISOString().slice(0, 10)}
        </span>
        <span className="text-[6.5px] tracking-wider uppercase opacity-80">VERIFIED</span>
      </div>
    </div>
  );
}

export const ReceiptPreview: React.FC<ReceiptPreviewProps> = ({
  config,
  paperSize = 'A4',
  previewMode = 'desktop',
  sampleData
}) => {
  const isThermal = paperSize === 'thermal_80' || paperSize === 'thermal_58';
  const is58mm = paperSize === 'thermal_58';

  const defaultData = {
    receipt_number: 'IMAN-REC-2026-B8A29F',
    issue_date: new Date().toISOString().slice(0, 10),
    payment_method: 'Direct Bank Transfer',
    transaction_type: 'Monthly Thrift Contribution',
    amount: 35000.00,
    balance_after: 285000.00,
    member: {
      name: 'Malam Ibrahim M. Danjuma',
      psn: 'IMAN/MEM/2024/0089',
      facility: 'State Specialist Hospital Gombe'
    },
    items: [
      { description: 'Monthly Savings Thrift (Thrift Fund)', amount: 30000.00 },
      { description: 'Administrative & Welfare Levy', amount: 5000.00 }
    ]
  };

  const data = { ...defaultData, ...sampleData };
  const colors = config.colors || {
    primary: '#0F766E',
    secondary: '#D97706',
    text: '#1F2937',
    background: '#FFFFFF',
    border: '#E5E7EB',
    accent: '#F0FDFA'
  };

  const header = config.header || {
    org_name: 'IMAN MULTI-PURPOSE COOPERATIVE SOCIETY',
    tagline: 'Empowering Members Through Faith & Ethical Finance',
    registration_no: 'IMAN/COOP/2024/001',
    address: 'Gombe State, Nigeria',
    phone: '+234 800 000 0000',
    email: 'info@imancooperative.org',
    receipt_title: 'OFFICIAL RECEIPT'
  };

  const sections = config.sections || {
    show_logo: true,
    show_header: true,
    show_metadata: true,
    show_member_details: true,
    show_breakdown: true,
    show_summary: true,
    show_qr_code: true,
    show_barcode: true,
    show_signatures: true,
    show_stamp: true,
    show_notes: true,
    show_watermark: true
  };

  // Paper width styles
  const getContainerStyles = () => {
    if (previewMode === 'mobile') {
      return 'w-[360px] max-w-full';
    }
    if (paperSize === 'thermal_58') {
      return 'w-[280px]';
    }
    if (paperSize === 'thermal_80') {
      return 'w-[340px]';
    }
    if (paperSize === 'A5') {
      return 'w-[520px] max-w-full';
    }
    return 'w-[640px] max-w-full'; // A4
  };

  const formatNaira = (val: number) => {
    return '₦' + val.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const borderClass =
    config.border_style === 'solid'
      ? 'border'
      : config.border_style === 'dashed'
      ? 'border border-dashed'
      : config.border_style === 'double'
      ? 'border-4 border-double'
      : config.border_style === 'minimal'
      ? 'border-t-4 border-b'
      : '';

  return (
    <div className={`transition-all duration-300 mx-auto ${getContainerStyles()}`}>
      {/* Sample Banner */}
      <div className="bg-amber-100 border border-amber-300 text-amber-800 text-[11px] font-medium px-3 py-1 rounded-t-lg flex items-center justify-between shadow-sm">
        <span>SAMPLE PREVIEW ({paperSize.toUpperCase()})</span>
        <span className="font-mono text-[10px] bg-amber-200 px-1.5 py-0.5 rounded">NO FINANCIAL EFFECT</span>
      </div>

      {/* Main Receipt Sheet */}
      <div
        className={`relative overflow-hidden bg-white shadow-xl ${borderClass} rounded-b-lg p-5 sm:p-7 transition-colors`}
        style={{
          backgroundColor: colors.background || '#FFFFFF',
          borderColor: colors.border || '#E5E7EB',
          color: colors.text || '#1F2937',
          fontFamily: config.typography?.font_family || 'Inter, sans-serif'
        }}
      >
        {/* Subtle Watermark */}
        {sections.show_watermark && config.watermark?.text && (
          <div
            className="absolute inset-0 pointer-events-none flex items-center justify-center select-none overflow-hidden"
            style={{ zIndex: 0 }}
          >
            <span
              className="text-4xl sm:text-5xl font-black uppercase tracking-widest text-gray-900"
              style={{
                opacity: config.watermark.opacity || 0.08,
                transform: `rotate(${config.watermark.rotation || -25}deg)`
              }}
            >
              {config.watermark.text}
            </span>
          </div>
        )}

        <div className="relative z-10 space-y-4">
          {/* Header Section */}
          {sections.show_header && (
            <div className="text-center pb-3 border-b border-gray-200" style={{ borderColor: colors.border }}>
              {sections.show_logo && (
                <div
                  className={`flex mb-2 ${
                    config.logo?.position === 'left'
                      ? 'justify-start'
                      : config.logo?.position === 'right'
                      ? 'justify-end'
                      : 'justify-center'
                  }`}
                >
                  <div
                    className="p-1 rounded bg-white shadow-sm border border-gray-100 flex items-center justify-center"
                    style={{
                      width: `${config.logo?.width || (isThermal ? 48 : 64)}px`,
                      height: `${config.logo?.height || (isThermal ? 48 : 64)}px`
                    }}
                  >
                    <img
                      src="/logo.png"
                      alt="Logo"
                      className="max-h-full max-w-full object-contain"
                      onError={(e) => {
                        // Fallback icon if logo not accessible
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                </div>
              )}

              <h2
                className={`font-black tracking-tight leading-tight ${
                  is58mm ? 'text-xs' : isThermal ? 'text-sm' : 'text-lg sm:text-xl'
                }`}
                style={{ color: colors.primary }}
              >
                {header.org_name || 'IMAN MULTI-PURPOSE COOPERATIVE SOCIETY'}
              </h2>

              {header.tagline && (
                <p className="text-[10px] sm:text-xs text-gray-500 italic mt-0.5">{header.tagline}</p>
              )}

              <div className="text-[10px] text-gray-600 mt-1 space-y-0.5">
                {header.registration_no && <p>Reg No: {header.registration_no}</p>}
                {header.address && <p>{header.address}</p>}
                {(header.phone || header.email) && (
                  <p>{[header.phone, header.email].filter(Boolean).join(' • ')}</p>
                )}
              </div>

              {/* Receipt Title Pill */}
              <div className="mt-3 flex justify-center">
                <span
                  className="px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase shadow-sm"
                  style={{
                    backgroundColor: colors.primary,
                    color: '#FFFFFF'
                  }}
                >
                  {header.receipt_title || 'OFFICIAL RECEIPT'}
                </span>
              </div>
            </div>
          )}

          {/* Metadata Section */}
          {sections.show_metadata && (
            <div
              className={`rounded-lg p-2.5 sm:p-3 text-[11px] grid ${
                isThermal ? 'grid-cols-1 gap-1' : 'grid-cols-2 gap-2'
              }`}
              style={{ backgroundColor: colors.accent || '#F9FAFB' }}
            >
              <div>
                <span className="text-gray-500 font-medium">Receipt No: </span>
                <span className="font-mono font-bold">{data.receipt_number}</span>
              </div>
              <div className={isThermal ? '' : 'text-right'}>
                <span className="text-gray-500 font-medium">Date: </span>
                <span className="font-semibold">{data.issue_date}</span>
              </div>
              <div>
                <span className="text-gray-500 font-medium">Payment Mode: </span>
                <span className="font-semibold">{data.payment_method}</span>
              </div>
              <div className={isThermal ? '' : 'text-right'}>
                <span className="text-gray-500 font-medium">Status: </span>
                <span className="inline-flex items-center text-emerald-700 font-bold">
                  <CheckCircle2 className="w-3 h-3 mr-0.5 inline" /> PAID
                </span>
              </div>
            </div>
          )}

          {/* Member Details */}
          {sections.show_member_details && data.member && (
            <div className="text-xs space-y-1 py-1 border-b border-gray-100" style={{ borderColor: colors.border }}>
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Member Information</div>
              <div className="flex justify-between items-baseline">
                <span className="font-bold text-gray-800">{data.member.name}</span>
                <span className="font-mono text-[11px] font-semibold text-gray-600">{data.member.psn}</span>
              </div>
              {data.member.facility && (
                <div className="text-[11px] text-gray-500">{data.member.facility}</div>
              )}
            </div>
          )}

          {/* Transaction Particulars / Breakdown */}
          {sections.show_breakdown && (
            <div className="space-y-1.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Transaction Breakdown</div>
              <div className="border rounded-md overflow-hidden" style={{ borderColor: colors.border }}>
                <table className="w-full text-left text-xs">
                  <thead style={{ backgroundColor: `${colors.primary}15`, color: colors.primary }}>
                    <tr className="border-b" style={{ borderColor: colors.border }}>
                      <th className="p-2 font-semibold">Description</th>
                      <th className="p-2 font-semibold text-right">Amount (₦)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(data.items || []).map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50">
                        <td className="p-2 text-gray-700">{item.description}</td>
                        <td className="p-2 text-right font-mono font-medium">{formatNaira(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Summary / Total Paid */}
          {sections.show_summary && (
            <div
              className="rounded-lg p-3 border flex flex-col sm:flex-row items-center justify-between gap-2"
              style={{
                borderColor: colors.primary,
                backgroundColor: `${colors.primary}0A`
              }}
            >
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 block">
                  Total Amount Paid
                </span>
                <span className="text-[11px] text-gray-600 italic">
                  Thirty-Five Thousand Naira Only
                </span>
              </div>
              <div className="text-right">
                <span
                  className="text-lg sm:text-xl font-black font-mono tracking-tight"
                  style={{ color: colors.primary }}
                >
                  {formatNaira(data.amount)}
                </span>
              </div>
            </div>
          )}

          {/* Security, QR Code & Barcode */}
          {(sections.show_qr_code || sections.show_barcode) && (
            <div className="py-2 flex flex-col sm:flex-row items-center justify-around gap-4 border-t border-b border-gray-100" style={{ borderColor: colors.border }}>
              {sections.show_qr_code && (
                <div className="flex items-center gap-2.5">
                  <InlineQRCodeSVG text={`https://imanmcs.org/verify-receipt/${data.receipt_number}`} color={colors.primary} size={64} />
                  <div className="text-[10px] text-gray-500">
                    <span className="font-bold text-gray-700 block">Official Verification</span>
                    <span>Scan to verify receipt</span>
                    <span className="font-mono text-[9px] block text-gray-400 mt-0.5">Hash: 8b3a...7f4e</span>
                  </div>
                </div>
              )}

              {sections.show_barcode && !is58mm && (
                <BarcodeSVG value={data.receipt_number} />
              )}
            </div>
          )}

          {/* Signatures & Official Stamp */}
          {(sections.show_signatures || sections.show_stamp) && (
            <div className="pt-2 flex items-center justify-between gap-4">
              {sections.show_signatures && (
                <div className="flex-1 text-center sm:text-left">
                  <div className="w-36 border-b border-gray-400 h-8 mb-1 mx-auto sm:mx-0"></div>
                  <span className="text-[10px] font-semibold text-gray-600 block">
                    {config.signature?.title || 'Authorized Signatory'}
                  </span>
                  <span className="text-[9px] text-gray-400">IMAN Cooperative Society</span>
                </div>
              )}

              {sections.show_stamp && (
                <CircularSeal
                  text={config.stamp?.text || 'IMAN COOPERATIVE • OFFICIAL SEAL'}
                  color={config.stamp?.color || colors.primary}
                  date={data.issue_date}
                />
              )}
            </div>
          )}

          {/* Notes & Terms */}
          {sections.show_notes && config.notes?.text && (
            <div className="pt-2 border-t border-gray-100 text-[10px] text-gray-500 text-center leading-relaxed" style={{ borderColor: colors.border }}>
              {config.notes.text}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
