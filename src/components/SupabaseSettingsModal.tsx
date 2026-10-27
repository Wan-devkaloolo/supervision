import React, { useState, useEffect } from 'react';
import { X, Database, Check, Copy, ExternalLink, RefreshCw, AlertCircle, ShieldCheck } from 'lucide-react';
import { getSavedSupabaseConfig, saveSupabaseConfig, clearSupabaseConfig, resetDemoData, loadFromSupabase } from '../lib/store';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  isLive: boolean;
  isSupabaseMode: boolean;
  errorMessage: string | null;
}

const SQL_SCHEMA = `-- STHC Site Ops: run this once in Supabase -> SQL Editor

create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  role text not null default 'supervisor' check (role in ('ceo','supervisor')),
  created_at timestamptz default now()
);

create table if not exists sites (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  client text,
  address text,
  service text,
  quoted_days int default 1,
  start_date date default current_date,
  status text not null default 'active' check (status in ('active','completed')),
  supervisor_id uuid references profiles(id),
  created_at timestamptz default now()
);

create table if not exists checklist_items (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  label text not null,
  done boolean not null default false,
  done_at timestamptz,
  sort int default 0
);

create table if not exists site_logs (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  supervisor_id uuid references profiles(id),
  type text not null check (type in ('checkin','checkout','update','issue')),
  note text,
  severity text check (severity in ('low','high')),
  photo_url text,
  resolved boolean not null default false,
  created_at timestamptz default now()
);

-- auto-create a profile whenever a user is added
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)))
  on conflict do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

create or replace function is_ceo() returns boolean
language sql security definer stable set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'ceo');
$$;

alter table profiles enable row level security;
alter table sites enable row level security;
alter table checklist_items enable row level security;
alter table site_logs enable row level security;

create policy "profiles read" on profiles for select to authenticated using (true);
create policy "profiles ceo write" on profiles for all to authenticated using (is_ceo()) with check (is_ceo());

create policy "sites ceo all" on sites for all to authenticated using (is_ceo()) with check (is_ceo());
create policy "sites supervisor read" on sites for select to authenticated using (supervisor_id = auth.uid());

create policy "items ceo all" on checklist_items for all to authenticated using (is_ceo()) with check (is_ceo());
create policy "items supervisor read" on checklist_items for select to authenticated
  using (exists (select 1 from sites s where s.id = site_id and s.supervisor_id = auth.uid()));
create policy "items supervisor update" on checklist_items for update to authenticated
  using (exists (select 1 from sites s where s.id = site_id and s.supervisor_id = auth.uid()));

create policy "logs ceo all" on site_logs for all to authenticated using (is_ceo()) with check (is_ceo());
create policy "logs supervisor read" on site_logs for select to authenticated
  using (exists (select 1 from sites s where s.id = site_id and s.supervisor_id = auth.uid()));
create policy "logs supervisor insert" on site_logs for insert to authenticated
  with check (supervisor_id = auth.uid() and exists (select 1 from sites s where s.id = site_id and s.supervisor_id = auth.uid()));

-- real-time sync
alter publication supabase_realtime add table sites, checklist_items, site_logs;

-- photo storage
insert into storage.buckets (id, name, public) values ('site-photos','site-photos', true) on conflict do nothing;
create policy "photos upload" on storage.objects for insert to authenticated with check (bucket_id = 'site-photos');
create policy "photos read" on storage.objects for select using (bucket_id = 'site-photos');
`;

