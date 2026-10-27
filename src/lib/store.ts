import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Profile, Site, ChecklistItem, SiteLog, UserRole } from '../types';
import {
  INITIAL_PROFILES,
  INITIAL_SITES,
  INITIAL_CHECKLIST_ITEMS,
  INITIAL_LOGS,
} from './initialData';

const STORAGE_KEYS = {
  PROFILES: 'sthc_profiles',
  SITES: 'sthc_sites',
  ITEMS: 'sthc_checklist_items',
  LOGS: 'sthc_site_logs',
  CURRENT_USER_ID: 'sthc_current_user_id',
  IS_LOCKED: 'sthc_is_locked',
  SUPABASE_URL: 'sthc_supabase_url',
  SUPABASE_ANON_KEY: 'sthc_supabase_anon_key',
  USE_SUPABASE: 'sthc_use_supabase',
};

// Check for environment variables or saved keys
export function getSavedSupabaseConfig() {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();
  const url = (localStorage.getItem(STORAGE_KEYS.SUPABASE_URL) || envUrl).trim();
  const anonKey = (localStorage.getItem(STORAGE_KEYS.SUPABASE_ANON_KEY) || envKey).trim();

  const isPlaceholder = (val: string) => {
    if (!val) return true;
    const lower = val.toLowerCase();
    return (
      lower.includes('your_project') ||
      lower.includes('your_anon') ||
      lower.includes('paste_') ||
      lower.includes('xyzcompany') ||
      lower.includes('example') ||
      lower.includes('paste_project_url') ||
      lower.includes('paste_anon_public_key')
    );
  };

  const isConfigured = Boolean(
    url &&
    anonKey &&
    !isPlaceholder(url) &&
    !isPlaceholder(anonKey) &&
    url.startsWith('https://') &&
    url.includes('.supabase.co')
  );

  const savedPreference = localStorage.getItem(STORAGE_KEYS.USE_SUPABASE);
  const useSupabase = isConfigured && savedPreference !== 'false';
  return { url, anonKey, isConfigured, useSupabase };
}

export function saveSupabaseConfig(url: string, anonKey: string, useSupabase: boolean = true) {
  localStorage.setItem(STORAGE_KEYS.SUPABASE_URL, url.trim());
  localStorage.setItem(STORAGE_KEYS.SUPABASE_ANON_KEY, anonKey.trim());
  localStorage.setItem(STORAGE_KEYS.USE_SUPABASE, useSupabase ? 'true' : 'false');
}

export function clearSupabaseConfig() {
  localStorage.removeItem(STORAGE_KEYS.SUPABASE_URL);
  localStorage.removeItem(STORAGE_KEYS.SUPABASE_ANON_KEY);
  localStorage.setItem(STORAGE_KEYS.USE_SUPABASE, 'false');
}

let supabaseClientInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const config = getSavedSupabaseConfig();
  if (!config.useSupabase || !config.isConfigured) {
    supabaseClientInstance = null;
    return null;
  }
  if (!supabaseClientInstance) {
    try {
      supabaseClientInstance = createClient(config.url, config.anonKey, {
        auth: { persistSession: true },
      });
    } catch (err) {
      console.warn('Failed to initialize Supabase client:', err);
      supabaseClientInstance = null;
    }
  }
  return supabaseClientInstance;
}

// Local storage helpers
function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeLocal<T>(key: string, data: T) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.warn(`Storage quota exceeded or error writing ${key}:`, err);
  }
}

// Global Store State
export interface AppData {
  profiles: Profile[];
  sites: Site[];
  items: ChecklistItem[];
  logs: SiteLog[];
  currentUser: Profile;
  isLive: boolean; // whether connected to Supabase realtime
  isSupabaseMode: boolean;
  error: string | null;
  isLocked: boolean;
}

type Listener = (data: AppData) => void;
const listeners = new Set<Listener>();

