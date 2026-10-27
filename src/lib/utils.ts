import { Site, SiteLog, DayInfo, ChecklistItem } from '../types';

export function esc(str: unknown): string {
  return String(str ?? '');
}

export function fmtTime(dateStr: string | number | Date): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

export function fmtDateOnly(dateStr: string | number | Date): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

export function timeAgo(dateStr: string | number | Date): string {
  try {
    const ms = Date.now() - new Date(dateStr).getTime();
    const m = Math.round(ms / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.round(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.round(m / 1440);
    return `${d}d ago`;
  } catch {
    return 'recently';
  }
}

export function getDayInfo(site: Site): DayInfo {
  try {
    const todayZero = new Date(new Date().toDateString()).getTime();
    const startZero = new Date(new Date(site.start_date).toDateString()).getTime();
    const diffDays = Math.floor((todayZero - startZero) / 86400000);
    const day = Math.max(diffDays + 1, 1);
    const quoted = site.quoted_days || 1;
    const isLate = site.status === 'active' && day > quoted;
    const overdueDays = isLate ? day - quoted : 0;
    const remainingDays = Math.max(0, quoted - day);

    return {
      day,
      late: isLate,
      overdueDays,
      remainingDays,
      formattedRange: `Day ${day} of ${quoted}${isLate ? ` · OVER (+${overdueDays}d)` : ''}`,
    };
  } catch {
    return {
      day: 1,
      late: false,
      overdueDays: 0,
      remainingDays: 0,
      formattedRange: `Day 1 of ${site.quoted_days || 1}`,
    };
  }
}

export function getSitePresence(siteId: string, logs: SiteLog[]): SiteLog | null {
  // Find the latest log of type checkin or checkout for this site
  const siteCheckLogs = logs
    .filter((l) => l.site_id === siteId && (l.type === 'checkin' || l.type === 'checkout'))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  if (siteCheckLogs.length > 0 && siteCheckLogs[0].type === 'checkin') {
    return siteCheckLogs[0];
  }
  return null;
}

export function getOpenIssues(siteId: string, logs: SiteLog[]): SiteLog[] {
  return logs.filter((l) => l.site_id === siteId && l.type === 'issue' && !l.resolved);
}

export function getSiteProgress(items: ChecklistItem[]): {
  total: number;
  done: number;
  pct: number;
} {
  const total = items.length;
  if (total === 0) return { total: 0, done: 0, pct: 0 };
  const done = items.filter((i) => i.done).length;
  const pct = Math.round((done / total) * 100);
  return { total, done, pct };
}
