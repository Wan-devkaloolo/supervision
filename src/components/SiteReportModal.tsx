import React from 'react';
import { X, Printer, CheckCircle2, Clock, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Site, ChecklistItem, SiteLog, Profile } from '../types';
import { fmtTime, fmtDateOnly, getDayInfo, getSiteProgress } from '../lib/utils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  site: Site | null;
  items: ChecklistItem[];
  logs: SiteLog[];
  supervisor: Profile | undefined;
}

export const SiteReportModal: React.FC<Props> = ({
  isOpen,
  onClose,
  site,
  items,
  logs,
  supervisor,
}) => {
  if (!isOpen || !site) return null;

  const dayInfo = getDayInfo(site);
  const progress = getSiteProgress(items);
  const issues = logs.filter((l) => l.type === 'issue');
  const photos = logs.filter((l) => Boolean(l.photo_url));

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl text-[#14213a] my-8 overflow-hidden print:m-0 print:p-0 print:shadow-none print:w-full print:max-w-none">
        {/* Modal Controls (Hidden in Print) */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-[#0B1F3A] text-white print:hidden">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#C9A24B]" />
            <span className="font-bold text-sm tracking-wide">Client Handover & Operations Report</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#C9A24B] text-[#0B1F3A] font-semibold text-xs hover:bg-[#dfbd60] transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Report Body */}
        <div className="p-8 space-y-6">
          {/* Header Banner */}
          <div className="border-b-2 border-[#C9A24B] pb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <img
                src="/assets/aistudio/WhatsApp_Image_2026-10-22_at_08.53.21_7bd50307.jpeg"
                alt="Sovereign Touch Home Care Logo"
                className="w-14 h-14 rounded-xl object-cover border border-[#C9A24B] shadow-xs flex-shrink-0"
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-widest text-[#C9A24B]">
                    Sovereign Touch Home Care
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#0B1F3A] mt-0.5">
                  {site.name}
                </h1>
                <p className="text-xs text-gray-500 mt-0.5">{site.address}</p>
              </div>
            </div>

            <div className="sm:text-right text-xs text-gray-500 space-y-0.5">
              <p className="font-semibold text-gray-800">Generated: {fmtDateOnly(new Date())}</p>
              <p>Status: <span className="uppercase font-bold text-emerald-700">{site.status}</span></p>
              <p>Supervisor: <strong className="text-gray-900">{supervisor?.full_name || '—'}</strong></p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 p-4 rounded-xl border border-gray-200">
            <div>
              <p className="text-[11px] font-semibold text-gray-500 uppercase">Client</p>
              <p className="text-sm font-bold text-[#0B1F3A] truncate">{site.client || 'N/A'}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-gray-500 uppercase">Service Scope</p>
              <p className="text-sm font-bold text-[#0B1F3A] truncate">{site.service || 'Specialist Ops'}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-gray-500 uppercase">Schedule</p>
              <p className="text-sm font-bold text-[#0B1F3A]">
                Day {dayInfo.day} of {site.quoted_days}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-gray-500 uppercase">Checklist Progress</p>
              <p className="text-sm font-bold text-emerald-700">
                {progress.done}/{progress.total} ({progress.pct}%)
              </p>
            </div>
          </div>

          {/* Checklist Verification */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-600 mb-3 border-b border-gray-200 pb-1">
              Checklist & Scope of Works ({progress.done}/{progress.total} Verified)
            </h3>
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between p-2.5 rounded-lg bg-white border border-gray-100 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2
                      className={`w-4 h-4 flex-shrink-0 ${
                        item.done ? 'text-emerald-600' : 'text-gray-300'
                      }`}
                    />
                    <span className={item.done ? 'font-medium text-gray-900' : 'text-gray-500'}>
                      {item.label}
                    </span>
                  </div>
                  <span className="text-[11px] text-gray-400 font-mono">
                    {item.done && item.done_at ? fmtTime(item.done_at) : 'Pending'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Photo Documentation (Thumbnails) */}
          {photos.length > 0 && (
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-600 mb-3 border-b border-gray-200 pb-1">
                Photographic Site Records ({photos.length})
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {photos.slice(0, 6).map((log) => (
                  <div key={log.id} className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
                    <img
                      src={log.photo_url!}
                      alt="Site log"
                      className="w-full h-28 object-cover"
                    />
                    {log.note && (
                      <p className="p-2 text-[11px] text-gray-600 truncate">{log.note}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sign-Off Block */}
          <div className="border-t-2 border-gray-200 pt-6 mt-6 grid grid-cols-2 gap-8 text-xs">
            <div>
              <p className="font-bold text-gray-800">Lead Supervisor Sign-off:</p>
              <div className="mt-8 border-b border-gray-400 pb-1 text-gray-600 font-mono">
                {supervisor?.full_name} — Sovereign Touch Ops
              </div>
              <p className="text-[10px] text-gray-400 mt-1">Signature & Date</p>
            </div>
            <div>
              <p className="font-bold text-gray-800">Client / Site Agent Acceptance:</p>
              <div className="mt-8 border-b border-gray-400 pb-1 text-gray-400 italic">
                Authorized Client Representative
              </div>
              <p className="text-[10px] text-gray-400 mt-1">Signature & Date</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