let currentData: AppData = {
  profiles: INITIAL_PROFILES,
  sites: INITIAL_SITES,
  items: INITIAL_CHECKLIST_ITEMS,
  logs: INITIAL_LOGS,
  currentUser: INITIAL_PROFILES[0], // Default: Ahmed (CEO)
  isLive: false,
  isSupabaseMode: false,
  error: null,
  isLocked: true,
};

function notify() {
  listeners.forEach((fn) => fn({ ...currentData }));
}

// Initialize state
export function initStore() {
  // Read local profiles or init
  let profiles = readLocal<Profile[]>(STORAGE_KEYS.PROFILES, INITIAL_PROFILES);
  if (!profiles || profiles.length === 0) {
    profiles = INITIAL_PROFILES;
  }

  // Ensure every profile has a passcode
  profiles = profiles.map((p) => {
    if (!p.passcode) {
      const init = INITIAL_PROFILES.find((ip) => ip.id === p.id);
      return { ...p, passcode: init?.passcode || (p.role === 'ceo' ? '9999' : '1001') };
    }
    return p;
  });
  writeLocal(STORAGE_KEYS.PROFILES, profiles);

  let sites = readLocal<Site[]>(STORAGE_KEYS.SITES, INITIAL_SITES);
  if (!sites || sites.length === 0) {
    sites = INITIAL_SITES;
    writeLocal(STORAGE_KEYS.SITES, sites);
  }

  let items = readLocal<ChecklistItem[]>(STORAGE_KEYS.ITEMS, INITIAL_CHECKLIST_ITEMS);
  if (!items || items.length === 0) {
    items = INITIAL_CHECKLIST_ITEMS;
    writeLocal(STORAGE_KEYS.ITEMS, items);
  }

  let logs = readLocal<SiteLog[]>(STORAGE_KEYS.LOGS, INITIAL_LOGS);
  if (!logs || logs.length === 0) {
    logs = INITIAL_LOGS;
    writeLocal(STORAGE_KEYS.LOGS, logs);
  }

  const savedUserId = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
  const currentUser = profiles.find((p) => p.id === savedUserId) || profiles[0];
  const isLocked = localStorage.getItem(STORAGE_KEYS.IS_LOCKED) !== 'false';

  const config = getSavedSupabaseConfig();

  currentData = {
    profiles,
    sites,
    items,
    logs,
    currentUser,
    isLive: false,
    isSupabaseMode: config.useSupabase,
    error: null,
    isLocked,
  };

  notify();

  // If Supabase is enabled, try to fetch and subscribe
  if (config.useSupabase) {
    loadFromSupabase();
  }

  // Cross-tab sync
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEYS.SITES || e.key === STORAGE_KEYS.ITEMS || e.key === STORAGE_KEYS.LOGS) {
      currentData.sites = readLocal<Site[]>(STORAGE_KEYS.SITES, currentData.sites);
      currentData.items = readLocal<ChecklistItem[]>(STORAGE_KEYS.ITEMS, currentData.items);
      currentData.logs = readLocal<SiteLog[]>(STORAGE_KEYS.LOGS, currentData.logs);
      notify();
    }
  });
}

