import React, { useState, useEffect } from 'react';
import { Task, Priority } from '../types';
import { Calendar, Clock, Tag, AlertCircle, Sparkles } from 'lucide-react';

interface TaskFormProps {
  task?: Task;
  onSubmit: (taskData: Omit<Task, 'id' | 'createdAt' | 'completed' | 'calendarSyncedAt' | 'calendarEventId'> & { syncToCalendar: boolean }) => void;
  onCancel: () => void;
  isSyncing: boolean;
  hasGoogleAccess: boolean;
}

const CATEGORIES = ['Work', 'Personal', 'Fitness', 'Learning', 'Health', 'Errands', 'Finance'];

export default function TaskForm({
  task,
  onSubmit,
  onCancel,
  isSyncing,
  hasGoogleAccess,
}: TaskFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Work');
  const [priority, setPriority] = useState<Priority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [syncToCalendar, setSyncToCalendar] = useState(true);
  const [reminderMinutesBefore, setReminderMinutesBefore] = useState(15);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description);
      setCategory(task.category);
      setPriority(task.priority);
      setDueDate(task.dueDate);
      setDueTime(task.dueTime || '');
      setDurationMinutes(task.durationMinutes);
      setSyncToCalendar(!!task.calendarEventId);
      setReminderMinutesBefore(task.reminderMinutesBefore || 15);
    } else {
      // Set default due date to today
      const today = new Date().toISOString().split('T')[0];
      setDueDate(today);
      // Set default time to next hour
      const now = new Date();
      now.setHours(now.getHours() + 1, 0, 0, 0);
      const hoursStr = String(now.getHours()).padStart(2, '0');
      const minsStr = String(now.getMinutes()).padStart(2, '0');
      setDueTime(`${hoursStr}:${minsStr}`);
    }
  }, [task]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSubmit({
      title,
      description,
      category,
      priority,
      dueDate,
      dueTime: dueTime || undefined,
      durationMinutes,
      syncToCalendar: hasGoogleAccess && syncToCalendar,
      reminderMinutesBefore,
    });
  };

  return (
    <form id="task-form" onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-1">
        <label htmlFor="task-title" className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400">Task Title</label>
        <input
          id="task-title"
          type="text"
          required
          placeholder="e.g., Prepare Project Presentation"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-4 py-2.5 rounded-lg border border-white/10 focus:border-amber-100/50 transition-all outline-none bg-zinc-900/50 text-white placeholder-zinc-500 text-sm"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="task-desc" className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400">Description</label>
        <textarea
          id="task-desc"
          rows={3}
          placeholder="Describe the task and any important details..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-4 py-2.5 rounded-lg border border-white/10 focus:border-amber-100/50 transition-all outline-none bg-zinc-900/50 text-white placeholder-zinc-500 text-sm resize-none"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Category selection */}
        <div className="space-y-1">
          <label htmlFor="task-category" className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400 flex items-center gap-1.5">
            <Tag size={12} className="text-zinc-500" />
            Category
          </label>
          <select
            id="task-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border border-white/10 focus:border-amber-100/50 transition-all outline-none bg-[#0f1115] text-zinc-300 text-sm cursor-pointer"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Priority selection */}
        <div className="space-y-1">
          <label htmlFor="task-priority" className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400 flex items-center gap-1.5">
            <AlertCircle size={12} className="text-zinc-500" />
            Priority
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['low', 'medium', 'high'] as Priority[]).map((p) => {
              const isActive = priority === p;
              const styles = {
                low: isActive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'hover:bg-zinc-900/30 text-zinc-500 border-white/5 bg-[#0f1115]/20',
                medium: isActive ? 'bg-amber-100/10 text-amber-200 border-amber-100/20' : 'hover:bg-zinc-900/30 text-zinc-500 border-white/5 bg-[#0f1115]/20',
                high: isActive ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : 'hover:bg-zinc-900/30 text-zinc-500 border-white/5 bg-[#0f1115]/20',
              };

              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`py-2 text-[11px] font-semibold tracking-wider rounded-lg border transition-all text-center capitalize cursor-pointer ${styles[p]}`}
                >
                  {p}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Due Date */}
        <div className="space-y-1">
          <label htmlFor="task-date" className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400 flex items-center gap-1.5">
            <Calendar size={12} className="text-zinc-500" />
            Due Date
          </label>
          <input
            id="task-date"
            type="date"
            required
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border border-white/10 focus:border-amber-100/50 transition-all outline-none bg-zinc-900/50 text-white text-sm"
          />
        </div>

        {/* Due Time */}
        <div className="space-y-1">
          <label htmlFor="task-time" className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400 flex items-center gap-1.5">
            <Clock size={12} className="text-zinc-500" />
            Due Time
          </label>
          <input
            id="task-time"
            type="time"
            value={dueTime}
            onChange={(e) => setDueTime(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg border border-white/10 focus:border-amber-100/50 transition-all outline-none bg-zinc-900/50 text-white text-sm"
          />
        </div>

        {/* Duration */}
        <div className="space-y-1">
          <label htmlFor="task-duration" className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400 flex items-center gap-1.5">
            <Clock size={12} className="text-zinc-500" />
            Duration (mins)
          </label>
          <input
            id="task-duration"
            type="number"
            min={15}
            max={480}
            step={15}
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 30)}
            className="w-full px-4 py-2.5 rounded-lg border border-white/10 focus:border-amber-100/50 transition-all outline-none bg-zinc-900/50 text-white text-sm"
          />
        </div>
      </div>

      {/* Google Calendar Sync Details */}
      {hasGoogleAccess ? (
        <div className="p-4 rounded-lg border border-white/5 bg-[#0f1115] space-y-3.5">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={syncToCalendar}
                onChange={(e) => setSyncToCalendar(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-amber-100 border-zinc-700 bg-zinc-900/40 focus:ring-amber-100/20 cursor-pointer"
              />
              <span className="text-xs font-semibold text-zinc-200 flex items-center gap-1">
                Sync to Google Calendar
                <Sparkles size={12} className="text-amber-200 animate-pulse" />
              </span>
            </label>
          </div>

          {syncToCalendar && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-white/5">
              <div className="space-y-1">
                <label htmlFor="task-reminders" className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400 block">
                  Automated Reminder Notification
                </label>
                <select
                  id="task-reminders"
                  value={reminderMinutesBefore}
                  onChange={(e) => setReminderMinutesBefore(parseInt(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-white/10 focus:border-amber-100/50 transition-all outline-none bg-zinc-900 text-xs text-zinc-300 font-medium cursor-pointer"
                >
                  <option value={5}>5 minutes before</option>
                  <option value={15}>15 minutes before</option>
                  <option value={30}>30 minutes before</option>
                  <option value={60}>1 hour before</option>
                  <option value={120}>2 hours before</option>
                  <option value={1440}>1 day before</option>
                </select>
                <p className="text-[10px] text-zinc-500 leading-tight">
                  Schedules automatic notifications to your Google Calendar linked device.
                </p>
              </div>

              <div className="flex flex-col justify-center text-xs text-zinc-400 bg-zinc-900/30 p-2.5 rounded-lg border border-white/5">
                <span className="font-semibold block mb-0.5 text-white">📅 Calendar Event Slot</span>
                <span className="text-zinc-400 leading-normal text-[11px]">
                  {dueDate || 'Today'} at {dueTime || '09:00'}
                  <span className="block text-[10px] text-amber-200/80">
                    Duration: {durationMinutes} mins (Ends at {(() => {
                      if (!dueTime) return '09:30';
                      const [h, m] = dueTime.split(':').map(Number);
                      const d = new Date();
                      d.setHours(h, m + durationMinutes);
                      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                    })()})
                  </span>
                </span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-3.5 rounded-lg border border-amber-500/10 bg-amber-500/5 text-xs text-amber-200/80 leading-normal flex items-start gap-2">
          <AlertCircle size={15} className="text-amber-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-white">Google Calendar Integration Disabled</span>
            <p className="mt-0.5 text-zinc-400 text-[11px]">
              Sign in with your Google account to enable events booking, smart duration reminders, and notification controls.
            </p>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSyncing}
          className="px-4 py-2 rounded-lg text-zinc-400 hover:bg-white/5 border border-white/10 text-xs uppercase tracking-widest font-bold transition-all cursor-pointer disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSyncing}
          className="px-5 py-2 rounded-lg bg-amber-100 hover:bg-amber-200 text-zinc-950 font-bold text-xs uppercase tracking-widest shadow-lg active:scale-98 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
        >
          {isSyncing ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              Syncing...
            </>
          ) : task ? (
            'Update Task'
          ) : (
            'Create Task'
          )}
        </button>
      </div>
    </form>
  );
}
