import { useState, useEffect } from 'react';
import { Task, CalendarEvent, AuthState, Priority } from './types';
import { googleSignIn, initAuth, logout } from './lib/firebase';
import {
  listUpcomingEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from './lib/calendar';
import TaskForm from './components/TaskForm';
import TaskList from './components/TaskList';
import CalendarSyncView from './components/CalendarSyncView';
import {
  Plus,
  Calendar,
  CheckCircle,
  Trophy,
  AlertCircle,
  Clock,
  Sparkles,
  LogOut,
  CalendarDays,
  Menu,
} from 'lucide-react';
import { User } from 'firebase/auth';

export default function App() {
  // Local Tasks State
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('calendar_todo_tasks');
    return saved ? JSON.parse(saved) : [];
  });

  // Calendar Sync State
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [isCalendarLoading, setIsCalendarLoading] = useState(false);
  const [isSyncingTask, setIsSyncingTask] = useState(false);

  // Authentication State
  const [auth, setAuth] = useState<AuthState>({
    user: null,
    token: null,
    needsAuth: true,
    loading: true,
  });

  // UI Dialog/Drawer State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | undefined>(undefined);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Sync tasks to localStorage on change
  useEffect(() => {
    localStorage.setItem('calendar_todo_tasks', JSON.stringify(tasks));
  }, [tasks]);

  // Handle Auth initialization
  useEffect(() => {
    const unsubscribe = initAuth(
      (user: User, token: string) => {
        setAuth({
          user,
          token,
          needsAuth: false,
          loading: false,
        });
        fetchCalendarEvents(token);
      },
      () => {
        setAuth({
          user: null,
          token: null,
          needsAuth: true,
          loading: false,
        });
      }
    );

    return () => unsubscribe();
  }, []);

  // Fetch upcoming Google Calendar events
  const fetchCalendarEvents = async (token: string) => {
    setIsCalendarLoading(true);
    try {
      const events = await listUpcomingEvents(token, 15);
      setCalendarEvents(events);
    } catch (err: any) {
      console.error(err);
      showNotification('error', 'Failed to retrieve your Google Calendar schedule.');
    } finally {
      setIsCalendarLoading(false);
    }
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  // Login handler
  const handleLogin = async () => {
    try {
      const res = await googleSignIn();
      if (res) {
        setAuth({
          user: res.user,
          token: res.accessToken,
          needsAuth: false,
          loading: false,
        });
        showNotification('success', 'Successfully signed in with Google Calendar!');
        fetchCalendarEvents(res.accessToken);
      }
    } catch (err: any) {
      console.error(err);
      showNotification('error', 'Google Calendar sign-in was aborted.');
    }
  };

  // Sign out handler
  const handleLogout = async () => {
    const confirmed = window.confirm('Are you sure you want to sign out from Google Calendar?');
    if (!confirmed) return;

    try {
      await logout();
      setAuth({
        user: null,
        token: null,
        needsAuth: true,
        loading: false,
      });
      setCalendarEvents([]);
      showNotification('success', 'Successfully signed out.');
    } catch (err) {
      console.error(err);
      showNotification('error', 'Failed to sign out.');
    }
  };

  // Create or Update task handler
  const handleSaveTask = async (taskData: Omit<Task, 'id' | 'createdAt' | 'completed' | 'calendarSyncedAt' | 'calendarEventId'> & { syncToCalendar: boolean }) => {
    setIsSyncingTask(true);
    try {
      const token = auth.token;
      let newCalendarEventId: string | undefined = taskToEdit?.calendarEventId;

      if (taskData.syncToCalendar && token) {
        if (taskToEdit?.calendarEventId) {
          // Update existing Google Calendar Event
          await updateCalendarEvent(token, taskToEdit.calendarEventId, {
            ...taskToEdit,
            ...taskData,
          });
          newCalendarEventId = taskToEdit.calendarEventId;
        } else {
          // Create new Google Calendar Event
          const tempTaskForSync: Task = {
            id: 'temp',
            title: taskData.title,
            description: taskData.description,
            category: taskData.category,
            priority: taskData.priority,
            dueDate: taskData.dueDate,
            dueTime: taskData.dueTime,
            durationMinutes: taskData.durationMinutes,
            completed: false,
            reminderMinutesBefore: taskData.reminderMinutesBefore,
            createdAt: new Date().toISOString(),
          };
          newCalendarEventId = await createCalendarEvent(token, tempTaskForSync);
        }
      } else if (!taskData.syncToCalendar && taskToEdit?.calendarEventId && token) {
        // User unchecked sync on an already synced task - delete from calendar
        const confirmed = window.confirm('Unchecking sync will delete the corresponding event from Google Calendar. Proceed?');
        if (confirmed) {
          await deleteCalendarEvent(token, taskToEdit.calendarEventId);
          newCalendarEventId = undefined;
        } else {
          setIsSyncingTask(false);
          return; // Abort
        }
      }

      if (taskToEdit) {
        // Edit Mode
        const updatedTasks = tasks.map((t) => {
          if (t.id === taskToEdit.id) {
            return {
              ...t,
              title: taskData.title,
              description: taskData.description,
              category: taskData.category,
              priority: taskData.priority,
              dueDate: taskData.dueDate,
              dueTime: taskData.dueTime,
              durationMinutes: taskData.durationMinutes,
              reminderMinutesBefore: taskData.reminderMinutesBefore,
              calendarEventId: newCalendarEventId,
              calendarSyncedAt: newCalendarEventId ? new Date().toISOString() : undefined,
            };
          }
          return t;
        });
        setTasks(updatedTasks);
        showNotification('success', 'Task updated successfully!');
      } else {
        // Create Mode
        const newTask: Task = {
          id: crypto.randomUUID(),
          title: taskData.title,
          description: taskData.description,
          category: taskData.category,
          priority: taskData.priority,
          dueDate: taskData.dueDate,
          dueTime: taskData.dueTime,
          durationMinutes: taskData.durationMinutes,
          reminderMinutesBefore: taskData.reminderMinutesBefore,
          completed: false,
          calendarEventId: newCalendarEventId,
          calendarSyncedAt: newCalendarEventId ? new Date().toISOString() : undefined,
          createdAt: new Date().toISOString(),
        };
        setTasks([newTask, ...tasks]);
        showNotification('success', 'Task created successfully!');
      }

      // Close modal & reset
      setIsFormOpen(false);
      setTaskToEdit(undefined);

      // Refresh calendar entries if synced
      if (token && (taskData.syncToCalendar || taskToEdit?.calendarEventId)) {
        fetchCalendarEvents(token);
      }
    } catch (err: any) {
      console.error(err);
      showNotification('error', err.message || 'Operation failed. Please check network connectivity.');
    } finally {
      setIsSyncingTask(false);
    }
  };

  // Delete task handler with calendar awareness
  const handleDeleteTask = async (id: string) => {
    const taskToDelete = tasks.find((t) => t.id === id);
    if (!taskToDelete) return;

    // MANDATORY explicit dialog for deleting synced data
    const confirmMessage = taskToDelete.calendarEventId && auth.token
      ? `Are you sure you want to delete "${taskToDelete.title}"? Since this task is synced to Google Calendar, deleting it here will also permanently remove it from your calendar.`
      : `Are you sure you want to delete "${taskToDelete.title}"?`;

    const confirmed = window.confirm(confirmMessage);
    if (!confirmed) return;

    setIsSyncingTask(true);
    try {
      if (taskToDelete.calendarEventId && auth.token) {
        await deleteCalendarEvent(auth.token, taskToDelete.calendarEventId);
      }
      setTasks(tasks.filter((t) => t.id !== id));
      showNotification('success', 'Task deleted.');
      if (auth.token && taskToDelete.calendarEventId) {
        fetchCalendarEvents(auth.token);
      }
    } catch (err: any) {
      console.error(err);
      showNotification('error', 'Failed to delete calendar event. Task deleted locally only.');
      setTasks(tasks.filter((t) => t.id !== id));
    } finally {
      setIsSyncingTask(false);
    }
  };

  // Toggle complete handler with event updating
  const handleToggleComplete = async (id: string) => {
    const updatedTasks = await Promise.all(
      tasks.map(async (t) => {
        if (t.id === id) {
          const updated = { ...t, completed: !t.completed };
          if (updated.calendarEventId && auth.token) {
            try {
              // Update calendar event description with completion checkmark
              await updateCalendarEvent(auth.token, updated.calendarEventId, updated);
            } catch (err) {
              console.error('Failed to sync complete status to calendar:', err);
            }
          }
          return updated;
        }
        return t;
      })
    );
    setTasks(updatedTasks);
  };

  // Sync task directly
  const handleSyncTaskDirectly = async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task || !auth.token) return;

    setIsSyncingTask(true);
    try {
      const eventId = await createCalendarEvent(auth.token, task);
      setTasks(
        tasks.map((t) => {
          if (t.id === id) {
            return {
              ...t,
              calendarEventId: eventId,
              calendarSyncedAt: new Date().toISOString(),
            };
          }
          return t;
        })
      );
      showNotification('success', 'Task scheduled on Google Calendar!');
      fetchCalendarEvents(auth.token);
    } catch (err: any) {
      console.error(err);
      showNotification('error', err.message || 'Direct sync failed.');
    } finally {
      setIsSyncingTask(false);
    }
  };

  // Unsync task directly with confirmation
  const handleUnsyncTaskDirectly = async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task || !task.calendarEventId || !auth.token) return;

    const confirmed = window.confirm(
      'Are you sure you want to unsync this task? This will permanently delete the event from your Google Calendar but keep the task inside this list.'
    );
    if (!confirmed) return;

    setIsSyncingTask(true);
    try {
      await deleteCalendarEvent(auth.token, task.calendarEventId);
      setTasks(
        tasks.map((t) => {
          if (t.id === id) {
            return {
              ...t,
              calendarEventId: undefined,
              calendarSyncedAt: undefined,
            };
          }
          return t;
        })
      );
      showNotification('success', 'Task unsynced and removed from Google Calendar.');
      fetchCalendarEvents(auth.token);
    } catch (err: any) {
      console.error(err);
      showNotification('error', err.message || 'Failed to remove from Google Calendar.');
    } finally {
      setIsSyncingTask(false);
    }
  };

  // Trigger quick task form with pre-filled recommendation slot
  const handleQuickSchedule = (slot: { date: string; time: string }) => {
    setTaskToEdit(undefined);
    setIsFormOpen(true);
    // Let's create a temporary skeleton edit values to inject date/time
    setTimeout(() => {
      const dateInput = document.getElementById('task-date') as HTMLInputElement;
      const timeInput = document.getElementById('task-time') as HTMLInputElement;
      if (dateInput) dateInput.value = slot.date;
      if (timeInput) timeInput.value = slot.time;
    }, 100);
  };

  // Calculate statistics
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.completed).length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const syncedCount = tasks.filter((t) => t.calendarEventId).length;

  return (
    <div className="min-h-screen bg-[#0c0d10] text-zinc-300 font-sans flex flex-col antialiased pb-12">
      {/* Dynamic Toast Notifications */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-2xl flex items-center gap-3 border transition-all max-w-sm animate-bounce ${
            notification.type === 'success'
              ? 'bg-zinc-950 border-emerald-500/30 text-emerald-300'
              : 'bg-zinc-950 border-rose-500/30 text-rose-300'
          }`}
        >
          <AlertCircle size={18} className={notification.type === 'success' ? 'text-emerald-400' : 'text-rose-400'} />
          <p className="text-xs font-semibold leading-relaxed">{notification.message}</p>
        </div>
      )}

      {/* Modern Header Nav Bar */}
      <header className="sticky top-0 z-40 w-full bg-[#0c0d10]/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-amber-100/10 border border-amber-100/25 flex items-center justify-center text-amber-100">
              <CalendarDays size={18} />
            </div>
            <div>
              <h1 className="text-sm font-serif font-bold tracking-wider text-white">
                Todo &amp; Calendar
              </h1>
              <span className="text-[9px] text-amber-200/80 font-mono tracking-widest uppercase block">
                Workspace Scheduler
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Google Authentication Control */}
            {auth.loading ? (
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-amber-100 rounded-full animate-spin" />
                <span className="text-xs text-zinc-500 font-medium">Checking authorization...</span>
              </div>
            ) : auth.user ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-xs font-bold text-white">{auth.user.displayName}</span>
                  <span className="text-[9px] font-mono text-emerald-400 uppercase tracking-widest">Google Connected</span>
                </div>
                {auth.user.photoURL && (
                  <img
                    src={auth.user.photoURL}
                    alt={auth.user.displayName || 'Google user'}
                    referrerPolicy="no-referrer"
                    className="w-7 h-7 rounded-full border border-white/10"
                  />
                )}
                <button
                  onClick={handleLogout}
                  className="p-1.5 rounded-lg border border-white/10 text-zinc-500 hover:text-rose-400 hover:bg-white/5 transition-colors cursor-pointer"
                  title="Sign out from Google"
                >
                  <LogOut size={14} />
                </button>
              </div>
            ) : (
              <button onClick={handleLogin} className="gsi-material-button">
                <div className="gsi-material-button-state"></div>
                <div className="gsi-material-button-content-wrapper">
                  <div className="gsi-material-button-icon">
                    <svg
                      version="1.1"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 48 48"
                      style={{ display: 'block' }}
                    >
                      <path
                        fill="#EA4335"
                        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                      ></path>
                      <path
                        fill="#4285F4"
                        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                      ></path>
                      <path
                        fill="#FBBC05"
                        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                      ></path>
                      <path
                        fill="#34A853"
                        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                      ></path>
                    </svg>
                  </div>
                  <span className="gsi-material-button-contents">Sign in with Google</span>
                </div>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 pt-6 space-y-6 flex-1 w-full">
        {/* Top Bento Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-[#0f1115] border border-white/5 shadow-xs flex items-center gap-3.5">
            <div className="w-9 h-9 rounded bg-[#13141c] text-blue-300 border border-blue-500/20 flex items-center justify-center shrink-0">
              <Plus size={16} />
            </div>
            <div>
              <span className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest block">
                Total Tasks
              </span>
              <span className="text-xl font-serif font-extrabold text-white leading-none">
                {totalTasks}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0f1115] border border-white/5 shadow-xs flex items-center gap-3.5">
            <div className="w-9 h-9 rounded bg-[#101c14] text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <CheckCircle size={16} />
            </div>
            <div>
              <span className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest block">
                Completed
              </span>
              <span className="text-xl font-serif font-extrabold text-white leading-none">
                {completedTasks}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0f1115] border border-white/5 shadow-xs flex items-center gap-3.5">
            <div className="w-9 h-9 rounded bg-[#1c1610] text-amber-200 border border-amber-100/20 flex items-center justify-center shrink-0">
              <Trophy size={16} />
            </div>
            <div>
              <span className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest block">
                Complete Rate
              </span>
              <span className="text-xl font-serif font-extrabold text-white leading-none">
                {completionRate}%
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#0f1115] border border-white/5 shadow-xs flex items-center gap-3.5">
            <div className="w-9 h-9 rounded bg-[#1c101c] text-purple-300 border border-purple-500/20 flex items-center justify-center shrink-0">
              <Calendar size={16} />
            </div>
            <div>
              <span className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-widest block">
                Calendar Synced
              </span>
              <span className="text-xl font-serif font-extrabold text-white leading-none">
                {syncedCount} <span className="text-xs font-semibold text-zinc-500">tasks</span>
              </span>
            </div>
          </div>
        </div>

        {/* Dynamic Warning for non-logged users */}
        {auth.needsAuth && !auth.loading && (
          <div className="p-5 rounded-xl bg-gradient-to-r from-[#12141c] to-[#1c1510] border border-white/5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded bg-[#14151a] text-amber-100 border border-white/10 flex items-center justify-center shrink-0">
                <Sparkles size={18} className="animate-pulse" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs font-mono font-extrabold text-amber-100 uppercase tracking-wider">
                  Unleash Smart Google Calendar Sync
                </h4>
                <p className="text-xs text-zinc-400 max-w-xl">
                  Sign in with your Google account to unlock real-time bidirectional task event creation, automated mobile reminders, and calendar slot recommendations.
                </p>
              </div>
            </div>
            <button
              onClick={handleLogin}
              className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-zinc-950 font-bold text-xs uppercase tracking-widest transition-colors shadow-lg cursor-pointer whitespace-nowrap self-end sm:self-center"
            >
              Enable Calendar Sync
            </button>
          </div>
        )}

        {/* Dual Column Workspace Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left Column: Tasks Board (2/3 width on desktop) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-serif font-bold tracking-wide text-white">
                  Tasks Organizer
                </h2>
                <p className="text-xs text-zinc-500">Draft, organize, and execute your agenda</p>
              </div>

              <button
                onClick={() => {
                  setTaskToEdit(undefined);
                  setIsFormOpen(true);
                }}
                className="px-4 py-2 rounded-lg bg-amber-100 hover:bg-amber-200 text-zinc-950 font-bold text-xs uppercase tracking-widest flex items-center gap-1.5 shadow-lg active:scale-98 transition-all cursor-pointer"
              >
                <Plus size={12} />
                Add Task
              </button>
            </div>

            <TaskList
              tasks={tasks}
              onToggleComplete={handleToggleComplete}
              onEdit={(task) => {
                setTaskToEdit(task);
                setIsFormOpen(true);
              }}
              onDelete={handleDeleteTask}
              onSyncTask={handleSyncTaskDirectly}
              onUnsyncTask={handleUnsyncTaskDirectly}
              hasGoogleAccess={!!auth.token}
            />
          </div>

          {/* Right Column: Calendar Schedules (1/3 width on desktop) */}
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-serif font-bold tracking-wide text-white">
                Schedule Integrator
              </h2>
              <p className="text-xs text-zinc-500">Situational calendar and smart reminders</p>
            </div>

            {auth.token ? (
              <CalendarSyncView
                events={calendarEvents}
                tasks={tasks}
                onRefresh={() => fetchCalendarEvents(auth.token!)}
                isLoading={isCalendarLoading}
                onQuickSchedule={handleQuickSchedule}
              />
            ) : (
              <div className="p-6 rounded-xl bg-[#0f1115] border border-white/5 shadow-sm text-center space-y-4">
                <div className="w-12 h-12 bg-zinc-900 text-zinc-500 rounded-full flex items-center justify-center mx-auto border border-white/5">
                  <Calendar size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-zinc-200">Calendar view not connected</h4>
                  <p className="text-xs text-zinc-500 mt-1 max-w-xs mx-auto">
                    Sign in with your Google Workspace profile above to load calendar events and configure notifications.
                  </p>
                </div>
                <button
                  onClick={handleLogin}
                  className="w-full py-2 rounded-lg border border-white/10 hover:border-amber-100/50 text-xs font-bold text-zinc-400 hover:text-white uppercase tracking-wider transition-all bg-zinc-900/50 cursor-pointer"
                >
                  Connect Calendar API
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Task Creation & Edit Slide-over / Modal Backdrop */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0c0d10] rounded-xl border border-white/10 shadow-2xl w-full max-w-xl overflow-hidden p-6 relative max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-serif font-bold text-white mb-4 border-b border-white/5 pb-3">
              {taskToEdit ? 'Edit Task Details' : 'Schedule New Task'}
            </h3>

            <TaskForm
              task={taskToEdit}
              onSubmit={handleSaveTask}
              onCancel={() => {
                setIsFormOpen(false);
                setTaskToEdit(undefined);
              }}
              isSyncing={isSyncingTask}
              hasGoogleAccess={!!auth.token}
            />
          </div>
        </div>
      )}
    </div>
  );
}
