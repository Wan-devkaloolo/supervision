import React, { useState } from 'react';
import {
  Building2,
  Users,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plus,
  Search,
  Filter,
  Check,
  Calendar,
  MapPin,
  Camera,
  Layers,
  ChevronRight,
  ExternalLink,
  Sparkles,
  Edit,
  Trash2,
  MoreVertical,
} from 'lucide-react';
import { Site, ChecklistItem, SiteLog, Profile } from '../types';
import {
  getDayInfo,
  getSitePresence,
  getSiteProgress,
  getOpenIssues,
  fmtTime,
  timeAgo,
} from '../lib/utils';
import {
  addSite,
  updateSiteStatus,
  deleteSite,
  resolveIssue,
  addSupervisor,
  updateProfile,
  deleteProfile,
  deleteLog,
  updateLog,
} from '../lib/store';
import { PhotoModal } from './PhotoModal';
import { EditSiteModal } from './EditSiteModal';

interface Props {
  sites: Site[];
  items: ChecklistItem[];
  logs: SiteLog[];
  profiles: Profile[];
  currentUser: Profile;
  onOpenSite: (siteId: string) => void;
}

const CHECKLIST_TEMPLATES: Record<string, string[]> = {
  'Roof & Tile Restoration': [
    'Pre-clean site walkthrough & hazard perimeter setup',
    'Scaffolding safety check & harness anchor points inspection',
    'Gutter downpipe temporary block & debris collection tarps',
    'Low pressure steam tile wash (North & East elevations)',
    'Low pressure steam tile wash (South & West elevations)',
    'Apply professional biocide anti-fungal moss retardant barrier',
    'Downpipe flush, ground patio rinse & final client walkthrough',
  ],
  'Commercial Kitchen & Hygiene': [
    'Pre-service air filter & intake duct photographic inspection',
    'Commercial canopy degreasing & stainless steel scrub',
    'Deep clean extraction motors & grease baffle replacement',
    'Floor gulley pressure cleanse and drain descaling',
    'Kitchen surface sanitization & hygiene swab testing',
    'Issue hygiene certificate & sign-off with head chef',
  ],
  'Post-Construction Handover': [
    'Fine builder dust HEPA vacuuming across all walls and joinery',
    'Protective tape, plastic and adhesive residue removal',
    'Architectural glass & frames smear-free polish (interior/exterior)',
    'Hard floor strip, scrub, buffer & protective coat seal',
    'Sanitize all sanitaryware, brassware & vanity mirrors',
    'Final snagging walkthrough with site agent',
  ],
  'Commercial Office Deep Clean': [
    'Pre-clean walkthrough & security clearance checks',
    'Hot-water extraction carpet deep clean across open floors',
    'HEPA sanitization of all ergonomic workstation peripherals',
    'Executive boardroom leather treatment and glass partition polish',
    'Tea point & kitchenette descaling & steam sanitization',
    'Final air freshening mist and exit lock-up procedure',
  ],
};

