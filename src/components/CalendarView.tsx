import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Filter,
  Clock,
  MapPin,
  CheckCircle2,
} from 'lucide-react';
import { EventItem } from '../types.ts';

interface CalendarViewProps {
  events: EventItem[];
  onSelectEvent: (event: EventItem) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({ events, onSelectEvent }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [filterRegisteredOnly, setFilterRegisteredOnly] = useState(false);

  // Month navigation
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const today = () => {
    setCurrentDate(new Date());
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Days calculations
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Filter events
  const filteredEvents = useMemo(() => {
    return events.filter((evt) => {
      if (selectedCategory !== 'All' && evt.category !== selectedCategory) return false;
      if (filterRegisteredOnly && !evt.isRegistered) return false;
      return true;
    });
  }, [events, selectedCategory, filterRegisteredOnly]);

  // Group events by day of current month
  const eventsByDay = useMemo(() => {
    const map: Record<number, EventItem[]> = {};
    filteredEvents.forEach((evt) => {
      const parts = evt.date.split('-');
      if (parts.length === 3) {
        const evtYear = parseInt(parts[0], 10);
        const evtMonth = parseInt(parts[1], 10) - 1;
        const evtDay = parseInt(parts[2], 10);
        if (evtYear === year && evtMonth === month) {
          if (!map[evtDay]) map[evtDay] = [];
          map[evtDay].push(evt);
        }
      }
    });
    return map;
  }, [filteredEvents, year, month]);

  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Category Color Map
  const getCategoryColor = (cat: string) => {
    switch (cat.toLowerCase()) {
      case 'technical':
      case 'hackathons':
        return 'bg-blue-500 text-white';
      case 'workshops':
        return 'bg-indigo-600 text-white';
      case 'cultural':
        return 'bg-purple-600 text-white';
      case 'sports':
        return 'bg-emerald-600 text-white';
      case 'career':
        return 'bg-amber-600 text-white';
      default:
        return 'bg-neutral-800 text-white';
    }
  };

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Current day check
  const now = new Date();
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() === month;
  const currentDayNum = now.getDate();

  return (
    <div className="bg-white rounded-3xl border border-neutral-200 shadow-sm p-4 sm:p-6 space-y-5">
      {/* Calendar Header with Month Switcher and Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-neutral-900">{monthName}</h2>
            <p className="text-xs text-neutral-500 font-medium">Campus Academic & Club Calendar</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-neutral-300 text-xs font-semibold outline-none bg-neutral-50"
          >
            <option value="All">All Categories</option>
            <option value="Technical">Technical</option>
            <option value="Workshops">Workshops</option>
            <option value="Cultural">Cultural</option>
            <option value="Sports">Sports</option>
            <option value="Career">Career</option>
          </select>

          {/* My Passes toggle */}
          <button
            type="button"
            onClick={() => setFilterRegisteredOnly(!filterRegisteredOnly)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              filterRegisteredOnly
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
            }`}
          >
            My Passes Only
          </button>

          {/* Month Navigation Buttons */}
          <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1.5 rounded-lg hover:bg-white text-neutral-700 transition-colors"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={today}
              className="px-2.5 py-1 text-xs font-bold text-neutral-800 hover:bg-white rounded-lg transition-colors"
            >
              Today
            </button>
            <button
              type="button"
              onClick={nextMonth}
              className="p-1.5 rounded-lg hover:bg-white text-neutral-700 transition-colors"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Grid Days of Week */}
      <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-neutral-400 uppercase tracking-wider py-1">
        {daysOfWeek.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      {/* Month Calendar Grid */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2">
        {/* Leading empty days */}
        {Array.from({ length: firstDayOfMonth }).map((_, i) => (
          <div key={`empty-${i}`} className="min-h-[85px] sm:min-h-[110px] bg-neutral-50/50 rounded-2xl border border-neutral-100/60 p-1.5 opacity-40" />
        ))}

        {/* Days of Month */}
        {Array.from({ length: daysInMonth }).map((_, idx) => {
          const dayNum = idx + 1;
          const dayEvents = eventsByDay[dayNum] || [];
          const isToday = isCurrentMonth && dayNum === currentDayNum;

          return (
            <div
              key={`day-${dayNum}`}
              className={`min-h-[85px] sm:min-h-[110px] rounded-2xl border p-1.5 flex flex-col justify-between transition-colors ${
                isToday
                  ? 'bg-blue-50/40 border-blue-300 ring-1 ring-blue-300'
                  : 'bg-white border-neutral-200/80 hover:border-neutral-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    isToday ? 'bg-blue-600 text-white' : 'text-neutral-700'
                  }`}
                >
                  {dayNum}
                </span>
                {dayEvents.length > 0 && (
                  <span className="text-[10px] font-bold text-neutral-400 sm:hidden">
                    {dayEvents.length}
                  </span>
                )}
              </div>

              {/* Event Pills inside Day */}
              <div className="space-y-1 mt-1 overflow-hidden">
                {dayEvents.slice(0, 2).map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => onSelectEvent(e)}
                    className={`w-full text-left px-1.5 py-0.5 rounded-lg text-[10px] font-bold truncate transition-transform hover:scale-[1.02] shadow-2xs block ${getCategoryColor(
                      e.category
                    )}`}
                    title={`${e.title} (${e.startTime} at ${e.venueName})`}
                  >
                    {e.isRegistered ? '✓ ' : ''}
                    {e.title}
                  </button>
                ))}
                {dayEvents.length > 2 && (
                  <span className="text-[10px] text-neutral-500 font-bold block pl-1">
                    +{dayEvents.length - 2} more
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
