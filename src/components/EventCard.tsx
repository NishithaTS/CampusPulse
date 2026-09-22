import React from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  ShieldCheck,
  Bookmark,
  Sparkles,
  ArrowRight,
  AlertTriangle,
  QrCode,
  CheckCircle2,
} from 'lucide-react';
import { EventItem } from '../types.ts';

interface EventCardProps {
  event: EventItem;
  onSelect: (event: EventItem) => void;
  onToggleSave?: (event: EventItem) => void;
  onQuickRegister?: (event: EventItem) => void;
  onOpenQR?: (event: EventItem) => void;
}

export const EventCard: React.FC<EventCardProps> = ({
  event,
  onSelect,
  onToggleSave,
  onQuickRegister,
  onOpenQR,
}) => {
  const isFull = event.registeredCount >= event.capacity;
  const isPast = event.status === 'completed' || new Date(event.date) < new Date(new Date().toDateString());
  const isCancelled = event.status === 'cancelled';
  const fillPercentage = Math.min(100, Math.round((event.registeredCount / event.capacity) * 100));

  // Date formatting
  const eventDate = new Date(`${event.date}T${event.startTime || '00:00'}`);
  const monthName = eventDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  const dayNum = eventDate.getDate();

  const getVerificationBadge = () => {
    if (event.verificationBadge === 'official') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          Official Campus
        </span>
      );
    }
    if (event.verificationBadge === 'verified_club') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
          <ShieldCheck className="w-3.5 h-3.5 text-red-600" />
          Verified Club
        </span>
      );
    }
    if (event.verificationBadge === 'department') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
          <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
          Academic Dept
        </span>
      );
    }
    return null;
  };

  return (
    <div
      id={`event-card-${event.id}`}
      className="group relative bg-white rounded-2xl border border-neutral-200/90 shadow-sm hover:shadow-md hover:border-neutral-300 transition-all duration-200 flex flex-col overflow-hidden"
    >
      {/* Poster Image & Badges */}
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-neutral-100">
        <img
          src={event.posterUrl}
          alt={event.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

        {/* Top Floating Row: Date Stamp & Bookmark */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <div className="bg-white/95 backdrop-blur-sm rounded-xl px-2.5 py-1 text-center shadow-sm border border-neutral-200/40">
            <span className="block text-[10px] font-bold tracking-wider text-rose-600 uppercase">{monthName}</span>
            <span className="block text-lg font-black text-neutral-900 leading-none">{dayNum}</span>
          </div>
          {event.isFeatured && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-400 text-neutral-950 shadow-sm">
              <Sparkles className="w-3 h-3" />
              Featured
            </span>
          )}
        </div>

        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          {onToggleSave && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleSave(event);
              }}
              title={event.isSaved ? 'Remove from saved' : 'Save event'}
              className={`p-2 rounded-xl backdrop-blur-md transition-colors ${
                event.isSaved
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'bg-white/80 hover:bg-white text-neutral-700'
              }`}
            >
              <Bookmark className={`w-4 h-4 ${event.isSaved ? 'fill-current' : ''}`} />
            </button>
          )}
        </div>

        {/* Bottom Floating Info on Image */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs">
          <span className="font-medium bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-md border border-white/10">
            {event.category}
          </span>
          <span className="font-semibold bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-md border border-white/10">
            {event.isPaid ? `$${event.feeAmount}` : 'Free Entry'}
          </span>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
        <div>
          {/* Verification / Category Row */}
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {getVerificationBadge()}
            {isCancelled && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                <AlertTriangle className="w-3 h-3" />
                Cancelled
              </span>
            )}
            {event.status === 'pending_approval' && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                Pending Approval
              </span>
            )}
          </div>

          {/* Title */}
          <h3
            onClick={() => onSelect(event)}
            className="text-base sm:text-lg font-bold text-neutral-900 line-clamp-2 hover:text-red-600 transition-colors cursor-pointer"
          >
            {event.title}
          </h3>

          {/* Organizer */}
          <p className="text-xs text-neutral-500 mt-1 flex items-center gap-1.5 font-medium">
            Organized by <span className="text-neutral-800 font-semibold">{event.organizerName}</span>
          </p>

          {/* Key Logistics */}
          <div className="mt-3 space-y-1.5 text-xs text-neutral-600">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
              <span>
                {event.startTime} - {event.endTime}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
              <span className="truncate">{event.venueName || 'Campus Venue'}</span>
            </div>
          </div>
        </div>

        {/* Capacity Progress Bar */}
        <div className="pt-2 border-t border-neutral-100">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-neutral-500 flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              <span>{event.registeredCount} / {event.capacity} registered</span>
            </span>
            <span className={`font-semibold ${isFull ? 'text-amber-600' : 'text-neutral-700'}`}>
              {isFull ? (event.waitlistEnabled ? 'Waitlist Open' : 'Capacity Full') : `${fillPercentage}% filled`}
            </span>
          </div>
          <div className="w-full bg-neutral-100 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 rounded-full ${
                isFull ? 'bg-amber-500' : fillPercentage > 85 ? 'bg-orange-500' : 'bg-red-600'
              }`}
              style={{ width: `${fillPercentage}%` }}
            />
          </div>
        </div>

        {/* Card Actions */}
        <div className="pt-1 flex items-center gap-2">
          {event.isRegistered ? (
            <button
              type="button"
              onClick={() => onOpenQR ? onOpenQR(event) : onSelect(event)}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-xs border border-emerald-200 transition-colors"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Registered • View Ticket
            </button>
          ) : isCancelled ? (
            <button
              type="button"
              disabled
              className="w-full py-2 px-3 rounded-xl bg-neutral-100 text-neutral-400 font-medium text-xs cursor-not-allowed"
            >
              Event Cancelled
            </button>
          ) : isPast ? (
            <button
              type="button"
              onClick={() => onSelect(event)}
              className="w-full py-2 px-3 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-medium text-xs transition-colors"
            >
              View Recap & Feedback
            </button>
          ) : (
            <div className="w-full grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onSelect(event)}
                className="py-2 px-3 rounded-xl border border-neutral-200 hover:bg-neutral-50 text-neutral-700 font-semibold text-xs transition-colors text-center"
              >
                Details
              </button>
              <button
                type="button"
                onClick={() => onQuickRegister ? onQuickRegister(event) : onSelect(event)}
                className="py-2 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1 shadow-sm"
              >
                <span>{isFull && event.waitlistEnabled ? 'Join Waitlist' : 'Register'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
