export type UserRole = 'ceo' | 'supervisor';

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  email?: string;
  phone?: string;
  avatar?: string;
  created_at?: string;
  passcode?: string;
}

export type SiteStatus = 'active' | 'completed';

export interface Site {
  id: string;
  name: string;
  client: string;
  address: string;
  service: string;
  quoted_days: number;
  start_date: string;
  status: SiteStatus;
  supervisor_id: string;
  created_at: string;
  notes?: string;
}

export interface ChecklistItem {
  id: string;
  site_id: string;
  label: string;
  done: boolean;
  done_at: string | null;
  sort: number;
}

export type LogType = 'checkin' | 'checkout' | 'update' | 'issue';
export type IssueSeverity = 'low' | 'high';

export interface SiteLog {
  id: string;
  site_id: string;
  supervisor_id: string;
  type: LogType;
  note: string | null;
  severity: IssueSeverity | null;
  photo_url: string | null;
  resolved: boolean;
  created_at: string;
  location?: {
    lat: number;
    lng: number;
    accuracy?: number;
  } | null;
}

export interface DayInfo {
  day: number;
  late: boolean;
  overdueDays: number;
  remainingDays: number;
  formattedRange: string;
}
