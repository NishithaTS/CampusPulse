import React, { useState, useEffect } from 'react';
import {
  Ticket,
  Bookmark,
  Award,
  History,
  QrCode,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  ExternalLink,
  MessageSquare,
  X,
} from 'lucide-react';
import { EventItem, Certificate } from '../types.ts';
import { api } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface MyEventsViewProps {
  onSelectEvent: (event: EventItem) => void;
  onOpenQRPass: (event: EventItem) => void;
  onOpenFeedback: (event: EventItem) => void;
  onOpenCertificate: (cert: Certificate) => void;
}

export const MyEventsView: React.FC<MyEventsViewProps> = ({
  onSelectEvent,
  onOpenQRPass,
  onOpenFeedback,
  onOpenCertificate,
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'saved' | 'past' | 'certificates'>('upcoming');
  const [upcoming, setUpcoming] = useState<EventItem[]>([]);
  const [saved, setSaved] = useState<EventItem[]>([]);
  const [past, setPast] = useState<EventItem[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.getMyEvents();
      setUpcoming(res.upcoming);
      setSaved(res.saved);
      setPast(res.past);
      setCertificates(res.certificates);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleCancelRegistration = async (eventId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to cancel your pass? Your seat will be transferred to waitlisted students.')) return;
    try {
      await api.cancelRegistration(eventId);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-neutral-500 text-xs font-semibold">
        <div className="w-8 h-8 border-3 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        Loading your campus passes...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-extrabold text-neutral-900 tracking-tight">My Campus Passes & History</h2>
        <p className="text-xs sm:text-sm text-neutral-500 font-medium">
          Access your digital admission QR codes, saved events, and verified certificates.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-neutral-200 bg-neutral-100 p-1.5 rounded-2xl text-xs font-bold gap-1 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('upcoming')}
          className={`px-4 py-2 rounded-xl transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'upcoming' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          <Ticket className="w-4 h-4 text-red-600" />
          Active Passes ({upcoming.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('saved')}
          className={`px-4 py-2 rounded-xl transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'saved' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          <Bookmark className="w-4 h-4 text-rose-500" />
          Bookmarked ({saved.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('past')}
          className={`px-4 py-2 rounded-xl transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'past' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          <History className="w-4 h-4 text-neutral-500" />
          Attended & Past ({past.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('certificates')}
          className={`px-4 py-2 rounded-xl transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'certificates' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          <Award className="w-4 h-4 text-amber-500" />
          Official Certificates ({certificates.length})
        </button>
      </div>

      {/* Content */}
      <div className="space-y-4">
        {/* UPCOMING PASSES */}
        {activeTab === 'upcoming' && (
          <div>
            {upcoming.length === 0 ? (
              <div className="p-12 text-center text-neutral-400 bg-white rounded-3xl border border-neutral-200">
                <Ticket className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
                <p className="font-bold text-neutral-700 text-sm">No active passes found</p>
                <p className="text-xs text-neutral-500 mt-1">Discover upcoming events on the campus feed and register to get admission tickets.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upcoming.map((evt) => (
                  <div
                    key={evt.id}
                    className="bg-white rounded-3xl border border-neutral-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Confirmed Pass
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleCancelRegistration(evt.id, e)}
                          className="text-[11px] text-neutral-400 hover:text-rose-600 font-medium"
                        >
                          Cancel Pass
                        </button>
                      </div>

                      <h3
                        onClick={() => onSelectEvent(evt)}
                        className="text-base font-bold text-neutral-900 hover:text-red-600 cursor-pointer line-clamp-1"
                      >
                        {evt.title}
                      </h3>
                      <p className="text-xs text-neutral-500 mt-0.5">Organized by {evt.organizerName}</p>

                      <div className="mt-3 space-y-1.5 text-xs text-neutral-600 bg-neutral-50 p-3 rounded-2xl border border-neutral-100">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                          <span className="font-semibold">{evt.date} • {evt.startTime} - {evt.endTime}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-neutral-400" />
                          <span className="truncate">{evt.venueName}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-neutral-100">
                      <button
                        type="button"
                        onClick={() => onOpenQRPass(evt)}
                        className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs"
                      >
                        <QrCode className="w-4 h-4" />
                        Show QR Pass
                      </button>
                      <button
                        type="button"
                        onClick={() => onSelectEvent(evt)}
                        className="px-3.5 py-2 rounded-xl border border-neutral-300 text-neutral-700 font-semibold text-xs hover:bg-neutral-50"
                      >
                        Event Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SAVED EVENTS */}
        {activeTab === 'saved' && (
          <div>
            {saved.length === 0 ? (
              <div className="p-12 text-center text-neutral-400 bg-white rounded-3xl border border-neutral-200 text-xs">
                <Bookmark className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
                <p className="font-bold text-neutral-700 text-sm">No bookmarked events</p>
                <p className="text-neutral-500 mt-1">Tap the bookmark icon on any event card to save it for later.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {saved.map((evt) => (
                  <div
                    key={evt.id}
                    onClick={() => onSelectEvent(evt)}
                    className="bg-white rounded-3xl border border-neutral-200 p-5 shadow-sm hover:border-red-400 cursor-pointer flex items-center gap-4 group"
                  >
                    <img
                      src={evt.posterUrl}
                      alt={evt.title}
                      className="w-20 h-20 rounded-2xl object-cover border border-neutral-200 shrink-0 group-hover:scale-105 transition-transform"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider">{evt.category}</span>
                      <h4 className="text-sm font-bold text-neutral-900 truncate group-hover:text-red-600">{evt.title}</h4>
                      <p className="text-xs text-neutral-500 mt-0.5">{evt.date} • {evt.venueName}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PAST ATTENDED & RECAP */}
        {activeTab === 'past' && (
          <div>
            {past.length === 0 ? (
              <div className="p-12 text-center text-neutral-400 bg-white rounded-3xl border border-neutral-200 text-xs">
                <History className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
                <p className="font-bold text-neutral-700 text-sm">No past event history</p>
                <p className="text-neutral-500 mt-1">Events you attended and marked verification for will show up here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {past.map((evt) => (
                  <div
                    key={evt.id}
                    className="bg-white rounded-2xl border border-neutral-200 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <h4 className="font-bold text-neutral-900 text-sm">{evt.title}</h4>
                      <p className="text-neutral-500 text-xs mt-0.5">
                        Attended on {evt.date} • Organized by {evt.organizerName}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onOpenFeedback(evt)}
                        className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-semibold flex items-center gap-1"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        {evt.hasFeedback ? 'Update Feedback' : 'Give Feedback'}
                      </button>
                      <button
                        type="button"
                        onClick={() => onSelectEvent(evt)}
                        className="px-3 py-1.5 rounded-xl border border-neutral-300 text-neutral-700 font-semibold hover:bg-neutral-50"
                      >
                        View Recap
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* OFFICIAL CERTIFICATES */}
        {activeTab === 'certificates' && (
          <div>
            {certificates.length === 0 ? (
              <div className="p-12 text-center text-neutral-400 bg-white rounded-3xl border border-neutral-200 text-xs">
                <Award className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
                <p className="font-bold text-neutral-700 text-sm">No certificates issued yet</p>
                <p className="text-neutral-500 mt-1">
                  Certificates are automatically generated and awarded after your attendance is verified at events.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {certificates.map((cert) => (
                  <div
                    key={cert.id}
                    onClick={() => onOpenCertificate(cert)}
                    className="bg-white rounded-3xl border-2 border-amber-200/80 p-5 shadow-xs hover:shadow-md cursor-pointer group space-y-3 relative overflow-hidden"
                  >
                    <div className="flex items-start justify-between">
                      <div className="p-2.5 rounded-2xl bg-amber-50 text-amber-600">
                        <Award className="w-6 h-6" />
                      </div>
                      <span className="text-[10px] font-mono font-bold text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-md">
                        {cert.certificateId}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-base font-bold text-neutral-900 group-hover:text-red-600 transition-colors">
                        {cert.eventName}
                      </h4>
                      <p className="text-xs text-neutral-500 mt-0.5">Issued by {cert.collegeName} • {cert.date}</p>
                    </div>

                    <div className="pt-3 border-t border-neutral-100 flex items-center justify-between text-xs">
                      <span className="text-emerald-700 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Authenticated
                      </span>
                      <span className="text-red-600 font-bold group-hover:underline flex items-center gap-1">
                        View & Download <ExternalLink className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