// Fetch from Supabase
export async function loadFromSupabase() {
  const sb = getSupabaseClient();
  if (!sb) {
    currentData.isLive = false;
    currentData.isSupabaseMode = false;
    notify();
    return;
  }

  try {
    const [sRes, iRes, lRes, pRes] = await Promise.all([
      sb.from('sites').select('*').order('created_at', { ascending: false }),
      sb.from('checklist_items').select('*').order('sort'),
      sb.from('site_logs').select('*').order('created_at', { ascending: false }).limit(400),
      sb.from('profiles').select('*'),
    ]);

    if (sRes.error) throw sRes.error;

    currentData.sites = sRes.data || [];
    currentData.items = iRes.data || [];
    currentData.logs = lRes.data || [];
    if (pRes.data && pRes.data.length > 0) {
      currentData.profiles = pRes.data;
      if (!currentData.profiles.some((p) => p.id === currentData.currentUser.id)) {
        currentData.currentUser = currentData.profiles[0];
      }
    }
    currentData.isLive = true;
    currentData.isSupabaseMode = true;
    currentData.error = null;
    notify();

    // Subscribe to realtime changes safely
    try {
      const ch = sb.channel('ops_channel');
      ['sites', 'checklist_items', 'site_logs', 'profiles'].forEach((t) => {
        ch.on(
          'postgres_changes',
          { event: '*', schema: 'public', table: t },
          () => {
            loadFromSupabase();
          }
        );
      });

      ch.subscribe((status) => {
        currentData.isLive = status === 'SUBSCRIBED';
        notify();
      });
    } catch (subErr) {
      console.warn('Supabase realtime notice:', subErr);
    }
  } catch (err: unknown) {
    const errorMsg = (err as { message?: string })?.message || 'Unable to reach Supabase database';
    console.warn('Supabase connection notice (falling back to local mode):', errorMsg);
    currentData.isLive = false;
    currentData.error = errorMsg;
    // Ensure dashboard displays local storage data smoothly
    const localSites = readLocal<Site[]>(STORAGE_KEYS.SITES, INITIAL_SITES);
    const localItems = readLocal<ChecklistItem[]>(STORAGE_KEYS.ITEMS, INITIAL_CHECKLIST_ITEMS);
    const localLogs = readLocal<SiteLog[]>(STORAGE_KEYS.LOGS, INITIAL_LOGS);
    if (!currentData.sites.length) currentData.sites = localSites;
    if (!currentData.items.length) currentData.items = localItems;
    if (!currentData.logs.length) currentData.logs = localLogs;
    notify();
  }
}

// Subscribe to store updates
export function subscribeStore(listener: Listener) {
  listeners.add(listener);
  listener({ ...currentData });
  return () => {
    listeners.delete(listener);
  };
}

export function getCurrentData() {
  return currentData;
}

// Actions
export function verifyAndUnlock(profileId: string, inputPin: string): { success: boolean; message?: string } {
  const profile = currentData.profiles.find((p) => p.id === profileId);
  if (!profile) return { success: false, message: 'User not found.' };

  const expectedPin = profile.passcode || (profile.role === 'ceo' ? '9999' : '1001');
  // Allow user's passcode or CEO master override '9999'
  if (inputPin.trim() === expectedPin || (inputPin.trim() === '9999' && profile.role === 'ceo')) {
    currentData.currentUser = profile;
    currentData.isLocked = false;
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, profile.id);
    localStorage.setItem(STORAGE_KEYS.IS_LOCKED, 'false');
    notify();
    return { success: true };
  }

  return { success: false, message: 'Invalid passcode. Please enter the correct PIN.' };
}

export function lockSession() {
  currentData.isLocked = true;
  localStorage.setItem(STORAGE_KEYS.IS_LOCKED, 'true');
  notify();
}

export function setCurrentUser(userId: string) {
  const user = currentData.profiles.find((p) => p.id === userId);
  if (user) {
    currentData.currentUser = user;
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, userId);
    notify();
  }
}