export const SupabaseSettingsModal: React.FC<Props> = ({
  isOpen,
  onClose,
  isLive,
  isSupabaseMode,
  errorMessage,
}) => {
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [copiedSql, setCopiedSql] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'connect' | 'schema' | 'guide'>('connect');

  useEffect(() => {
    if (isOpen) {
      const cfg = getSavedSupabaseConfig();
      setUrl(cfg.url || '');
      setAnonKey(cfg.anonKey || '');
      setSaveSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim() && anonKey.trim()) {
      saveSupabaseConfig(url, anonKey, true);
      setSaveSuccess(true);
      await loadFromSupabase();
      setTimeout(() => {
        onClose();
      }, 1200);
    }
  };

  const handleUseDemo = () => {
    clearSupabaseConfig();
    window.location.reload();
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SQL_SCHEMA);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const handleResetData = () => {
    if (window.confirm('Reset all demo sites, checklists, and logs back to default Sovereign Touch sample data?')) {
      resetDemoData();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl text-[#14213a] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#0B1F3A] text-white">
          <div className="flex items-center gap-2.5">
            <Database className="w-5 h-5 text-[#C9A24B]" />
            <div>
              <h2 className="font-bold text-base tracking-wide">Database & Cloud Sync</h2>
              <p className="text-xs text-[#b9c3d9]">Supabase live connection & local mode</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Pill Bar */}
        <div className="px-6 py-3 bg-[#f8f9fc] border-b border-gray-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-gray-500 font-medium">Mode:</span>
            {isSupabaseMode ? (
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-semibold ${
                isLive ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                {isLive ? 'Supabase Live Realtime' : 'Supabase (Connecting / Error)'}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-100 text-[#0B1F3A] font-semibold">
                <span className="w-2 h-2 rounded-full bg-blue-600" />
                Active Local Mode (Zero-Config)
              </span>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('connect')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                activeTab === 'connect' ? 'bg-[#0B1F3A] text-white' : 'text-gray-600 hover:bg-gray-200'
              }`}
            >
              Credentials
            </button>
            <button
              onClick={() => setActiveTab('schema')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                activeTab === 'schema' ? 'bg-[#0B1F3A] text-white' : 'text-gray-600 hover:bg-gray-200'
              }`}
            >
              SQL Schema
            </button>
            <button
              onClick={() => setActiveTab('guide')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                activeTab === 'guide' ? 'bg-[#0B1F3A] text-white' : 'text-gray-600 hover:bg-gray-200'
              }`}
            >
              Setup Guide
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {errorMessage && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Connection Notice:</p>
                <p className="font-mono mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          {activeTab === 'connect' && (
            <form onSubmit={handleSave} className="space-y-4">
              <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-100 text-xs text-[#0B1F3A] space-y-1">
                <p className="font-bold">Connect your own Supabase project:</p>
                <p className="text-gray-600">
                  Find these in your Supabase project under <strong>Project Settings → API</strong>. Both the URL and anon public key are client-safe.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Project URL
                </label>
                <input
                  type="url"
                  placeholder="https://xyzcompany.supabase.co"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#C9A24B] text-sm font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Anon / Public Key
                </label>
                <textarea
                  rows={3}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={anonKey}
                  onChange={(e) => setAnonKey(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#C9A24B] text-sm font-mono"
                  required
                />
              </div>

              {saveSuccess && (
                <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-semibold">
                  <Check className="w-4 h-4 text-emerald-600" />
                  Credentials saved! Initializing live connection...
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={handleUseDemo}
                  className="text-xs font-medium text-gray-600 hover:text-red-700 underline"
                >
                  Clear & switch back to local mode
                </button>

                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#0B1F3A] hover:bg-[#13305a] text-white font-semibold text-sm shadow-md transition-all active:scale-95"
                >
                  Save & Connect Live
                </button>
              </div>

              <div className="border-t border-gray-200 pt-4 mt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-gray-800">Demo Data Management</h4>
                    <p className="text-[11px] text-gray-500">Reset Sovereign Touch sample sites, checklists, and logs</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetData}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Reset Data
                  </button>
                </div>
              </div>
            </form>
          )}

          {activeTab === 'schema' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Database Schema (schema.sql)</h3>
                  <p className="text-xs text-gray-500">Run this once in Supabase → SQL Editor</p>
                </div>
                <button
                  onClick={handleCopySql}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#C9A24B] text-[#0B1F3A] font-semibold text-xs hover:bg-[#dfbd60] transition-colors shadow-xs"
                >
                  {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedSql ? 'Copied to Clipboard!' : 'Copy SQL'}
                </button>
              </div>

              <pre className="max-h-[350px] overflow-x-auto p-4 rounded-xl bg-gray-900 text-gray-200 font-mono text-xs leading-relaxed selection:bg-[#C9A24B] selection:text-[#0B1F3A]">
                {SQL_SCHEMA}
              </pre>
            </div>
          )}

          {activeTab === 'guide' && (
            <div className="space-y-4 text-xs text-gray-700 leading-relaxed">
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                <h4 className="font-bold text-gray-900 text-sm mb-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#C9A24B]" />
                  Setup in 3 Steps
                </h4>
                <ol className="list-decimal list-inside space-y-2 text-gray-600 mt-2">
                  <li><strong>Create Supabase Project:</strong> Sign in at supabase.com and create a project.</li>
                  <li><strong>Run SQL:</strong> Open SQL Editor, paste the schema from the <em>SQL Schema</em> tab, and click Run.</li>
                  <li><strong>Enter Keys:</strong> Copy Project URL and Anon Public Key from <em>Project Settings → API</em> into the Credentials tab.</li>
                </ol>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900">
                <p className="font-bold">CEO Account Setup:</p>
                <p className="mt-1">
                  After creating user accounts in Supabase Auth, promote yourself to CEO by running:
                </p>
                <code className="block mt-1 p-2 bg-amber-100 rounded text-[11px] font-mono break-all">
                  update profiles set role = 'ceo' where id = (select id from auth.users where email = 'YOUR_EMAIL');
                </code>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