export const CeoDashboard: React.FC<Props> = ({
  sites,
  items,
  logs,
  profiles,
  currentUser,
  onOpenSite,
}) => {
  const [tab, setTab] = useState<'board' | 'feed' | 'manage'>('board');
  const [boardFilter, setBoardFilter] = useState<'active' | 'on_site' | 'issues' | 'overdue' | 'completed'>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [feedFilter, setFeedFilter] = useState<'all' | 'issue' | 'update' | 'checkin' | 'photo'>('all');

  // Add Site Form State
  const [name, setName] = useState('');
  const [client, setClient] = useState('');
  const [address, setAddress] = useState('');
  const [service, setService] = useState('');
  const [quotedDays, setQuotedDays] = useState(2);
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [supervisorId, setSupervisorId] = useState(
    profiles.find((p) => p.role === 'supervisor')?.id || ''
  );
  const [checklistText, setChecklistText] = useState(
    CHECKLIST_TEMPLATES['Roof & Tile Restoration'].join('\n')
  );
  const [formError, setFormError] = useState('');
  const [isSubmittingSite, setIsSubmittingSite] = useState(false);

  // Edit Site Modal
  const [editingSite, setEditingSite] = useState<Site | null>(null);

  // Add Supervisor State
  const [newSupName, setNewSupName] = useState('');
  const [newSupEmail, setNewSupEmail] = useState('');
  const [newSupPasscode, setNewSupPasscode] = useState('1234');
  const [showAddSupModal, setShowAddSupModal] = useState(false);

  // Edit Supervisor State
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [editProfileName, setEditProfileName] = useState('');
  const [editProfileEmail, setEditProfileEmail] = useState('');
  const [editProfilePasscode, setEditProfilePasscode] = useState('');

  // Photo Modal
  const [selectedPhoto, setSelectedPhoto] = useState<{
    url: string;
    caption?: string | null;
    timestamp?: string;
    uploader?: string;
  } | null>(null);

  // Log Edit State
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [editingLogNote, setEditingLogNote] = useState('');

  const activeSites = sites.filter((s) => s.status === 'active');
  const completedSites = sites.filter((s) => s.status === 'completed');
  const sitesOnDuty = activeSites.filter((s) => getSitePresence(s.id, logs));
  const totalOpenIssues = activeSites.reduce(
    (acc, s) => acc + getOpenIssues(s.id, logs).length,
    0
  );

  const getPerson = (id: string) => {
    return profiles.find((p) => p.id === id)?.full_name || 'Supervisor';
  };

  // Filtered sites for Live Board
  const filteredSites = sites
    .filter((s) => {
      // Filter by status tab
      if (boardFilter === 'active') return s.status === 'active';
      if (boardFilter === 'completed') return s.status === 'completed';
      if (boardFilter === 'on_site') return s.status === 'active' && Boolean(getSitePresence(s.id, logs));
      if (boardFilter === 'issues') return s.status === 'active' && getOpenIssues(s.id, logs).length > 0;
      if (boardFilter === 'overdue') return s.status === 'active' && getDayInfo(s).late;
      return true;
    })
    .filter((s) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        s.client.toLowerCase().includes(q) ||
        s.address.toLowerCase().includes(q) ||
        getPerson(s.supervisor_id).toLowerCase().includes(q)
      );
    });

  // Filtered logs for Activity Feed
  const filteredLogs = logs.filter((l) => {
    if (feedFilter === 'all') return true;
    if (feedFilter === 'issue') return l.type === 'issue';
    if (feedFilter === 'update') return l.type === 'update';
    if (feedFilter === 'checkin') return l.type === 'checkin' || l.type === 'checkout';
    if (feedFilter === 'photo') return Boolean(l.photo_url);
    return true;
  });

  const handleCreateSite = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!name.trim()) {
      setFormError('Site Name is required.');
      return;
    }
    if (!supervisorId) {
      setFormError('Please select a supervisor.');
      return;
    }

    setIsSubmittingSite(true);
    await addSite({
      name,
      client,
      address,
      service,
      quoted_days: quotedDays,
      start_date: startDate,
      supervisor_id: supervisorId,
      checklistText,
    });

    setIsSubmittingSite(false);
    // Reset and jump to live board
    setName('');
    setClient('');
    setAddress('');
    setService('');
    setTab('board');
    setBoardFilter('active');
  };

  const handleAddSupervisor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupName.trim()) return;
    await addSupervisor(newSupName, 'supervisor', newSupEmail, newSupPasscode.trim() || '1234');
    setNewSupName('');
    setNewSupEmail('');
    setNewSupPasscode('1234');
    setShowAddSupModal(false);
  };

  const handleSaveProfileEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfile || !editProfileName.trim()) return;
    await updateProfile(editingProfile.id, {
      full_name: editProfileName.trim(),
      email: editProfileEmail.trim(),
      passcode: editProfilePasscode.trim() || editingProfile.passcode || '1234',
    });
    setEditingProfile(null);
  };

  const handleDeleteProfile = async (profileId: string) => {
    if (window.confirm('Remove this team member?')) {
      await deleteProfile(profileId);
    }
  };

  const handleDeleteLog = async (logId: string) => {
    if (window.confirm('Delete this activity log?')) {
      await deleteLog(logId);
    }
  };

  const handleSaveLogEdit = async (logId: string) => {
    await updateLog(logId, { note: editingLogNote.trim() });
    setEditingLogId(null);
  };

  const handleApplyTemplate = (templateName: string) => {
    const lines = CHECKLIST_TEMPLATES[templateName];
    if (lines) {
      setChecklistText(lines.join('\n'));
      setService(templateName);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4 pb-20 animate-in fade-in duration-150">
      {/* Top CEO Stat Cards Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              Active Sites
            </p>
            <p className="text-2xl font-black text-[#0B1F3A] mt-0.5">{activeSites.length}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{completedSites.length} completed</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0B1F3A] flex items-center justify-center">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              Crew On Duty
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-2xl font-black text-emerald-600">{sitesOnDuty.length}</p>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5">Checked in now</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              Open Issues
            </p>
            <p
              className={`text-2xl font-black mt-0.5 ${
                totalOpenIssues > 0 ? 'text-red-600' : 'text-gray-700'
              }`}
            >
              {totalOpenIssues}
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {totalOpenIssues === 0 ? 'All clear' : 'Requires review'}
            </p>
          </div>
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              totalOpenIssues > 0 ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-500'
            }`}
          >
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              Total Progress
            </p>
            <p className="text-2xl font-black text-[#C9A24B] mt-0.5">
              {Math.round(
                (items.filter((i) => i.done).length / Math.max(1, items.length)) * 100
              )}
              %
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {items.filter((i) => i.done).length} / {items.length} tasks
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-[#C9A24B] flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex bg-white p-1.5 rounded-2xl border border-gray-200/90 shadow-xs gap-1">
        <button
          onClick={() => setTab('board')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            tab === 'board'
              ? 'bg-[#0B1F3A] text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Live Board
        </button>
        <button
          onClick={() => setTab('feed')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all relative ${
            tab === 'feed'
              ? 'bg-[#0B1F3A] text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Activity Stream
          {totalOpenIssues > 0 && (
            <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-red-600 text-white">
              {totalOpenIssues}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('manage')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            tab === 'manage'
              ? 'bg-[#0B1F3A] text-white shadow-xs'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          Manage & Add Site
        </button>
      </div>

      {/* TAB 1: LIVE BOARD */}
      {tab === 'board' && (
        <div className="space-y-4">
          {/* Sub Filters & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search sites, clients, locations or supervisors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#C9A24B]"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs font-semibold">
              <button
                onClick={() => setBoardFilter('active')}
                className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-colors ${
                  boardFilter === 'active'
                    ? 'bg-[#0B1F3A] text-white'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                All Active ({activeSites.length})
              </button>
              <button
                onClick={() => setBoardFilter('on_site')}
                className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-colors ${
                  boardFilter === 'on_site'
                    ? 'bg-emerald-700 text-white'
                    : 'bg-white text-emerald-800 border border-emerald-200 hover:bg-emerald-50'
                }`}
              >
                Crew On Site ({sitesOnDuty.length})
              </button>
              <button
                onClick={() => setBoardFilter('issues')}
                className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-colors ${
                  boardFilter === 'issues'
                    ? 'bg-red-600 text-white'
                    : 'bg-white text-red-700 border border-red-200 hover:bg-red-50'
                }`}
              >
                Issues ({activeSites.filter((s) => getOpenIssues(s.id, logs).length > 0).length})
              </button>
              <button
                onClick={() => setBoardFilter('overdue')}
                className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-colors ${
                  boardFilter === 'overdue'
                    ? 'bg-amber-600 text-white'
                    : 'bg-white text-amber-800 border border-amber-200 hover:bg-amber-50'
                }`}
              >
                Overdue ({activeSites.filter((s) => getDayInfo(s).late).length})
              </button>
              <button
                onClick={() => setBoardFilter('completed')}
                className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition-colors ${
                  boardFilter === 'completed'
                    ? 'bg-gray-700 text-white'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                Completed ({completedSites.length})
              </button>
            </div>
          </div>

          {/* Sites Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredSites.map((site) => {
              const siteItems = items.filter((i) => i.site_id === site.id);
              const progress = getSiteProgress(siteItems);
              const presence = getSitePresence(site.id, logs);
              const dayInfo = getDayInfo(site);
              const siteIssues = getOpenIssues(site.id, logs);
              const lastLog = logs.filter((l) => l.site_id === site.id)[0];

              return (
                <div
                  key={site.id}
                  onClick={() => onOpenSite(site.id)}
                  className="bg-white rounded-2xl border border-gray-200/90 p-5 shadow-xs hover:border-[#C9A24B] hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    {/* Top Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-extrabold text-base text-[#0B1F3A] tracking-tight group-hover:text-[#9C7723] transition-colors">
                            {site.name}
                          </h3>
                        </div>
                        <p className="text-xs font-semibold text-gray-700 truncate">
                          {site.client} {site.address ? `· ${site.address}` : ''}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {/* Quick Edit Site button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingSite(site);
                          }}
                          className="p-1.5 text-gray-400 hover:text-[#0B1F3A] hover:bg-gray-100 rounded-lg transition-colors"
                          title="Edit site details"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>

                        {presence ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            ON SITE
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-600">
                            NOT ON SITE
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-4">
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-[#C9A24B] to-emerald-500 rounded-full transition-all duration-300"
                          style={{ width: `${progress.pct}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-500 mt-1.5">
                        <span>
                          {progress.done}/{progress.total} tasks ({progress.pct}%)
                        </span>

                        <span
                          className={`font-bold text-[11px] px-2 py-0.5 rounded ${
                            dayInfo.late
                              ? 'bg-red-100 text-red-700'
                              : 'bg-amber-100 text-amber-900'
                          }`}
                        >
                          {dayInfo.formattedRange}
                        </span>
                      </div>
                    </div>

                    {/* Issues Warning Badge */}
                    {siteIssues.length > 0 && (
                      <div className="mt-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-red-50 text-red-700 border border-red-200">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
                        {siteIssues.length} open issue{siteIssues.length > 1 ? 's' : ''} reported
                      </div>
                    )}
                  </div>

                  {/* Card Bottom Meta */}
                  <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500 flex items-center justify-between">
                    <span className="truncate">
                      Lead: <strong className="text-gray-800">{getPerson(site.supervisor_id)}</strong>
                    </span>

                    {lastLog && (
                      <span className="text-[11px] text-gray-400 font-mono">
                        {timeAgo(lastLog.created_at)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredSites.length === 0 && (
              <div className="col-span-full bg-white rounded-2xl border border-gray-200 p-12 text-center space-y-2">
                <p className="font-bold text-gray-800">No sites matching filter.</p>
                <p className="text-xs text-gray-500">
                  Try another filter or create a new site under the Manage tab.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ACTIVITY STREAM */}
      {tab === 'feed' && (
        <div className="space-y-4">
          {/* Feed Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-semibold">
            <button
              onClick={() => setFeedFilter('all')}
              className={`px-3 py-1.5 rounded-xl transition-colors ${
                feedFilter === 'all'
                  ? 'bg-[#0B1F3A] text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              All Events ({logs.length})
            </button>
            <button
              onClick={() => setFeedFilter('issue')}
              className={`px-3 py-1.5 rounded-xl transition-colors ${
                feedFilter === 'issue'
                  ? 'bg-red-600 text-white'
                  : 'bg-white text-red-700 border border-red-200 hover:bg-red-50'
              }`}
            >
              Issues ({logs.filter((l) => l.type === 'issue').length})
            </button>
            <button
              onClick={() => setFeedFilter('update')}
              className={`px-3 py-1.5 rounded-xl transition-colors ${
                feedFilter === 'update'
                  ? 'bg-[#C9A24B] text-[#0B1F3A]'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              Updates ({logs.filter((l) => l.type === 'update').length})
            </button>
            <button
              onClick={() => setFeedFilter('photo')}
              className={`px-3 py-1.5 rounded-xl transition-colors ${
                feedFilter === 'photo'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-blue-700 border border-blue-200 hover:bg-blue-50'
              }`}
            >
              Photos ({logs.filter((l) => Boolean(l.photo_url)).length})
            </button>
            <button
              onClick={() => setFeedFilter('checkin')}
              className={`px-3 py-1.5 rounded-xl transition-colors ${
                feedFilter === 'checkin'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50'
              }`}
            >
              Attendance ({logs.filter((l) => l.type === 'checkin' || l.type === 'checkout').length})
            </button>
          </div>

          {/* Feed List */}
          <div className="bg-white rounded-2xl border border-gray-200/90 divide-y divide-gray-100 shadow-xs">
            {filteredLogs.map((log) => {
              const site = sites.find((s) => s.id === log.site_id);
              const author = getPerson(log.supervisor_id);
              const isIssue = log.type === 'issue';

              return (
                <div key={log.id} className="p-4 sm:p-5 hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        {log.type === 'checkin' && (
                          <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                            ✅ Checked In
                          </span>
                        )}
                        {log.type === 'checkout' && (
                          <span className="font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
                            🚪 Checked Out
                          </span>
                        )}
                        {log.type === 'update' && (
                          <span className="font-bold text-[#0B1F3A] bg-blue-50 px-2 py-0.5 rounded">
                            💬 Site Update
                          </span>
                        )}
                        {log.type === 'issue' && (
                          <span
                            className={`font-bold px-2 py-0.5 rounded ${
                              log.severity === 'high'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            ⚠️ Issue ({log.severity?.toUpperCase() || 'NORMAL'})
                            {log.resolved && ' · RESOLVED'}
                          </span>
                        )}

                        {site && (
                          <button
                            onClick={() => onOpenSite(site.id)}
                            className="font-bold text-[#0B1F3A] hover:underline"
                          >
                            {site.name}
                          </button>
                        )}
                      </div>

                      {editingLogId === log.id ? (
                        <div className="mt-2 space-y-2">
                          <textarea
                            rows={2}
                            value={editingLogNote}
                            onChange={(e) => setEditingLogNote(e.target.value)}
                            className="w-full p-2 text-xs border rounded-lg focus:outline-none focus:ring-1 focus:ring-[#C9A24B]"
                          />
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => setEditingLogId(null)}
                              className="px-2.5 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleSaveLogEdit(log.id)}
                              className="px-3 py-1 text-xs bg-[#0B1F3A] text-white rounded font-semibold"
                            >
                              Save Note
                            </button>
                          </div>
                        </div>
                      ) : (
                        log.note && (
                          <p className="mt-2 text-sm text-gray-800 leading-relaxed font-normal">
                            {log.note}
                          </p>
                        )
                      )}

                      {/* Photo Thumbnail */}
                      {log.photo_url && (
                        <div className="mt-2.5">
                          <img
                            src={log.photo_url}
                            alt="Site snapshot"
                            onClick={() =>
                              setSelectedPhoto({
                                url: log.photo_url!,
                                caption: log.note,
                                timestamp: log.created_at,
                                uploader: author,
                              })
                            }
                            className="max-h-48 rounded-xl object-cover border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity shadow-xs"
                          />
                        </div>
                      )}
                    </div>

                    <div className="text-right flex-shrink-0 text-xs">
                      <p className="font-medium text-gray-800">{author}</p>
                      <p className="text-[11px] text-gray-400 font-mono mt-0.5">
                        {timeAgo(log.created_at)}
                      </p>

                      <div className="flex items-center justify-end gap-1 mt-2">
                        <button
                          onClick={() => {
                            setEditingLogId(log.id);
                            setEditingLogNote(log.note || '');
                          }}
                          className="p-1 text-gray-400 hover:text-gray-700 rounded"
                          title="Edit log text"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteLog(log.id)}
                          className="p-1 text-gray-400 hover:text-red-600 rounded"
                          title="Delete log"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Issue Resolve Button */}
                  {isIssue && (
                    <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-end">
                      <button
                        onClick={async () => {
                          await resolveIssue(log.id, !log.resolved);
                        }}
                        className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-colors ${
                          log.resolved
                            ? 'border-gray-300 text-gray-600 hover:bg-gray-100'
                            : 'border-emerald-600 text-emerald-800 bg-emerald-50 hover:bg-emerald-100'
                        }`}
                      >
                        {log.resolved ? 'Reopen Issue' : 'Mark Resolved'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {filteredLogs.length === 0 && (
              <div className="p-8 text-center text-xs text-gray-400">
                No activity logs found for this filter.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: MANAGE & ADD SITE */}
      {tab === 'manage' && (
        <div className="space-y-6">
          {/* Add Site Card */}
          <div className="bg-white rounded-2xl border border-gray-200/90 p-6 shadow-xs space-y-5">
            <div className="border-b border-gray-100 pb-3">
              <h2 className="text-lg font-black text-[#0B1F3A] tracking-tight">
                Create & Assign New Site
              </h2>
              <p className="text-xs text-gray-500">
                Set up location, schedule, supervisor assignment, and tailored task checklist.
              </p>
            </div>

            <form onSubmit={handleCreateSite} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Site Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Richmond Riverside House Cleaning"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#C9A24B] text-sm"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Client Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Richmond Heritage Estates"
                    value={client}
                    onChange={(e) => setClient(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#C9A24B] text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Service Scope
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Deep clean, rooftile, post-construction"
                    value={service}
                    onChange={(e) => setService(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#C9A24B] text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Address / Location
                </label>
                <input
                  type="text"
                  placeholder="e.g. 24 Riverside Drive, Richmond, TW9 1NR"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#C9A24B] text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Quoted Days
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={quotedDays}
                    onChange={(e) => setQuotedDays(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#C9A24B] text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#C9A24B] text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Lead Supervisor *
                  </label>
                  <select
                    value={supervisorId}
                    onChange={(e) => setSupervisorId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#C9A24B] text-sm bg-white"
                  >
                    <option value="">— Select Supervisor —</option>
                    {profiles
                      .filter((p) => p.role === 'supervisor')
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.full_name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Template quick loader */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Checklist Scope (one task per line)
                  </label>

                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Sparkles className="w-3.5 h-3.5 text-[#C9A24B]" />
                    <span>Preset Templates:</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-2">
                  {Object.keys(CHECKLIST_TEMPLATES).map((tmpl) => (
                    <button
                      key={tmpl}
                      type="button"
                      onClick={() => handleApplyTemplate(tmpl)}
                      className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-gray-100 hover:bg-[#C9A24B]/20 text-gray-700 hover:text-[#0B1F3A] transition-colors"
                    >
                      {tmpl}
                    </button>
                  ))}
                </div>

                <textarea
                  rows={6}
                  value={checklistText}
                  onChange={(e) => setChecklistText(e.target.value)}
                  placeholder="Pre-clean walkthrough&#10;Scaffolding safety check&#10;Pressure tile wash&#10;Final inspection with client"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#C9A24B] text-sm font-mono leading-relaxed"
                />
              </div>

              {formError && (
                <p className="text-xs text-red-600 font-semibold">{formError}</p>
              )}

              <button
                type="submit"
                disabled={isSubmittingSite}
                className="w-full py-3 px-4 rounded-xl bg-[#0B1F3A] hover:bg-[#13305a] text-[#C9A24B] font-bold text-sm shadow-md transition-all active:scale-95"
              >
                Create & Publish Site
              </button>
            </form>
          </div>

          {/* Team Directory Card */}
          <div className="bg-white rounded-2xl border border-gray-200/90 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-[#0B1F3A]">Team Roster</h3>
                <p className="text-xs text-gray-500">Management & Site Supervisors</p>
              </div>
              <button
                onClick={() => setShowAddSupModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-[#0B1F3A] text-white hover:bg-[#13305a]"
              >
                <Plus className="w-3.5 h-3.5 text-[#C9A24B]" />
                Add Supervisor
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {profiles.map((p) => {
                const assignedCount = sites.filter((s) => s.supervisor_id === p.id && s.status === 'active').length;
                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50/70"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-[#0B1F3A] text-[#C9A24B] font-bold text-xs flex items-center justify-center flex-shrink-0">
                        {p.full_name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-bold text-gray-900 truncate">{p.full_name}</p>
                        <p className="text-[11px] text-gray-500 truncate">{p.email || p.role}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="text-right text-xs">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          p.role === 'ceo' ? 'bg-[#C9A24B] text-[#0B1F3A]' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {p.role}
                        </span>
                        <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                          PIN: <strong className="text-gray-800">{p.passcode || '****'}</strong>
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          setEditingProfile(p);
                          setEditProfileName(p.full_name);
                          setEditProfileEmail(p.email || '');
                          setEditProfilePasscode(p.passcode || '');
                        }}
                        className="p-1 text-gray-400 hover:text-[#0B1F3A] rounded"
                        title="Edit member"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>

                      {p.role !== 'ceo' && (
                        <button
                          onClick={() => handleDeleteProfile(p.id)}
                          className="p-1 text-gray-400 hover:text-red-600 rounded"
                          title="Delete member"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* All Sites Directory with Status Changer & Edit/Delete */}
          <div className="bg-white rounded-2xl border border-gray-200/90 p-6 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-[#0B1F3A] border-b border-gray-100 pb-3">
              All Sites Directory ({sites.length})
            </h3>

            <div className="divide-y divide-gray-100">
              {sites.map((s) => (
                <div key={s.id} className="py-3 flex items-center justify-between gap-3">
                  <div
                    onClick={() => onOpenSite(s.id)}
                    className="min-w-0 flex-1 cursor-pointer hover:text-[#9C7723] transition-colors"
                  >
                    <p className="text-sm font-bold text-gray-900 truncate">{s.name}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {s.client} · Status: <span className="font-semibold uppercase">{s.status}</span> · Supervisor: {getPerson(s.supervisor_id)}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => setEditingSite(s)}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-1"
                      title="Edit Site Details"
                    >
                      <Edit className="w-3 h-3 text-[#C9A24B]" />
                      Edit
                    </button>

                    {s.status === 'active' ? (
                      <button
                        onClick={async () => await updateSiteStatus(s.id, 'completed')}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        Complete
                      </button>
                    ) : (
                      <button
                        onClick={async () => await updateSiteStatus(s.id, 'active')}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-[#0B1F3A] text-white hover:bg-[#13305a] transition-colors"
                      >
                        Reopen
                      </button>
                    )}

                    <button
                      onClick={async () => {
                        if (window.confirm(`Permanently delete "${s.name}"?`)) {
                          await deleteSite(s.id);
                        }
                      }}
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                      title="Delete site"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add Supervisor Modal */}
      {showAddSupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl text-[#14213a] space-y-4">
            <h3 className="font-bold text-base text-[#0B1F3A]">Add New Supervisor</h3>
            <form onSubmit={handleAddSupervisor} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Liam Smith"
                  value={newSupName}
                  onChange={(e) => setNewSupName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-xl"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  placeholder="liam.s@sovereigntouch.co.uk"
                  value={newSupEmail}
                  onChange={(e) => setNewSupEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Access PIN / Passcode</label>
                <input
                  type="text"
                  placeholder="e.g. 1004"
                  value={newSupPasscode}
                  onChange={(e) => setNewSupPasscode(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-xl font-mono"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddSupModal(false)}
                  className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-[#0B1F3A] text-white rounded-lg hover:bg-[#13305a]"
                >
                  Add to Team
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {editingProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl text-[#14213a] space-y-4">
            <h3 className="font-bold text-base text-[#0B1F3A]">Edit Team Member</h3>
            <form onSubmit={handleSaveProfileEdit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={editProfileName}
                  onChange={(e) => setEditProfileName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-xl"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={editProfileEmail}
                  onChange={(e) => setEditProfileEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-xl"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Access PIN / Passcode</label>
                <input
                  type="text"
                  value={editProfilePasscode}
                  onChange={(e) => setEditProfilePasscode(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-xl font-mono"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingProfile(null)}
                  className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-[#0B1F3A] text-white rounded-lg hover:bg-[#13305a]"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Site Modal */}
      <EditSiteModal
        isOpen={Boolean(editingSite)}
        onClose={() => setEditingSite(null)}
        site={editingSite}
        profiles={profiles}
      />

      {/* Lightbox Photo Modal */}
      <PhotoModal
        photoUrl={selectedPhoto?.url || null}
        caption={selectedPhoto?.caption}
        timestamp={selectedPhoto?.timestamp}
        uploaderName={selectedPhoto?.uploader}
        onClose={() => setSelectedPhoto(null)}
      />
    </div>
  );
};
