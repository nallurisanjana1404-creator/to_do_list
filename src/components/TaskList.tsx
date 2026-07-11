import React, { useState } from 'react';
import { Task, Priority } from '../types';
import {
  Trash2,
  Edit,
  Calendar,
  Clock,
  CheckCircle,
  Circle,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  Check,
  Tag,
  Share2,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface TaskListProps {
  tasks: Task[];
  onToggleComplete: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onSyncTask: (id: string) => void;
  onUnsyncTask: (id: string) => void;
  hasGoogleAccess: boolean;
}

const PRIORITY_COLORS = {
  low: {
    bg: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    dot: 'bg-emerald-400',
  },
  medium: {
    bg: 'bg-amber-100/10 text-amber-200 border border-amber-100/25',
    dot: 'bg-amber-200',
  },
  high: {
    bg: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
    dot: 'bg-rose-400',
  },
};

const CATEGORY_COLORS: Record<string, string> = {
  Work: 'bg-blue-500/10 text-blue-300 border border-blue-500/20',
  Personal: 'bg-purple-500/10 text-purple-300 border border-purple-500/20',
  Fitness: 'bg-fuchsia-500/10 text-fuchsia-300 border border-fuchsia-500/20',
  Learning: 'bg-orange-500/10 text-orange-300 border border-orange-500/20',
  Health: 'bg-pink-500/10 text-pink-300 border border-pink-500/20',
  Errands: 'bg-zinc-800/60 text-zinc-300 border border-white/5',
  Finance: 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20',
};

export default function TaskList({
  tasks,
  onToggleComplete,
  onEdit,
  onDelete,
  onSyncTask,
  onUnsyncTask,
  hasGoogleAccess,
}: TaskListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [priorityFilter, setPriorityFilter] = useState<Priority | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string | 'all'>('all');

  const triggerConfetti = () => {
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.8 },
      colors: ['#fef3c7', '#fbbf24', '#f59e0b', '#d97706'],
    });
  };

  const handleToggle = (task: Task) => {
    if (!task.completed) {
      triggerConfetti();
    }
    onToggleComplete(task.id);
  };

  const isOverdue = (task: Task) => {
    if (task.completed) return false;
    const todayStr = new Date().toISOString().split('T')[0];
    if (task.dueDate < todayStr) return true;
    
    if (task.dueDate === todayStr && task.dueTime) {
      const now = new Date();
      const currentHours = now.getHours();
      const currentMins = now.getMinutes();
      const [dueH, dueM] = task.dueTime.split(':').map(Number);
      if (currentHours > dueH || (currentHours === dueH && currentMins > dueM)) {
        return true;
      }
    }
    return false;
  };

  // Filter tasks based on all active criteria
  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && !task.completed) ||
      (statusFilter === 'completed' && task.completed);

    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;

    const matchesCategory = categoryFilter === 'all' || task.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesPriority && matchesCategory;
  });

  // Extract unique categories from actual tasks
  const availableCategories = Array.from(new Set(tasks.map((t) => t.category)));

  return (
    <div className="space-y-6">
      {/* Search and Filters Bento Section */}
      <div className="p-4 rounded-xl bg-[#0f1115] border border-white/5 shadow-sm space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search tasks by title or details..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-white/10 focus:border-amber-100/50 transition-all outline-none text-white bg-zinc-900/50 text-xs placeholder-zinc-500"
          />
        </div>

        {/* Filters grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Status filter */}
          <div className="space-y-1">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400 flex items-center gap-1 px-1">
              <CheckCircle size={10} />
              Status
            </span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-white/10 focus:border-amber-100/50 transition-all outline-none bg-zinc-900 text-zinc-300 font-medium cursor-pointer"
            >
              <option value="all">All Tasks</option>
              <option value="active">Active Only</option>
              <option value="completed">Completed Only</option>
            </select>
          </div>

          {/* Priority filter */}
          <div className="space-y-1">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400 flex items-center gap-1 px-1">
              <Filter size={10} />
              Priority
            </span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as any)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-white/10 focus:border-amber-100/50 transition-all outline-none bg-zinc-900 text-zinc-300 font-medium cursor-pointer"
            >
              <option value="all">All Priorities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Category filter */}
          <div className="space-y-1">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-400 flex items-center gap-1 px-1">
              <Tag size={10} />
              Category
            </span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-white/10 focus:border-amber-100/50 transition-all outline-none bg-zinc-900 text-zinc-300 font-medium cursor-pointer"
            >
              <option value="all">All Categories</option>
              {availableCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Task List container */}
      <div className="space-y-3.5">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-xl bg-[#0f1115] border border-white/5 shadow-sm">
            <div className="w-12 h-12 bg-zinc-900 text-amber-200/80 rounded-full flex items-center justify-center mx-auto mb-3">
              <Calendar size={20} />
            </div>
            <h3 className="text-sm font-semibold text-zinc-300">No matching tasks found</h3>
            <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
              {tasks.length === 0
                ? "You haven't created any tasks yet. Click 'Add Task' to plan your agenda!"
                : "Try widening your filter presets or refining your search parameters."}
            </p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const priorityStyle = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium;
            const categoryStyle = CATEGORY_COLORS[task.category] || 'bg-zinc-800/60 text-zinc-300 border border-white/5';
            const overdue = isOverdue(task);

            return (
              <div
                key={task.id}
                className={`p-4 rounded-xl border transition-all hover:border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  task.completed ? 'opacity-50 border-white/5 bg-zinc-950/20' : 'border-white/5 bg-zinc-900/30'
                }`}
              >
                {/* Task Checkbox & Content */}
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => handleToggle(task)}
                    className="mt-0.5 text-zinc-500 hover:text-amber-100 transition-colors shrink-0 cursor-pointer"
                  >
                    {task.completed ? (
                      <CheckCircle size={20} className="text-amber-200 fill-amber-100/10" />
                    ) : (
                      <Circle size={20} className="hover:scale-105 transition-transform" />
                    )}
                  </button>

                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4
                        className={`font-serif text-sm tracking-wide text-zinc-100 break-words ${
                          task.completed ? 'line-through text-zinc-500' : ''
                        }`}
                      >
                        {task.title}
                      </h4>

                      {/* Overdue Badge */}
                      {overdue && (
                        <span className="flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse uppercase tracking-wider">
                          <AlertTriangle size={9} />
                          Overdue
                        </span>
                      )}
                    </div>

                    {task.description && (
                      <p
                        className={`text-xs text-zinc-400 break-words line-clamp-2 max-w-2xl font-sans ${
                          task.completed ? 'text-zinc-500' : ''
                        }`}
                      >
                        {task.description}
                      </p>
                    )}

                    {/* Meta Indicators Grid */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[10px] text-zinc-500 font-medium">
                      {/* Due date info */}
                      <span className="flex items-center gap-1">
                        <Calendar size={11} className="text-zinc-600" />
                        {task.dueDate} {task.dueTime && `@ ${task.dueTime}`}
                      </span>

                      {/* Duration */}
                      <span className="flex items-center gap-1">
                        <Clock size={11} className="text-zinc-600" />
                        {task.durationMinutes} mins
                      </span>

                      {/* Category Badge */}
                      <span
                        className={`px-2 py-0.5 rounded-md border text-[9px] uppercase tracking-wider font-semibold ${categoryStyle}`}
                      >
                        {task.category}
                      </span>

                      {/* Priority Badge */}
                      <span
                        className={`px-2 py-0.5 rounded-md border text-[9px] uppercase tracking-wider font-semibold flex items-center gap-1 capitalize ${priorityStyle.bg}`}
                      >
                        <span className={`w-1 h-1 rounded-full ${priorityStyle.dot}`} />
                        {task.priority}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Calendar Sync Status & Actions Container */}
                <div className="flex flex-wrap items-center justify-between md:justify-end gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-white/5">
                  {/* Google Calendar sync status badge */}
                  {hasGoogleAccess && (
                    <div className="flex items-center">
                      {task.calendarEventId ? (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-100/10 border border-amber-100/20 text-[10px] font-bold uppercase tracking-widest text-amber-100">
                          <Check size={10} className="text-amber-100 font-bold" />
                          <span>Synced</span>
                          <button
                            onClick={() => onUnsyncTask(task.id)}
                            title="Unsync and delete from Google Calendar"
                            className="ml-1 text-zinc-500 hover:text-rose-400 transition-colors font-normal normal-case tracking-normal cursor-pointer text-[10px]"
                          >
                            Unsync
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => onSyncTask(task.id)}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-900 border border-white/10 hover:border-amber-100/30 hover:bg-zinc-800/50 text-[10px] font-semibold text-zinc-400 hover:text-white transition-all cursor-pointer"
                        >
                          <Share2 size={10} />
                          <span>Sync to Google Calendar</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Task Card Controls */}
                  <div className="flex items-center gap-1 ml-auto">
                    {/* Edit button */}
                    <button
                      type="button"
                      onClick={() => onEdit(task)}
                      className="p-2 rounded hover:text-amber-100 hover:bg-white/5 text-zinc-500 transition-all cursor-pointer"
                      title="Edit Task"
                    >
                      <Edit size={14} />
                    </button>

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={() => onDelete(task.id)}
                      className="p-2 rounded hover:text-rose-400 hover:bg-white/5 text-zinc-500 transition-all cursor-pointer"
                      title="Delete Task"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
