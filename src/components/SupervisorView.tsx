import React, { useState } from 'react';
import {
  MapPin,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronRight,
  ShieldAlert,
  User,
} from 'lucide-react';
import { Site, ChecklistItem, SiteLog, Profile } from '../types';
import {
  getDayInfo,
  getSitePresence,
  getSiteProgress,
  getOpenIssues,
  timeAgo,
} from '../lib/utils';

interface Props {
  sites: Site[];
  items: ChecklistItem[];
  logs: SiteLog[];
  profiles: Profile[];
  currentUser: Profile;
  onOpenSite: (siteId: string) => void;
}

export const SupervisorView: React.FC<Props> = ({
  sites,
  items,
  logs,
  profiles,
  currentUser,
  onOpenSite,
}) => {
  const [filterMode, setFilterMode] = useState<'mine' | 'all'>('mine');

  const mySites = sites.filter(
    (s) => s.status === 'active' && s.supervisor_id === currentUser.id
  );
  const otherActiveSites = sites.filter(
    (s) => s.status === 'active' && s.supervisor_id !== currentUser.id
  );
  const displayedSites = filterMode === 'mine' ? mySites : sites.filter((s) => s.status === 'active');

  const getPerson = (id: string) => {
    return profiles.find((p) => p.id === id)?.full_name || 'Supervisor';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-20 animate-in fade-in duration-150">
      {/* Welcome Banner */}
      <div className="bg-[#0B1F3A] rounded-2xl p-5 text-white shadow-sm border border-[#13305a] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#C9A24B]">
            Field Operations
          </span>
          <h2 className="text-xl font-black tracking-tight mt-0.5">
            Welcome, {currentUser.full_name}
          </h2>
          <p className="text-xs text-gray-300 mt-1">
            You have <strong className="text-white">{mySites.length}</strong> active site{mySites.length === 1 ? '' : 's'} assigned to you today.
          </p>
        </div>

        {/* Filter Toggle */}
        <div className="flex bg-black/30 p-1 rounded-xl self-start sm:self-auto border border-white/10">
          <button
            onClick={() => setFilterMode('mine')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterMode === 'mine'
                ? 'bg-[#C9A24B] text-[#0B1F3A] shadow-xs'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            My Sites ({mySites.length})
          </button>
          <button
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterMode === 'all'
                ? 'bg-[#C9A24B] text-[#0B1F3A] shadow-xs'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            All Active ({sites.filter((s) => s.status === 'active').length})
          </button>
        </div>
      </div>

      {/* Sites List */}
      <div className="space-y-3">
        {displayedSites.map((site) => {
          const siteItems = items.filter((i) => i.site_id === site.id);
          const progress = getSiteProgress(siteItems);
          const presence = getSitePresence(site.id, logs);
          const dayInfo = getDayInfo(site);
          const openIssues = getOpenIssues(site.id, logs);
          const lastLog = logs.filter((l) => l.site_id === site.id)[0];

          return (
            <div
              key={site.id}
              onClick={() => onOpenSite(site.id)}
              className="bg-white rounded-2xl border border-gray-200/90 p-4 sm:p-5 shadow-xs hover:border-[#C9A24B]/50 hover:shadow-md transition-all cursor-pointer active:scale-[0.99] relative overflow-hidden group"
            >
              {/* Header Row */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-bold text-base sm:text-lg text-[#0B1F3A] tracking-tight group-hover:text-[#9C7723] transition-colors">
                      {site.name}
                    </h3>

                    {presence ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        CHECKED IN
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600">
                        NOT CHECKED IN
                      </span>
                    )}

                    {openIssues.length > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800">
                        <AlertTriangle className="w-3 h-3 text-red-600" />
                        {openIssues.length} {openIssues.length === 1 ? 'issue' : 'issues'}
                      </span>
                    )}
                  </div>

                  <p className="text-xs font-semibold text-gray-700 truncate">
                    {site.client} {site.address ? `· ${site.address}` : ''}
                  </p>
                </div>

                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#C9A24B] group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-1" />
              </div>

              {/* Progress Bar */}
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                  <span>Scope Progress</span>
                  <span className="font-bold text-gray-800">
                    {progress.done}/{progress.total} tasks ({progress.pct}%)
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#C9A24B] rounded-full transition-all duration-300"
                    style={{ width: `${progress.pct}%` }}
                  />
                </div>
              </div>

              {/* Footer Details */}
              <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span
                  className={`inline-block px-2.5 py-0.5 rounded-md font-bold text-[11px] ${
                    dayInfo.late
                      ? 'bg-red-100 text-red-700'
                      : 'bg-amber-100 text-amber-900'
                  }`}
                >
                  {dayInfo.formattedRange}
                </span>

                <div className="flex items-center gap-3 text-gray-500 text-[11px]">
                  {filterMode === 'all' && (
                    <span>Sup: <strong>{getPerson(site.supervisor_id)}</strong></span>
                  )}
                  {lastLog && (
                    <span>Last log: {timeAgo(lastLog.created_at)}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {displayedSites.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center space-y-2">
            <p className="font-bold text-gray-800">No active sites found.</p>
            <p className="text-xs text-gray-500">
              {filterMode === 'mine'
                ? "You don't have any active sites assigned. Switch to 'All Active' or check with the CEO."
                : 'No active sites currently in the system.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
