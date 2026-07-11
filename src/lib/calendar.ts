import { Task, CalendarEvent } from '../types';

// Fetch user's upcoming primary calendar events
export const listUpcomingEvents = async (
  token: string,
  maxResults = 20
): Promise<CalendarEvent[]> => {
  try {
    const now = new Date().toISOString();
    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(
      now
    )}&maxResults=${maxResults}&orderBy=startTime&singleEvents=true`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error?.message || 'Failed to fetch calendar events');
    }

    const data = await res.json();
    return (data.items || []) as CalendarEvent[];
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    throw error;
  }
};

// Create a calendar event for a task
export const createCalendarEvent = async (
  token: string,
  task: Task
): Promise<string> => {
  try {
    const url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

    // Calculate start and end dateTimes
    const startDateTimeStr = `${task.dueDate}T${task.dueTime || '09:00'}:00`;
    const startDate = new Date(startDateTimeStr);
    
    // Fallback if Date is invalid
    const startIso = isNaN(startDate.getTime()) 
      ? new Date().toISOString() 
      : startDate.toISOString();
      
    const endDate = new Date(startDate.getTime() + task.durationMinutes * 60 * 1000);
    const endIso = isNaN(endDate.getTime())
      ? new Date(Date.now() + 30 * 60 * 1000).toISOString()
      : endDate.toISOString();

    const eventBody = {
      summary: `[Task] ${task.title}`,
      description: `${task.description}\n\nCategory: ${task.category}\nPriority: ${task.priority.toUpperCase()}`,
      start: {
        dateTime: startIso,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      },
      end: {
        dateTime: endIso,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: task.reminderMinutesBefore },
          { method: 'email', minutes: task.reminderMinutesBefore },
        ],
      },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventBody),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error?.message || 'Failed to create calendar event');
    }

    const data = await res.json();
    return data.id;
  } catch (error) {
    console.error('Error creating calendar event:', error);
    throw error;
  }
};

// Update an existing calendar event for a task
export const updateCalendarEvent = async (
  token: string,
  eventId: string,
  task: Task
): Promise<void> => {
  try {
    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`;

    // Calculate start and end dateTimes
    const startDateTimeStr = `${task.dueDate}T${task.dueTime || '09:00'}:00`;
    const startDate = new Date(startDateTimeStr);
    
    const startIso = isNaN(startDate.getTime()) 
      ? new Date().toISOString() 
      : startDate.toISOString();
      
    const endDate = new Date(startDate.getTime() + task.durationMinutes * 60 * 1000);
    const endIso = isNaN(endDate.getTime())
      ? new Date(Date.now() + 30 * 60 * 1000).toISOString()
      : endDate.toISOString();

    const eventBody = {
      summary: `[Task] ${task.title}`,
      description: `${task.description}\n\nCategory: ${task.category}\nPriority: ${task.priority.toUpperCase()}${task.completed ? '\n\n✅ STATUS: COMPLETED' : ''}`,
      start: {
        dateTime: startIso,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      },
      end: {
        dateTime: endIso,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: task.reminderMinutesBefore },
          { method: 'email', minutes: task.reminderMinutesBefore },
        ],
      },
    };

    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventBody),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error?.message || 'Failed to update calendar event');
    }
  } catch (error) {
    console.error('Error updating calendar event:', error);
    throw error;
  }
};

// Delete a calendar event
export const deleteCalendarEvent = async (
  token: string,
  eventId: string
): Promise<void> => {
  try {
    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`;

    const res = await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    // If already deleted (410 Gone or 404), we can treat it as success
    if (!res.ok && res.status !== 404 && res.status !== 410) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error?.message || 'Failed to delete calendar event');
    }
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    throw error;
  }
};