export async function addSite(siteData: {
  name: string;
  client: string;
  address: string;
  service: string;
  quoted_days: number;
  start_date: string;
  supervisor_id: string;
  checklistText: string;
}) {
  const sb = getSupabaseClient();
  const id = `site-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const newSite: Site = {
    id,
    name: siteData.name.trim(),
    client: siteData.client.trim(),
    address: siteData.address.trim(),
    service: siteData.service.trim(),
    quoted_days: Math.max(1, siteData.quoted_days),
    start_date: siteData.start_date || new Date().toISOString().slice(0, 10),
    status: 'active',
    supervisor_id: siteData.supervisor_id,
    created_at: new Date().toISOString(),
  };

  const checklistLines = siteData.checklistText
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);

  const newItems: ChecklistItem[] = checklistLines.map((label, idx) => ({
    id: `chk-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 5)}`,
    site_id: id,
    label,
    done: false,
    done_at: null,
    sort: idx,
  }));

  if (sb && currentData.isSupabaseMode) {
    try {
      const { data, error } = await sb
        .from('sites')
        .insert({
          name: newSite.name,
          client: newSite.client,
          address: newSite.address,
          service: newSite.service,
          quoted_days: newSite.quoted_days,
          start_date: newSite.start_date,
          supervisor_id: newSite.supervisor_id,
        })
        .select()
        .single();
      if (error) throw error;

      if (data && newItems.length > 0) {
        await sb.from('checklist_items').insert(
          newItems.map((item, i) => ({
            site_id: data.id,
            label: item.label,
            sort: i,
          }))
        );
      }
      await loadFromSupabase();
      return { success: true, siteId: data?.id || id };
    } catch (err: unknown) {
      console.error('Supabase addSite error:', err);
      // Fallback to local
    }
  }

  // Local fallback
  currentData.sites = [newSite, ...currentData.sites];
  currentData.items = [...currentData.items, ...newItems];
  writeLocal(STORAGE_KEYS.SITES, currentData.sites);
  writeLocal(STORAGE_KEYS.ITEMS, currentData.items);
  notify();
  return { success: true, siteId: id };
}

export async function updateSiteStatus(siteId: string, status: 'active' | 'completed') {
  const sb = getSupabaseClient();
  if (sb && currentData.isSupabaseMode) {
    try {
      await sb.from('sites').update({ status }).eq('id', siteId);
      await loadFromSupabase();
      return;
    } catch (err) {
      console.warn('Supabase update status failed, updating locally:', err);
    }
  }

  currentData.sites = currentData.sites.map((s) =>
    s.id === siteId ? { ...s, status } : s
  );
  writeLocal(STORAGE_KEYS.SITES, currentData.sites);
  notify();
}

export async function toggleChecklistItem(itemId: string, done: boolean) {
  const sb = getSupabaseClient();
  const done_at = done ? new Date().toISOString() : null;

  if (sb && currentData.isSupabaseMode) {
    try {
      await sb.from('checklist_items').update({ done, done_at }).eq('id', itemId);
      await loadFromSupabase();
      return;
    } catch (err) {
      console.warn('Supabase toggle failed, applying locally:', err);
    }
  }

  currentData.items = currentData.items.map((i) =>
    i.id === itemId ? { ...i, done, done_at } : i
  );
  writeLocal(STORAGE_KEYS.ITEMS, currentData.items);
  notify();
}

export async function addChecklistItem(siteId: string, label: string) {
  const cleanLabel = label.trim();
  if (!cleanLabel) return;
  const count = currentData.items.filter((i) => i.site_id === siteId).length;
  const newItem: ChecklistItem = {
    id: `chk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    site_id: siteId,
    label: cleanLabel,
    done: false,
    done_at: null,
    sort: count,
  };

  const sb = getSupabaseClient();
  if (sb && currentData.isSupabaseMode) {
    try {
      await sb.from('checklist_items').insert({
        site_id: siteId,
        label: cleanLabel,
        sort: count,
      });
      await loadFromSupabase();
      return;
    } catch (err) {
      console.warn('Supabase add checklist failed, applying locally:', err);
    }
  }

  currentData.items = [...currentData.items, newItem];
  writeLocal(STORAGE_KEYS.ITEMS, currentData.items);
  notify();
}

