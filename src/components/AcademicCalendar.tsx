import React, { useState, useEffect, useMemo } from 'react';
import { UserProfile, CalendarEvent, CalendarEventType, UserRole } from '../types';
import { supabase } from '../lib/supabase';
import { 
  Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, Plus, 
  Filter, Search, AlertCircle, BookOpen, Award, Users, Video, Tag, Check, Trash2
} from 'lucide-react';

interface AcademicCalendarProps {
  currentUser: UserProfile;
  effectiveRole?: UserRole;
}

const EVENT_TYPE_COLORS: Record<CalendarEventType, { bg: string; text: string; border: string; badge: string }> = {
  EXAM: { bg: 'bg-rose-500/15', text: 'text-rose-400', border: 'border-rose-500/30', badge: 'bg-rose-500' },
  TEST: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30', badge: 'bg-amber-500' },
  ASSIGNMENT: { bg: 'bg-indigo-500/15', text: 'text-indigo-400', border: 'border-indigo-500/30', badge: 'bg-indigo-500' },
  HOLIDAY: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30', badge: 'bg-emerald-500' },
  SCHOOL_EVENT: { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30', badge: 'bg-blue-500' },
  COMPETITION: { bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/30', badge: 'bg-purple-500' },
  MEETING: { bg: 'bg-cyan-500/15', text: 'text-cyan-400', border: 'border-cyan-500/30', badge: 'bg-cyan-500' },
  OTHER: { bg: 'bg-slate-500/15', text: 'text-slate-400', border: 'border-slate-500/30', badge: 'bg-slate-500' }
};

export default function AcademicCalendar({ currentUser, effectiveRole }: AcademicCalendarProps) {
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'agenda'>('month');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal State for New Event
  const [showEventModal, setShowEventModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newType, setNewType] = useState<CalendarEventType>('EXAM');
  const [newStartDate, setNewStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [newStartTime, setNewStartTime] = useState('09:00');
  const [newEndDate, setNewEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [newEndTime, setNewEndTime] = useState('10:30');
  const [newAudience, setNewAudience] = useState<'all' | 'students' | 'teachers' | 'coordinators'>('all');
  const [newGrade, setNewGrade] = useState<string>('all');
  const [submitting, setSubmitting] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const canCreateEvents = 
    effectiveRole === 'teacher' || 
    effectiveRole === 'coordinator' || 
    effectiveRole === 'admin' || 
    effectiveRole === 'super_admin';

  // Fetch Events from Supabase
  const fetchCalendarEvents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .order('start_time', { ascending: true });

      if (error && error.code !== '42P01') throw error;

      let mapped: CalendarEvent[] = (data || []).map((r: any) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        startTime: r.start_time,
        endTime: r.end_time,
        eventType: r.event_type as CalendarEventType,
        category: r.category,
        color: r.color,
        audience: r.audience || 'all',
        classGrade: r.class_grade,
        classSection: r.class_section,
        createdBy: r.created_by,
        createdByName: r.created_by_name,
        createdAt: r.created_at
      }));

      // Also pull homework assignments and school events to populate the calendar automatically
      try {
        const { data: hwData } = await supabase.from('homework').select('*');
        if (hwData) {
          hwData.forEach((hw: any) => {
            if (hw.due_date) {
              mapped.push({
                id: `hw_${hw.id}`,
                title: `Due: ${hw.title || hw.subject}`,
                description: `Subject: ${hw.subject}. ${hw.description || ''}`,
                startTime: `${hw.due_date}T23:59:00`,
                endTime: `${hw.due_date}T23:59:00`,
                eventType: 'ASSIGNMENT',
                audience: 'students',
                classGrade: hw.grade,
                classSection: hw.section,
                createdBy: hw.teacher_id,
                createdByName: hw.teacher_name
              });
            }
          });
        }
      } catch (_) {}

      // Filter based on Student's role and class
      if (effectiveRole === 'student') {
        mapped = mapped.filter(e => {
          if (e.audience === 'teachers' || e.audience === 'coordinators') return false;
          if (e.classGrade && e.classGrade !== 'all' && currentUser.grade && e.classGrade !== currentUser.grade) return false;
          return true;
        });
      }

      setEvents(mapped);
    } catch (err) {
      console.error('Failed to fetch calendar events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendarEvents();
  }, [currentUser, effectiveRole]);

  // Handle Event Creation
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setSubmitting(true);
    try {
      const startDateTime = `${newStartDate}T${newStartTime}:00`;
      const endDateTime = `${newEndDate}T${newEndTime}:00`;

      const eventPayload = {
        title: newTitle.trim(),
        description: newDesc.trim(),
        event_type: newType,
        start_time: startDateTime,
        end_time: endDateTime,
        audience: newAudience,
        class_grade: newGrade === 'all' ? null : newGrade,
        created_by: currentUser.uid,
        created_by_name: currentUser.name || currentUser.email
      };

      const { data, error } = await supabase
        .from('calendar_events')
        .insert([eventPayload])
        .select()
        .single();

      if (error && error.code !== '42P01') throw error;

      setShowEventModal(false);
      setNewTitle('');
      setNewDesc('');
      fetchCalendarEvents();
    } catch (err) {
      console.error('Failed to create calendar event:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Delete event
  const handleDeleteEvent = async (id: string) => {
    if (!confirm('Are you sure you want to remove this calendar event?')) return;
    try {
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', id);

      if (error && error.code !== '42P01') throw error;
      setSelectedEvent(null);
      fetchCalendarEvents();
    } catch (err) {
      console.error('Failed to delete event:', err);
    }
  };

  // Date Navigation
  const handlePrev = () => {
    const next = new Date(currentDate);
    if (viewMode === 'month') next.setMonth(next.getMonth() - 1);
    else if (viewMode === 'week') next.setDate(next.getDate() - 7);
    else next.setDate(next.getDate() - 14);
    setCurrentDate(next);
  };

  const handleNext = () => {
    const next = new Date(currentDate);
    if (viewMode === 'month') next.setMonth(next.getMonth() + 1);
    else if (viewMode === 'week') next.setDate(next.getDate() + 7);
    else next.setDate(next.getDate() + 14);
    setCurrentDate(next);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Filter events
  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      if (filterType !== 'all' && e.eventType !== filterType) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          e.title.toLowerCase().includes(q) || 
          (e.description || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [events, filterType, searchQuery]);

  // Month Matrix Computation
  const monthData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevDaysInMonth = new Date(year, month, 0).getDate();

    const cells: { dateStr: string; dayNum: number; isCurrentMonth: boolean; date: Date }[] = [];

    // Previous month filler days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = prevDaysInMonth - i;
      const d = new Date(year, month - 1, dayNum);
      cells.push({
        dateStr: d.toISOString().split('T')[0],
        dayNum,
        isCurrentMonth: false,
        date: d
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      cells.push({
        dateStr: d.toISOString().split('T')[0],
        dayNum: i,
        isCurrentMonth: true,
        date: d
      });
    }

    // Next month filler days to complete 35 or 42 grid cells
    const remaining = 42 - cells.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      cells.push({
        dateStr: d.toISOString().split('T')[0],
        dayNum: i,
        isCurrentMonth: false,
        date: d
      });
    }

    return cells;
  }, [currentDate]);

  // Today ISO
  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="smart-glass p-6 md:p-8 rounded-3xl space-y-6 max-w-7xl mx-auto animate-fadeIn w-full">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-2xl font-black text-white tracking-tight">StudentOS Academic Calendar</h3>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Exam schedules, class tests, assignment deadlines, school events, and academic terms.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View mode switcher */}
          <div className="flex items-center bg-slate-900/90 rounded-2xl p-1 border border-white/10">
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${viewMode === 'month' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              Month
            </button>
            <button
              onClick={() => setViewMode('agenda')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${viewMode === 'agenda' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              Agenda
            </button>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-1 bg-slate-900/90 rounded-2xl p-1 border border-white/10">
            <button
              onClick={handlePrev}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-2.5 py-1 text-xs font-bold text-slate-300 hover:text-white"
            >
              Today
            </button>
            <button
              onClick={handleNext}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all"
              aria-label="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Create Button if authorized */}
          {canCreateEvents && (
            <button
              onClick={() => setShowEventModal(true)}
              className="py-2 px-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Event</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3.5 bg-slate-950/60 border border-white/10 rounded-2xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5 text-indigo-400" /> Filter:
          </span>
          {['all', 'EXAM', 'TEST', 'ASSIGNMENT', 'HOLIDAY', 'SCHOOL_EVENT'].map(t => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${filterType === t ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white border border-white/5'}`}
            >
              {t === 'all' ? 'All Events' : t.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="w-full sm:w-64">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search events, exams..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* VIEW: MONTH GRID */}
      {viewMode === 'month' && (
        <div className="bg-slate-950/60 rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
          {/* Day Names */}
          <div className="grid grid-cols-7 bg-slate-900 border-b border-white/10 text-center py-2.5 text-[11px] font-black uppercase tracking-wider text-slate-400">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d}>{d}</div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 divide-x divide-y divide-white/5">
            {monthData.map((cell, idx) => {
              const dayEvents = filteredEvents.filter(e => {
                if (!e.startTime) return false;
                return e.startTime.startsWith(cell.dateStr);
              });
              const isToday = cell.dateStr === todayStr;

              return (
                <div
                  key={idx}
                  className={`min-h-[105px] p-2 flex flex-col justify-between transition-colors ${
                    cell.isCurrentMonth ? 'bg-slate-950/40 hover:bg-slate-900/30' : 'bg-slate-950/80 opacity-40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-mono font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                        isToday ? 'bg-indigo-600 text-white font-black' : 'text-slate-300'
                      }`}
                    >
                      {cell.dayNum}
                    </span>
                    {dayEvents.length > 2 && (
                      <span className="text-[9px] font-bold text-slate-500 font-mono">
                        +{dayEvents.length - 2}
                      </span>
                    )}
                  </div>

                  {/* Event Badges in Cell */}
                  <div className="space-y-1 my-1 overflow-hidden">
                    {dayEvents.slice(0, 2).map(evt => {
                      const color = EVENT_TYPE_COLORS[evt.eventType] || EVENT_TYPE_COLORS.OTHER;
                      return (
                        <div
                          key={evt.id}
                          onClick={() => setSelectedEvent(evt)}
                          className={`p-1 rounded-lg text-[10px] font-bold truncate border transition-all cursor-pointer ${color.bg} ${color.text} ${color.border} hover:scale-[1.02]`}
                          title={`${evt.title} (${evt.eventType})`}
                        >
                          <span className="mr-1">{evt.title}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="h-1" />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW: AGENDA / LIST */}
      {viewMode === 'agenda' && (
        <div className="space-y-3">
          {filteredEvents.length === 0 ? (
            <div className="p-12 text-center bg-slate-950/60 border border-white/5 rounded-2xl space-y-2">
              <CalendarIcon className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-sm font-bold text-slate-300">No events scheduled</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No academic calendar events match your filters. Faculty and administrators can schedule exams and events using the "Add Event" button.
              </p>
            </div>
          ) : (
            filteredEvents.map(evt => {
              const color = EVENT_TYPE_COLORS[evt.eventType] || EVENT_TYPE_COLORS.OTHER;
              const datePart = evt.startTime ? evt.startTime.split('T')[0] : 'Unspecified Date';
              const timePart = evt.startTime && evt.startTime.includes('T') ? evt.startTime.split('T')[1].substring(0, 5) : '';

              return (
                <div
                  key={evt.id}
                  onClick={() => setSelectedEvent(evt)}
                  className="p-4 bg-slate-950/60 hover:bg-slate-900/60 border border-white/10 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all cursor-pointer group"
                >
                  <div className="flex items-start gap-3.5">
                    <div className={`w-3 h-12 rounded-full ${color.badge} shrink-0 mt-0.5`} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${color.bg} ${color.text} border ${color.border}`}>
                          {evt.eventType.replace('_', ' ')}
                        </span>
                        {evt.classGrade && (
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-white/5">
                            {evt.classGrade}
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-white mt-1 group-hover:text-indigo-400 transition-colors">
                        {evt.title}
                      </h4>
                      {evt.description && (
                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{evt.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0 text-xs text-slate-400 sm:text-right">
                    <div className="space-y-0.5 font-mono">
                      <div className="text-white font-bold">{datePart}</div>
                      {timePart && <div className="text-[11px] text-slate-500">{timePart}</div>}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* EVENT DETAILS MODAL */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${EVENT_TYPE_COLORS[selectedEvent.eventType]?.bg} ${EVENT_TYPE_COLORS[selectedEvent.eventType]?.text} border ${EVENT_TYPE_COLORS[selectedEvent.eventType]?.border}`}>
                {selectedEvent.eventType.replace('_', ' ')}
              </span>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕ Close
              </button>
            </div>

            <div>
              <h3 className="text-lg font-black text-white">{selectedEvent.title}</h3>
              <p className="text-xs text-slate-400 mt-1">{selectedEvent.description || 'No detailed notes provided.'}</p>
            </div>

            <div className="p-3 bg-slate-950/60 rounded-xl border border-white/5 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-500 font-bold uppercase text-[10px]">Start:</span>
                <span className="font-mono">{selectedEvent.startTime?.replace('T', ' ')}</span>
              </div>
              {selectedEvent.endTime && (
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-500 font-bold uppercase text-[10px]">End:</span>
                  <span className="font-mono">{selectedEvent.endTime?.replace('T', ' ')}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-500 font-bold uppercase text-[10px]">Audience:</span>
                <span className="capitalize">{selectedEvent.audience}</span>
              </div>
              {selectedEvent.createdByName && (
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-500 font-bold uppercase text-[10px]">Organizer:</span>
                  <span>{selectedEvent.createdByName}</span>
                </div>
              )}
            </div>

            {canCreateEvents && !selectedEvent.id.startsWith('hw_') && (
              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => handleDeleteEvent(selectedEvent.id)}
                  className="px-3 py-1.5 rounded-xl bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 text-xs font-bold flex items-center gap-1.5 transition-all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Remove Event
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CREATE EVENT MODAL */}
      {showEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h4 className="text-lg font-black text-white">Schedule Calendar Event</h4>
              <button
                onClick={() => setShowEventModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕ Cancel
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="e.g. Physics Midterm Examination"
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Event Type</label>
                  <select
                    value={newType}
                    onChange={e => setNewType(e.target.value as CalendarEventType)}
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="EXAM">EXAM</option>
                    <option value="TEST">TEST</option>
                    <option value="ASSIGNMENT">ASSIGNMENT</option>
                    <option value="HOLIDAY">HOLIDAY</option>
                    <option value="SCHOOL_EVENT">SCHOOL EVENT</option>
                    <option value="COMPETITION">COMPETITION</option>
                    <option value="MEETING">MEETING</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Target Grade</label>
                  <select
                    value={newGrade}
                    onChange={e => setNewGrade(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="all">All Grades (School-wide)</option>
                    <option value="Grade 9">Grade 9</option>
                    <option value="Grade 10">Grade 10</option>
                    <option value="Grade 11">Grade 11</option>
                    <option value="Grade 12">Grade 12</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={newStartDate}
                    onChange={e => {
                      setNewStartDate(e.target.value);
                      setNewEndDate(e.target.value);
                    }}
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Start Time</label>
                  <input
                    type="time"
                    value={newStartTime}
                    onChange={e => setNewStartTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Description / Syllabus</label>
                <textarea
                  rows={2}
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  placeholder="Chapters covered, venue, instructions..."
                  className="w-full px-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-white focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEventModal(false)}
                  className="px-4 py-2 bg-slate-800 text-white rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all disabled:opacity-50"
                >
                  {submitting ? 'Scheduling...' : 'Confirm Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
