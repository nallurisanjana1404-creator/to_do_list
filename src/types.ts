export type Priority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: Priority;
  dueDate: string; // YYYY-MM-DD
  dueTime?: string; // HH:MM
  durationMinutes: number; // For scheduling in Google Calendar
  completed: boolean;
  calendarEventId?: string; // ID of the event in Google Calendar
  calendarSyncedAt?: string; // ISO string
  reminderMinutesBefore: number; // Minutes before due time for Google Calendar reminders
  createdAt: string;
}

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
}

export interface AuthState {
  user: any | null; // Firebase User type
  token: string | null;
  needsAuth: boolean;
  loading: boolean;
}