export async function addLog(params: {
  site_id: string;
  supervisor_id: string;
  type: 'checkin' | 'checkout' | 'update' | 'issue';
  note?: string | null;
  severity?: 'low' | 'high' | null;
  photoFile?: File | null;
  location?: { lat: number; lng: number; accuracy?: number } | null;
}) {
  let photo_url: string | null = null;
  const sb = getSupabaseClient();

  if (params.photoFile) {
    if (sb && currentData.isSupabaseMode) {
      try {
        const cleanName = params.photoFile.name.replace(/[^\w.]/g, '_');
        const path = `${params.site_id}/${Date.now()}-${cleanName}`;
        const up = await sb.storage.from('site-photos').upload(path, params.photoFile);
        if (!up.error) {
          photo_url = sb.storage.from('site-photos').getPublicUrl(path).data.publicUrl;
        }
      } catch (err) {
        console.warn('Supabase photo upload error:', err);
      }
    }

    // If Supabase upload didn't run or failed, convert to base64 for local viewing
    if (!photo_url) {
      photo_url = await fileToBase64(params.photoFile);
    }
  }

  const newLog: SiteLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    site_id: params.site_id,
    supervisor_id: params.supervisor_id,
    type: params.type,
    note: params.note || null,
    severity: params.severity || null,
    photo_url: photo_url || null,
    resolved: false,
    created_at: new Date().toISOString(),
    location: params.location || null,
  };

  if (sb && currentData.isSupabaseMode) {
    try {
      await sb.from('site_logs').insert({
        site_id: params.site_id,
        supervisor_id: params.supervisor_id,
        type: params.type,
        note: params.note || null,
        severity: params.severity || null,
        photo_url,
      });
      await loadFromSupabase();
      return;
    } catch (err) {
      console.warn('Supabase add log failed, saving locally:', err);
    }
  }

  currentData.logs = [newLog, ...currentData.logs];
  writeLocal(STORAGE_KEYS.LOGS, currentData.logs);
  notify();
}

export async function resolveIssue(logId: string, resolved: boolean) {
  const sb = getSupabaseClient();
  if (sb && currentData.isSupabaseMode) {
    try {
      await sb.from('site_logs').update({ resolved }).eq('id', logId);
      await loadFromSupabase();
      return;
    } catch (err) {
      console.warn('Supabase resolve issue failed, updating locally:', err);
    }
  }

  currentData.logs = currentData.logs.map((l) =>
    l.id === logId ? { ...l, resolved } : l
  );
  writeLocal(STORAGE_KEYS.LOGS, currentData.logs);
  notify();
}

