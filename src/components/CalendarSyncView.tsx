import React, { useState } from 'react';
import { CalendarEvent, Task } from '../types';
import { Calendar, Clock, RefreshCw, Sparkles, MapPin, ExternalLink, HelpCircle, AlertCircle } from 'lucide-react';

interface CalendarSyncViewProps {
  events: CalendarEvent[];
  tasks: Task[];
  onRefresh: () => void;
  isLoading: boolean;
  onQuickSchedule: (timeSlot: { date: string; time: string }) => void;
}

export default function CalendarSyncView({
  events,
  tasks,
  onRefresh,
  isLoading,
  onQuickSchedule,
}: CalendarSyncViewProps) {
  const [showRecommendations, setShowRecommendations] = useState(true);

  // Helper to format dates beautifully
  const formatDateTime = (dateTimeStr?: string, dateStr?: string) => {
    if (dateTimeStr) {
      const d = new Date(dateTimeStr);
      return d.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    if (dateStr) {
      const d = new Date(dateStr + 'T00:00:00');
      return d.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC', // Since date only is UTC-neutral
      }) + ' (All Day)';
    }
    return 'Unknown time';
  };

  // Extract task titles already scheduled on Google Calendar
  const scheduledEventIds = new Set(tasks.map((t) => t.calendarEventId).filter(Boolean));

  // Analyze busy slots and recommend free spaces for tomorrow
  const getFreeSlotRecommendations = () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // Standard business/focus hours (e.g., 09:00, 11:30, 14:00, 16:30)
    const candidates = [
      { label: 'Morning Session', time: '09:00' },
      { label: 'Mid-Day Slot', time: '11:30' },
      { label: 'Afternoon Focus', time: '14:00' },
      { label: 'Late Focus Block', time: '16:30' },
    ];

    // Check which candidates overlap with existing Google Calendar events on tomorrow
    return candidates.map((slot) => {
      const slotDateTimeStr = `${tomorrowStr}T${slot.time}:00`;
      const slotStart = new Date(slotDateTimeStr);
      const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000); // Assume 1hr

      let isBusy = false;

      for (const event of events) {
        if (event.start?.dateTime && event.end?.dateTime) {
          const evStart = new Date(event.start.dateTime);
          const evEnd = new Date(event.end.dateTime);

          // Overlap check
          if (slotStart < evEnd && slotEnd > evStart) {
            isBusy = true;
            break;
          }
        }
      }

      return {
        ...slot,
        date: tomorrowStr,
        isBusy,
      };
    });
  };

  const recommendations = getFreeSlotRecommendations();

  return (
    <div className="space-y-6">
      {/* Smart scheduling recommendation banner */}
      {showRecommendations && (
        <div className="p-4 rounded-xl bg-gradient-to-br from-[#12141c] to-[#1c1510] border border-white/5 shadow-sm space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-amber-100 text-zinc-950 flex items-center justify-center shrink-0">
                <Sparkles size={14} />
              </div>
              <div>
                <h4 className="text-sm font-serif text-white">Smart Scheduling Assistant</h4>
                <p className="text-[10px] uppercase tracking-wider text-zinc-400">Focus-hour suggestions</p>
              </div>
            </div>
            <button
              onClick={() => setShowRecommendations(false)}
              className="text-zinc-500 hover:text-zinc-300 text-xs font-semibold px-2 py-1 rounded hover:bg-white/5 cursor-pointer"
            >
              Hide
            </button>
          </div>

          <p className="text-xs text-zinc-300 leading-relaxed">
            Based on your calendar traffic tomorrow, we found these optimal smart blocks to schedule your high-priority items:
          </p>

          <div className="grid grid-cols-2 gap-2.5 pt-1">
            {recommendations.map((rec) => (
              <button
                key={rec.time}
                disabled={rec.isBusy}
                onClick={() => onQuickSchedule({ date: rec.date, time: rec.time })}
                className={`p-2.5 rounded-lg border text-left transition-all ${
                  rec.isBusy
                    ? 'bg-zinc-950 border-white/5 opacity-40 cursor-not-allowed'
                    : 'bg-[#0f1115] border-white/10 hover:border-amber-100/50 cursor-pointer hover:bg-zinc-900/40'
                }`}
              >
                <span className="text-[9px] font-bold tracking-wider text-zinc-500 uppercase block">
                  {rec.label}
                </span>
                <span className="text-xs font-semibold text-zinc-200 block mt-0.5">
                  Tomorrow @ {rec.time}
                </span>
                <span
                  className={`inline-block text-[9px] uppercase tracking-wide font-bold px-1.5 py-0.5 rounded mt-1.5 ${
                    rec.isBusy ? 'bg-zinc-900 text-zinc-500' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  }`}
                >
                  {rec.isBusy ? 'Busy Slot' : 'Free & Ready'}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Calendar list header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-zinc-400" />
          <h3 className="text-sm font-serif text-white">Google Calendar Events</h3>
        </div>

        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="p-1.5 rounded-lg border border-white/10 hover:border-amber-100/50 bg-[#0f1115] text-zinc-400 hover:text-white transition-all cursor-pointer disabled:opacity-50"
          title="Refresh Calendar"
        >
          <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Upcoming events stack */}
      <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
        {events.length === 0 ? (
          <div className="text-center py-10 px-4 rounded-xl border border-white/5 bg-[#0f1115]/30">
            <Calendar size={18} className="text-zinc-600 mx-auto mb-2" />
            <p className="text-xs font-semibold text-zinc-400">No upcoming events found</p>
            <p className="text-[10px] text-zinc-600 mt-0.5">
              Your Google calendar looks completely clear for now!
            </p>
          </div>
        ) : (
          events.map((event) => {
            const isTaskSynced = scheduledEventIds.has(event.id);

            return (
              <div
                key={event.id}
                className={`p-3.5 rounded-xl border bg-zinc-900/20 flex flex-col gap-2 transition-all hover:border-white/10 ${
                  isTaskSynced ? 'border-l-4 border-l-amber-100/80 border-white/5' : 'border-white/5'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-semibold text-zinc-200 break-words flex-1 leading-snug">
                    {event.summary || '(No Title)'}
                  </span>

                  {isTaskSynced && (
                    <span className="text-[9px] uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-amber-100/10 text-amber-200 border border-amber-100/20 shrink-0">
                      Synced Task
                    </span>
                  )}
                </div>

                {event.description && (
                  <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                    {event.description}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[10px] text-zinc-500 font-medium">
                  <span className="flex items-center gap-1">
                    <Clock size={10} />
                    {formatDateTime(event.start?.dateTime, event.start?.date)}
                  </span>

                  {event.description && event.description.includes('meet.google.com') && (
                    <span className="flex items-center gap-1 text-emerald-400">
                      <ExternalLink size={10} />
                      Google Meet Joinable
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="p-3 rounded-lg border border-white/5 bg-[#0f1115]/40 text-[10px] text-zinc-500 leading-normal flex items-start gap-1.5">
        <AlertCircle size={12} className="text-zinc-600 shrink-0 mt-0.5" />
        <p>
          All events synced from your primary Google Calendar are stored safely. This client-only organizer operates with zero server persistent memory.
        </p>
      </div>
    </div>
  );
}
