import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Camera,
  AlertTriangle,
  Send,
  LogIn,
  LogOut,
  MapPin,
  Calendar,
  Clock,
  Plus,
  FileText,
  User,
  Shield,
  Check,
  RefreshCw,
  Image as ImageIcon,
  Edit,
  Trash2,
  X,
  Save,
} from 'lucide-react';
import { Site, ChecklistItem, SiteLog, Profile } from '../types';
import {
  fmtTime,
  timeAgo,
  getDayInfo,
  getSitePresence,
  getSiteProgress,
  getOpenIssues,
} from '../lib/utils';
import {
  toggleChecklistItem,
  addChecklistItem,
  updateChecklistItem,
  deleteChecklistItem,
  addLog,
  updateLog,
  deleteLog,
  resolveIssue,
  updateSiteStatus,
} from '../lib/store';
import { PhotoModal } from './PhotoModal';
import { SiteReportModal } from './SiteReportModal';
import { EditSiteModal } from './EditSiteModal';

interface Props {
  site: Site;
  items: ChecklistItem[];
  logs: SiteLog[];
  profiles: Profile[];
  currentUser: Profile;
  onBack: () => void;
}

export const SiteDetailView: React.FC<Props> = ({
  site,
  items,
  logs,
  profiles,
  currentUser,
  onBack,
}) => {
  const isCEO = currentUser.role === 'ceo';
  const supervisor = profiles.find((p) => p.id === site.supervisor_id);
  const siteLogs = logs.filter((l) => l.site_id === site.id);
  const siteItems = items.filter((i) => i.site_id === site.id);
  const presence = getSitePresence(site.id, logs);
  const dayInfo = getDayInfo(site);
  const progress = getSiteProgress(siteItems);
  const openIssues = getOpenIssues(site.id, logs);

  // Form states
  const [note, setNote] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState('');
  const [newTaskLabel, setNewTaskLabel] = useState('');
  const [showAddTask, setShowAddTask] = useState(false);
  const [issueSeverity, setIssueSeverity] = useState<'low' | 'high'>('high');

  // Checklist Item Editing
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemText, setEditingItemText] = useState('');

  // Log Editing
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [editingLogText, setEditingLogText] = useState('');

  // Modals
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<{
    url: string;
    caption?: string | null;
    timestamp?: string;
    uploader?: string;
  } | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const url = URL.createObjectURL(file);
      setPhotoPreview(url);
    }
  };

  const clearPhoto = () => {
    setPhotoFile(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
  };

  const handleToggleTask = async (itemId: string, currentDone: boolean) => {
    const nextDone = !currentDone;
    await toggleChecklistItem(itemId, nextDone);

    // If this completed the last remaining task, blast celebration confetti!
    if (nextDone) {
      const remaining = siteItems.filter((i) => i.id !== itemId && !i.done).length;
      if (remaining === 0) {
        confetti({
          particleCount: 120,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#C9A24B', '#0B1F3A', '#22c55e', '#ffffff'],
        });
      }
    }
  };

  const handleAddNewTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskLabel.trim()) return;
    await addChecklistItem(site.id, newTaskLabel);
    setNewTaskLabel('');
    setShowAddTask(false);
  };

  const handleSaveItemEdit = async (itemId: string) => {
    if (editingItemText.trim()) {
      await updateChecklistItem(itemId, editingItemText.trim());
    }
    setEditingItemId(null);
    setEditingItemText('');
  };

  const handleDeleteItem = async (itemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Delete this task from the site checklist?')) {
      await deleteChecklistItem(itemId);
    }
  };

  const handleSaveLogEdit = async (logId: string) => {
    if (editingLogText.trim()) {
      await updateLog(logId, { note: editingLogText.trim() });
    }
    setEditingLogId(null);
    setEditingLogText('');
  };

  const handleDeleteLog = async (logId: string) => {
    if (window.confirm('Delete this log entry?')) {
      await deleteLog(logId);
    }
  };

  const handleCheckInOut = async () => {
    setIsSubmitting(true);
    setActionError('');

    let loc: { lat: number; lng: number; accuracy?: number } | null = null;
    try {
      if ('geolocation' in navigator) {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 5000,
            maximumAge: 60000,
          });
        });
        loc = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };
      }
    } catch {
      // Geolocation denied or unavailable; proceed gracefully
    }

    const type = presence ? 'checkout' : 'checkin';
    const checkinNote = presence
      ? `Checked out of site by ${currentUser.full_name}`
      : `Checked in on site by ${currentUser.full_name}`;

    await addLog({
      site_id: site.id,
      supervisor_id: currentUser.id,
      type,
      note: checkinNote,
      location: loc,
    });

    setIsSubmitting(false);
  };

  const handleSendLog = async (type: 'update' | 'issue') => {
    setActionError('');
    const cleanNote = note.trim();

    if (type === 'issue' && !cleanNote) {
      setActionError('Please describe the issue in the note box.');
      return;
    }

    if (type === 'update' && !cleanNote && !photoFile) {
      setActionError('Please provide a note or select a photo.');
      return;
    }

    setIsSubmitting(true);
    await addLog({
      site_id: site.id,
      supervisor_id: currentUser.id,
      type,
      note: cleanNote || null,
      severity: type === 'issue' ? issueSeverity : null,
      photoFile,
    });

    setNote('');
    clearPhoto();
    setIsSubmitting(false);
  };

  const handleResolveIssue = async (logId: string, currentResolved: boolean) => {
    await resolveIssue(logId, !currentResolved);
  };

  const handleToggleSiteStatus = async () => {
    const nextStatus = site.status === 'active' ? 'completed' : 'active';
    await updateSiteStatus(site.id, nextStatus);
  };

  const getPersonName = (id: string) => {
    return profiles.find((p) => p.id === id)?.full_name || 'Operative';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-20 animate-in fade-in duration-150">
      {/* Top Navigation */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#0B1F3A] bg-white border border-gray-200 rounded-xl hover:bg-gray-100 transition-all shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Overview
        </button>

        <div className="flex items-center gap-2">
          {/* Edit Site Button */}
          <button
            onClick={() => setShowEditModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#0B1F3A] bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-all shadow-xs"
          >
            <Edit className="w-3.5 h-3.5 text-[#C9A24B]" />
            <span>Edit Site</span>
          </button>

          <button
            onClick={() => setShowReportModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#0B1F3A] bg-white border border-[#C9A24B]/60 rounded-xl hover:bg-[#C9A24B]/10 transition-all shadow-xs"
          >
            <FileText className="w-3.5 h-3.5 text-[#C9A24B]" />
            <span className="hidden sm:inline">Handover Report</span>
          </button>

          {isCEO && (
            <button
              onClick={handleToggleSiteStatus}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all shadow-xs ${
                site.status === 'active'
                  ? 'bg-white text-emerald-800 border-emerald-300 hover:bg-emerald-50'
                  : 'bg-[#0B1F3A] text-white border-transparent hover:bg-[#13305a]'
              }`}
            >
              {site.status === 'active' ? 'Mark Completed' : 'Reopen Site'}
            </button>
          )}
        </div>
      </div>

      {/* Site Master Header Card */}
      <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-[#0B1F3A] tracking-tight">
                {site.name}
              </h1>

              <button
                onClick={() => setShowEditModal(true)}
                className="p-1 text-gray-400 hover:text-[#C9A24B] transition-colors"
                title="Edit Site Details"
              >
                <Edit className="w-4 h-4" />
              </button>

              {presence ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  ON SITE
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                  <span className="w-2 h-2 rounded-full bg-gray-400" />
                  NOT ON SITE
                </span>
              )}
            </div>

            <p className="text-sm font-semibold text-gray-700">
              {site.client} {site.address ? `· ${site.address}` : ''}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Service: <span className="font-medium text-gray-700">{site.service}</span>
            </p>
          </div>

          {/* Schedule Badges */}
          <div className="flex flex-row sm:flex-col items-start sm:items-end gap-1.5 text-xs">
            <span
              className={`inline-block px-3 py-1 rounded-full font-bold text-xs ${
                dayInfo.late
                  ? 'bg-red-100 text-red-700 border border-red-200'
                  : 'bg-amber-100 text-amber-900 border border-amber-200'
              }`}
            >
              {dayInfo.formattedRange}
            </span>
            <div className="text-gray-500 flex items-center gap-1 text-[11px]">
              <User className="w-3.5 h-3.5 text-[#C9A24B]" />
              Supervisor: <strong className="text-gray-800">{supervisor?.full_name || '—'}</strong>
            </div>
          </div>
        </div>

        {site.notes && (
          <div className="mt-4 p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs text-gray-700 flex items-start justify-between gap-2">
            <div>
              <span className="font-bold text-gray-900">Site Notes: </span>
              {site.notes}
            </div>
            <button
              onClick={() => setShowEditModal(true)}
              className="text-[11px] text-[#C9A24B] hover:underline font-semibold flex-shrink-0"
            >
              Edit
            </button>
          </div>
        )}

        {/* Presence Hero Action (Supervisor & Crew) */}
        {site.status === 'active' && (
          <div className="mt-5 pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-gradient-to-r from-gray-50 to-white p-3.5 rounded-xl border border-gray-200">
            <div>
              <p className="text-xs font-bold text-[#0B1F3A]">Site Attendance Status</p>
              <p className="text-[11px] text-gray-500">
                {presence
                  ? `Checked in by ${getPersonName(presence.supervisor_id)} (${timeAgo(presence.created_at)})`
                  : 'No operatives currently logged as present on site.'}
              </p>
            </div>

            <button
              onClick={handleCheckInOut}
              disabled={isSubmitting}
              className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm shadow-md transition-all active:scale-95 ${
                presence
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : 'bg-[#C9A24B] hover:bg-[#dfbd60] text-[#0B1F3A]'
              }`}
            >
              {presence ? (
                <>
                  <LogOut className="w-4 h-4" />
                  Check Out of Site
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Check In on Site Now
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Checklist Card */}
      <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-[#0B1F3A] flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-[#C9A24B]" />
              Site Scope & Checklist
            </h2>
            <p className="text-xs text-gray-500">
              {progress.done} of {progress.total} tasks completed ({progress.pct}%)
            </p>
          </div>

          <button
            onClick={() => setShowAddTask(!showAddTask)}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#0B1F3A] bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Task
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#C9A24B] to-emerald-500 transition-all duration-300 rounded-full"
            style={{ width: `${progress.pct}%` }}
          />
        </div>

        {/* Inline Add Task Form */}
        {showAddTask && (
          <form onSubmit={handleAddNewTask} className="flex gap-2 pt-2 animate-in fade-in duration-150">
            <input
              type="text"
              placeholder="e.g. Chemical rinse on East elevation"
              value={newTaskLabel}
              onChange={(e) => setNewTaskLabel(e.target.value)}
              className="flex-1 px-3 py-2 text-xs border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C9A24B]"
              autoFocus
            />
            <button
              type="submit"
              className="px-3.5 py-2 bg-[#0B1F3A] text-white text-xs font-semibold rounded-xl hover:bg-[#13305a]"
            >
              Save
            </button>
          </form>
        )}

        {/* Task Items List */}
        <div className="divide-y divide-gray-100">
          {siteItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-2 py-3 px-2 rounded-xl hover:bg-gray-50/80 transition-colors group"
            >
              {editingItemId === item.id ? (
                <div className="flex-1 flex items-center gap-2">
                  <input
                    type="text"
                    value={editingItemText}
                    onChange={(e) => setEditingItemText(e.target.value)}
                    className="flex-1 px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A24B]"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveItemEdit(item.id);
                      if (e.key === 'Escape') setEditingItemId(null);
                    }}
                  />
                  <button
                    onClick={() => handleSaveItemEdit(item.id)}
                    className="p-1.5 bg-[#0B1F3A] text-white rounded-lg hover:bg-[#13305a]"
                    title="Save"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setEditingItemId(null)}
                    className="p-1.5 text-gray-500 hover:bg-gray-200 rounded-lg"
                    title="Cancel"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <>
                  <div
                    onClick={() => handleToggleTask(item.id, item.done)}
                    className="flex-1 min-w-0 flex items-start gap-3 cursor-pointer"
                  >
                    <button
                      type="button"
                      className="mt-0.5 flex-shrink-0"
                    >
                      {item.done ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-100" />
                      ) : (
                        <Circle className="w-5 h-5 text-gray-300 hover:text-gray-400" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm select-none transition-all ${
                          item.done
                            ? 'line-through text-gray-400 decoration-gray-400'
                            : 'text-gray-800 font-medium'
                        }`}
                      >
                        {item.label}
                      </p>
                      {item.done && item.done_at && (
                        <p className="text-[10px] text-gray-400 mt-0.5 font-mono">
                          Completed {fmtTime(item.done_at)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Task Actions (Edit / Delete) */}
                  <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => {
                        setEditingItemId(item.id);
                        setEditingItemText(item.label);
                      }}
                      className="p-1.5 text-gray-400 hover:text-[#0B1F3A] hover:bg-gray-100 rounded-lg transition-colors"
                      title="Edit task name"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteItem(item.id, e)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete task"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}

          {siteItems.length === 0 && (
            <div className="py-6 text-center text-xs text-gray-400">
              No checklist tasks added yet. Click &quot;Add Task&quot; above to create one.
            </div>
          )}
        </div>
      </div>

      {/* Send an Update / Report Issue Box */}
      <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-[#0B1F3A] flex items-center gap-2">
          <Send className="w-4 h-4 text-[#C9A24B]" />
          Post Live Update or Report Issue
        </h2>

        <textarea
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="What's happening on site? (e.g. North wall stripped, await tile dry; or describe a blockage)"
          className="w-full p-3 text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#C9A24B] bg-gray-50/50"
        />

        {/* Photo Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-semibold text-gray-700 cursor-pointer transition-colors">
              <Camera className="w-4 h-4 text-[#C9A24B]" />
              <span>Attach Photo</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handlePhotoSelect}
              />
            </label>

            {photoPreview && (
              <div className="relative inline-block">
                <img
                  src={photoPreview}
                  alt="Preview"
                  className="w-10 h-10 object-cover rounded-lg border border-gray-300"
                />
                <button
                  onClick={clearPhoto}
                  className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white rounded-full p-0.5 shadow-sm hover:bg-rose-700"
                  title="Remove"
                >
                  ×
                </button>
              </div>
            )}
          </div>

          {/* Issue Severity Selector */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-500 font-medium">Issue Urgency:</span>
            <button
              type="button"
              onClick={() => setIssueSeverity('low')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                issueSeverity === 'low'
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              Low
            </button>
            <button
              type="button"
              onClick={() => setIssueSeverity('high')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                issueSeverity === 'high'
                  ? 'bg-red-100 text-red-800 border border-red-300'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              High
            </button>
          </div>
        </div>

        {actionError && (
          <p className="text-xs text-rose-600 font-semibold">{actionError}</p>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            onClick={() => handleSendLog('update')}
            disabled={isSubmitting}
            className="w-full py-2.5 px-4 rounded-xl bg-[#0B1F3A] hover:bg-[#13305a] text-white text-xs font-semibold shadow-xs transition-all active:scale-95"
          >
            Send Update
          </button>
          <button
            onClick={() => handleSendLog('issue')}
            disabled={isSubmitting}
            className="w-full py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs transition-all active:scale-95 flex items-center justify-center gap-1.5"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Report Issue
          </button>
        </div>
      </div>

      {/* Site Activity Timeline Card */}
      <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-[#0B1F3A] flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#C9A24B]" />
            Site Timeline & Records ({siteLogs.length})
          </h2>
          {openIssues.length > 0 && (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
              {openIssues.length} open issue{openIssues.length > 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="space-y-3">
          {siteLogs.map((log) => {
            const author = getPersonName(log.supervisor_id);
            const isIssue = log.type === 'issue';
            return (
              <div
                key={log.id}
                className={`p-3.5 rounded-xl border transition-all ${
                  isIssue
                    ? log.resolved
                      ? 'border-emerald-200 bg-emerald-50/40 opacity-75'
                      : log.severity === 'high'
                      ? 'border-red-300 bg-red-50/40 border-l-4 border-l-red-600'
                      : 'border-amber-300 bg-amber-50/40 border-l-4 border-l-amber-500'
                    : 'border-gray-100 bg-gray-50/60'
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 font-bold">
                    {log.type === 'checkin' && <span className="text-emerald-700">✅ Checked in</span>}
                    {log.type === 'checkout' && <span className="text-gray-600">🚪 Checked out</span>}
                    {log.type === 'update' && <span className="text-[#0B1F3A]">💬 Site Update</span>}
                    {log.type === 'issue' && (
                      <span className={log.severity === 'high' ? 'text-red-700' : 'text-amber-800'}>
                        ⚠️ Issue ({log.severity?.toUpperCase() || 'NORMAL'})
                        {log.resolved && ' · Resolved'}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 font-mono text-[11px]">
                      {fmtTime(log.created_at)} · {author}
                    </span>

                    {/* Edit Note & Delete Log */}
                    <button
                      onClick={() => {
                        setEditingLogId(log.id);
                        setEditingLogText(log.note || '');
                      }}
                      className="p-1 text-gray-400 hover:text-gray-700 rounded"
                      title="Edit note"
                    >
                      <Edit className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDeleteLog(log.id)}
                      className="p-1 text-gray-400 hover:text-red-600 rounded"
                      title="Delete log"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Inline Editing for Note */}
                {editingLogId === log.id ? (
                  <div className="mt-2 space-y-2">
                    <textarea
                      rows={2}
                      value={editingLogText}
                      onChange={(e) => setEditingLogText(e.target.value)}
                      className="w-full p-2 text-xs border rounded-lg focus:outline-none focus:ring-1 focus:ring-[#C9A24B]"
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => setEditingLogId(null)}
                        className="px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleSaveLogEdit(log.id)}
                        className="px-3 py-1 text-xs bg-[#0B1F3A] text-white rounded font-semibold"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  log.note && (
                    <p className="mt-2 text-sm text-gray-800 leading-relaxed">
                      {log.note}
                    </p>
                  )
                )}

                {/* Geolocation Tag if present */}
                {log.location && (
                  <div className="mt-2 inline-flex items-center gap-1 text-[11px] text-gray-500 bg-white/80 px-2 py-0.5 rounded border border-gray-200">
                    <MapPin className="w-3 h-3 text-red-500" />
                    GPS Tagged ({log.location.lat.toFixed(4)}, {log.location.lng.toFixed(4)})
                  </div>
                )}

                {/* Attached Photo */}
                {log.photo_url && (
                  <div className="mt-2.5">
                    <img
                      src={log.photo_url}
                      alt="Site photo"
                      onClick={() =>
                        setSelectedPhoto({
                          url: log.photo_url!,
                          caption: log.note,
                          timestamp: log.created_at,
                          uploader: author,
                        })
                      }
                      className="max-h-48 max-w-full rounded-xl object-cover cursor-pointer hover:opacity-90 transition-opacity border border-gray-200 shadow-xs"
                    />
                  </div>
                )}

                {/* Issue Resolution Button (CEO or field Lead) */}
                {isIssue && (
                  <div className="mt-3 pt-2 border-t border-gray-200/60 flex items-center justify-end">
                    <button
                      onClick={() => handleResolveIssue(log.id, log.resolved)}
                      className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-colors ${
                        log.resolved
                          ? 'border-gray-300 text-gray-600 hover:bg-white'
                          : 'border-emerald-600 text-emerald-800 bg-white hover:bg-emerald-50'
                      }`}
                    >
                      {log.resolved ? 'Reopen Issue' : 'Mark Resolved'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {siteLogs.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-6">
              No activity logs recorded yet.
            </p>
          )}
        </div>
      </div>

      {/* Lightbox Photo Modal */}
      <PhotoModal
        photoUrl={selectedPhoto?.url || null}
        caption={selectedPhoto?.caption}
        timestamp={selectedPhoto?.timestamp}
        uploaderName={selectedPhoto?.uploader}
        onClose={() => setSelectedPhoto(null)}
      />

      {/* Handover Report Modal */}
      <SiteReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        site={site}
        items={siteItems}
        logs={siteLogs}
        supervisor={supervisor}
      />

      {/* Edit Site Modal */}
      <EditSiteModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        site={site}
        profiles={profiles}
        onDeleted={onBack}
      />
    </div>
  );
};