export async function addSupervisor(
  name: string,
  role: UserRole = 'supervisor',
  email?: string,
  passcode: string = '1234'
) {
  const newProfile: Profile = {
    id: `p-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    full_name: name.trim(),
    role,
    email: email?.trim() || `${name.toLowerCase().replace(/\s+/g, '.')}@sovereigntouch.co.uk`,
    passcode: passcode.trim() || '1234',
    created_at: new Date().toISOString(),
  };

  currentData.profiles = [...currentData.profiles, newProfile];
  writeLocal(STORAGE_KEYS.PROFILES, currentData.profiles);
  notify();
  return newProfile;
}

export async function updateSite(siteId: string, updates: Partial<Site>) {
  const sb = getSupabaseClient();
  if (sb && currentData.isSupabaseMode) {
    try {
      await sb.from('sites').update(updates).eq('id', siteId);
      await loadFromSupabase();
      return;
    } catch (err) {
      console.warn('Supabase update site failed, updating locally:', err);
    }
  }

  currentData.sites = currentData.sites.map((s) =>
    s.id === siteId ? { ...s, ...updates } : s
  );
  writeLocal(STORAGE_KEYS.SITES, currentData.sites);
  notify();
}

export async function deleteSite(siteId: string) {
  const sb = getSupabaseClient();
  if (sb && currentData.isSupabaseMode) {
    try {
      await sb.from('sites').delete().eq('id', siteId);
      await loadFromSupabase();
      return;
    } catch (err) {
      console.warn('Supabase delete site failed, deleting locally:', err);
    }
  }

  currentData.sites = currentData.sites.filter((s) => s.id !== siteId);
  currentData.items = currentData.items.filter((i) => i.site_id !== siteId);
  currentData.logs = currentData.logs.filter((l) => l.site_id !== siteId);
  writeLocal(STORAGE_KEYS.SITES, currentData.sites);
  writeLocal(STORAGE_KEYS.ITEMS, currentData.items);
  writeLocal(STORAGE_KEYS.LOGS, currentData.logs);
  notify();
}

export async function updateChecklistItem(itemId: string, label: string) {
  const clean = label.trim();
  if (!clean) return;
  const sb = getSupabaseClient();
  if (sb && currentData.isSupabaseMode) {
    try {
      await sb.from('checklist_items').update({ label: clean }).eq('id', itemId);
      await loadFromSupabase();
      return;
    } catch (err) {
      console.warn('Supabase update checklist item failed, updating locally:', err);
    }
  }

  currentData.items = currentData.items.map((i) =>
    i.id === itemId ? { ...i, label: clean } : i
  );
  writeLocal(STORAGE_KEYS.ITEMS, currentData.items);
  notify();
}

export async function deleteChecklistItem(itemId: string) {
  const sb = getSupabaseClient();
  if (sb && currentData.isSupabaseMode) {
    try {
      await sb.from('checklist_items').delete().eq('id', itemId);
      await loadFromSupabase();
      return;
    } catch (err) {
      console.warn('Supabase delete checklist item failed, deleting locally:', err);
    }
  }

  currentData.items = currentData.items.filter((i) => i.id !== itemId);
  writeLocal(STORAGE_KEYS.ITEMS, currentData.items);
  notify();
}

export async function updateLog(logId: string, updates: { note?: string | null; severity?: 'low' | 'high' | null }) {
  const sb = getSupabaseClient();
  if (sb && currentData.isSupabaseMode) {
    try {
      await sb.from('site_logs').update(updates).eq('id', logId);
      await loadFromSupabase();
      return;
    } catch (err) {
      console.warn('Supabase update log failed, updating locally:', err);
    }
  }

  currentData.logs = currentData.logs.map((l) =>
    l.id === logId ? { ...l, ...updates } : l
  );
  writeLocal(STORAGE_KEYS.LOGS, currentData.logs);
  notify();
}

export async function deleteLog(logId: string) {
  const sb = getSupabaseClient();
  if (sb && currentData.isSupabaseMode) {
    try {
      await sb.from('site_logs').delete().eq('id', logId);
      await loadFromSupabase();
      return;
    } catch (err) {
      console.warn('Supabase delete log failed, deleting locally:', err);
    }
  }

  currentData.logs = currentData.logs.filter((l) => l.id !== logId);
  writeLocal(STORAGE_KEYS.LOGS, currentData.logs);
  notify();
}

export async function updateProfile(profileId: string, updates: Partial<Profile>) {
  const sb = getSupabaseClient();
  if (sb && currentData.isSupabaseMode) {
    try {
      await sb.from('profiles').update(updates).eq('id', profileId);
      await loadFromSupabase();
      return;
    } catch (err) {
      console.warn('Supabase update profile failed, updating locally:', err);
    }
  }

  currentData.profiles = currentData.profiles.map((p) =>
    p.id === profileId ? { ...p, ...updates } : p
  );
  if (currentData.currentUser.id === profileId) {
    currentData.currentUser = { ...currentData.currentUser, ...updates };
  }
  writeLocal(STORAGE_KEYS.PROFILES, currentData.profiles);
  notify();
}

export async function deleteProfile(profileId: string) {
  currentData.profiles = currentData.profiles.filter((p) => p.id !== profileId);
  writeLocal(STORAGE_KEYS.PROFILES, currentData.profiles);
  notify();
}

export function resetDemoData() {
  localStorage.removeItem(STORAGE_KEYS.SITES);
  localStorage.removeItem(STORAGE_KEYS.ITEMS);
  localStorage.removeItem(STORAGE_KEYS.LOGS);
  localStorage.removeItem(STORAGE_KEYS.PROFILES);
  localStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID);
  initStore();
}

// Helpers
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}
