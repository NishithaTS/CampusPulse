import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Users,
  ShieldCheck,
  Bookmark,
  Share2,
  CheckCircle2,
  AlertTriangle,
  Award,
  MessageSquare,
  QrCode,
  Download,
  Flag,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { EventItem } from '../types.ts';
import { api } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface EventDetailsModalProps {
  eventId: string;
  onClose: () => void;
  onOpenQRPass: (event: EventItem) => void;
  onOpenFeedback: (event: EventItem) => void;
  onNavigateToVenue?: (venueId: string) => void;
  onRefreshList?: () => void;
}

export const EventDetailsModal: React.FC<EventDetailsModalProps> = ({
  eventId,
  onClose,
  onOpenQRPass,
  onOpenFeedback,
  onNavigateToVenue,
  onRefreshList,
}) => {
  const { user, profile } = useAuth();
  const [event, setEvent] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [showRegForm, setShowRegForm] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('Misleading information');
  const [reportNotes, setReportNotes] = useState('');
  const [feedbackSummary, setFeedbackSummary] = useState<any>(null);

  // Registration form state
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    studentId: profile?.studentId || '2026-ST-104',
    department: profile?.department || 'Computer Science & Engineering',
    year: profile?.year || '2nd Year',
    phone: profile?.phone || '',
    customData: {} as Record<string, any>,
  });

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchEvent = async () => {
    try {
      setLoading(true);
      const data = await api.getEvent(eventId);
      setEvent(data);

      if (data.status === 'completed' || data.hasAttended) {
        const fb = await api.getFeedback(eventId).catch(() => null);
        setFeedbackSummary(fb);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to load event details.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvent();
  }, [eventId]);

  const handleToggleSave = async () => {
    if (!event) return;
    try {
      const res = await api.toggleSaveEvent(event.id);
      setEvent((prev) => (prev ? { ...prev, isSaved: res.isSaved } : null));
      if (onRefreshList) onRefreshList();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) return;

    try {
      setRegistering(true);
      setMessage(null);
      await api.registerForEvent(event.id, formData);
      setMessage({ type: 'success', text: 'Registration confirmed! Your QR pass has been generated.' });
      setShowRegForm(false);
      await fetchEvent();
      if (onRefreshList) onRefreshList();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to complete registration.' });
    } finally {
      setRegistering(false);
    }
  };

  const handleCancelRegistration = async () => {
    if (!event || !confirm('Are you sure you want to cancel your registration? Your seat will be given to the waitlist.')) {
      return;
    }
    try {
      await api.cancelRegistration(event.id);
      setMessage({ type: 'success', text: 'Your registration has been cancelled.' });
      await fetchEvent();
      if (onRefreshList) onRefreshList();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!event) return;
    try {
      await api.reportEvent(event.id, reportReason, reportNotes);
      setShowReportModal(false);
      alert('Thank you. Your report has been submitted to campus moderators for review.');
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Google Calendar Link generator
  const getGoogleCalendarUrl = () => {
    if (!event) return '#';
    const startIso = `${event.date.replace(/-/g, '')}T${event.startTime.replace(/:/g, '')}00`;
    const endIso = `${event.date.replace(/-/g, '')}T${event.endTime.replace(/:/g, '')}00`;
    const title = encodeURIComponent(event.title);
    const details = encodeURIComponent(`${event.description}\n\nOrganized by: ${event.organizerName}`);
    const location = encodeURIComponent(event.venueName || 'Campus Venue');
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startIso}/${endIso}&details=${details}&location=${location}`;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center space-y-3">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-neutral-700">Loading campus event...</p>
        </div>
      </div>
    );
  }

  if (!event) return null;

  const isFull = event.registeredCount >= event.capacity;
  const isCancelled = event.status === 'cancelled';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div
        id={`event-details-modal-${event.id}`}
        className="relative bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-neutral-200 max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Sticky Header with Close and Actions */}
        <div className="sticky top-0 z-20 flex items-center justify-between px-4 sm:px-6 py-3.5 bg-white/95 backdrop-blur-md border-b border-neutral-200">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
              {event.category}
            </span>
            {event.verificationBadge === 'official' && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5" />
                Dean Verified
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleToggleSave}
              className={`p-2 rounded-xl transition-colors ${
                event.isSaved ? 'bg-rose-50 text-rose-600' : 'hover:bg-neutral-100 text-neutral-600'
              }`}
              title="Save event"
            >
              <Bookmark className={`w-4 h-4 ${event.isSaved ? 'fill-current text-rose-600' : ''}`} />
            </button>
            <button
              type="button"
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: event.title, url: window.location.href }).catch(() => {});
                } else {
                  navigator.clipboard.writeText(window.location.href);
                  alert('Event link copied to clipboard!');
                }
              }}
              className="p-2 rounded-xl hover:bg-neutral-100 text-neutral-600 transition-colors"
              title="Share event"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setShowReportModal(true)}
              className="p-2 rounded-xl hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition-colors"
              title="Report event"
            >
              <Flag className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-neutral-100 text-neutral-600 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-6">
          {message && (
            <div
              className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                message.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-rose-600" />}
              <span>{message.text}</span>
            </div>
          )}

          {/* Hero Banner Visual */}
          <div className="relative aspect-[21/9] sm:aspect-[2/1] w-full rounded-2xl overflow-hidden bg-neutral-100 border border-neutral-200">
            <img src={event.posterUrl} alt={event.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 text-white">
              <span className="text-xs font-medium text-blue-200 mb-1 block">Organized by {event.organizerName}</span>
              <h2 className="text-xl sm:text-2xl font-black leading-tight drop-shadow-sm">{event.title}</h2>
            </div>
          </div>

          {/* Key Logistics Matrix */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200/80 flex items-start gap-3">
              <div className="p-2 rounded-xl bg-blue-100/80 text-blue-700 shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Date & Time</p>
                <p className="text-xs sm:text-sm font-bold text-neutral-900 mt-0.5">
                  {new Date(event.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
                <p className="text-xs text-neutral-600 mt-0.5 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-neutral-400" />
                  {event.startTime} - {event.endTime}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200/80 flex items-start gap-3">
              <div className="p-2 rounded-xl bg-purple-100/80 text-purple-700 shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Venue Location</p>
                <p className="text-xs sm:text-sm font-bold text-neutral-900 mt-0.5 truncate">{event.venueName}</p>
                {onNavigateToVenue && event.venueId && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onNavigateToVenue(event.venueId);
                    }}
                    className="text-xs text-blue-600 font-medium hover:underline mt-1 flex items-center gap-1"
                  >
                    Locate on Campus Map <ChevronRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200/80 flex items-start gap-3">
              <div className="p-2 rounded-xl bg-emerald-100/80 text-emerald-700 shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Participation</p>
                <p className="text-xs sm:text-sm font-bold text-neutral-900 mt-0.5">
                  {event.registeredCount} / {event.capacity} Registered
                </p>
                <p className="text-xs text-neutral-600 mt-0.5">
                  {event.isPaid ? `Entry Fee: $${event.feeAmount}` : 'Free Admission'}
                </p>
              </div>
            </div>
          </div>

          {/* Student's Current Registration Status Banner */}
          {event.isRegistered && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-emerald-950">You are registered for this event!</h4>
                  <p className="text-xs text-emerald-700">
                    Status: <span className="font-semibold uppercase">{event.registrationDetails?.status || 'Confirmed'}</span> • Pass ID: {event.registrationDetails?.qrTicketCode?.slice(0, 18)}...
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => onOpenQRPass(event)}
                  className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <QrCode className="w-4 h-4" />
                  Show Digital Pass
                </button>
                <a
                  href={getGoogleCalendarUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 rounded-xl border border-emerald-300 bg-white hover:bg-emerald-100 text-emerald-800 font-semibold text-xs transition-colors flex items-center gap-1"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  Add to Calendar
                </a>
                <button
                  type="button"
                  onClick={handleCancelRegistration}
                  className="p-2 rounded-xl hover:bg-rose-100 text-rose-600 transition-colors text-xs font-semibold"
                  title="Cancel Registration"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Post-Event Attendance & Certificate / Feedback Status */}
          {event.hasAttended && (
            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-blue-950">Attendance Verified ✓</h4>
                  <p className="text-xs text-blue-700">Your presence was recorded. You can now download your certificate.</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {!event.hasFeedback && (
                  <button
                    type="button"
                    onClick={() => onOpenFeedback(event)}
                    className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-1.5"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Submit Feedback
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <h4 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">About This Event</h4>
            <div className="text-neutral-700 text-sm leading-relaxed whitespace-pre-line bg-white rounded-2xl p-4 border border-neutral-100">
              {event.description}
            </div>
          </div>

          {/* Speaker Profile Section */}
          {event.speaker && event.speaker.name && (
            <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200">
              <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3">Featured Speaker</h4>
              <div className="flex items-center gap-3.5">
                <img
                  src={event.speaker.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                  alt={event.speaker.name}
                  className="w-12 h-12 rounded-xl object-cover border border-neutral-300 shadow-xs"
                />
                <div>
                  <h5 className="text-sm font-bold text-neutral-900">{event.speaker.name}</h5>
                  <p className="text-xs text-blue-600 font-semibold">{event.speaker.role}</p>
                  {event.speaker.topic && (
                    <p className="text-xs text-neutral-600 mt-0.5">Session: "{event.speaker.topic}"</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Guidelines & Entry Requirements */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200">
              <span className="font-bold text-neutral-700 block mb-1">Eligibility Criteria</span>
              <p className="text-neutral-600">{event.eligibility || 'Open to all enrolled students with campus ID.'}</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200">
              <span className="font-bold text-neutral-700 block mb-1">Entry Requirements</span>
              <p className="text-neutral-600">{event.entryRequirements || 'Show digital QR pass on CampusPulse app at venue entrance.'}</p>
            </div>
          </div>

          {/* Tags */}
          {event.tags && event.tags.length > 0 && (
            <div>
              <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider block mb-2">Tags</span>
              <div className="flex flex-wrap gap-1.5">
                {event.tags.map((t, idx) => (
                  <span key={idx} className="px-2.5 py-1 rounded-lg text-xs font-medium bg-neutral-100 text-neutral-700">
                    #{t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Reviews & Feedback Preview */}
          {feedbackSummary && feedbackSummary.count > 0 && (
            <div className="pt-3 border-t border-neutral-200">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                  Attendee Feedback ({feedbackSummary.count} reviews)
                </h4>
                <div className="flex items-center gap-1 text-amber-600 font-bold text-sm">
                  <span>★ {feedbackSummary.averages.overall}</span>
                  <span className="text-neutral-400 text-xs font-normal">/ 5.0</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 text-center text-xs">
                <div className="p-2 rounded-xl bg-neutral-50 border border-neutral-100">
                  <span className="text-neutral-500 text-[10px] block">Content</span>
                  <span className="font-bold text-neutral-800">{feedbackSummary.averages.content || '4.8'} ★</span>
                </div>
                <div className="p-2 rounded-xl bg-neutral-50 border border-neutral-100">
                  <span className="text-neutral-500 text-[10px] block">Speaker</span>
                  <span className="font-bold text-neutral-800">{feedbackSummary.averages.speaker || '4.9'} ★</span>
                </div>
                <div className="p-2 rounded-xl bg-neutral-50 border border-neutral-100">
                  <span className="text-neutral-500 text-[10px] block">Organization</span>
                  <span className="font-bold text-neutral-800">{feedbackSummary.averages.organization || '4.7'} ★</span>
                </div>
                <div className="p-2 rounded-xl bg-neutral-50 border border-neutral-100">
                  <span className="text-neutral-500 text-[10px] block">Venue</span>
                  <span className="font-bold text-neutral-800">{feedbackSummary.averages.venue || '4.8'} ★</span>
                </div>
              </div>
            </div>
          )}

          {/* Registration Form Expansion */}
          {showRegForm && !event.isRegistered && (
            <form onSubmit={handleRegisterSubmit} className="p-4 sm:p-5 rounded-2xl bg-blue-50/70 border border-blue-200 space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-blue-100">
                <h4 className="text-sm font-bold text-neutral-900">Confirm Registration Details</h4>
                <span className="text-xs text-neutral-500">Auto-filled from college profile</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-neutral-300 text-neutral-900 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">College Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-neutral-300 text-neutral-900 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">Student Roll / ID</label>
                  <input
                    type="text"
                    required
                    value={formData.studentId}
                    onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-neutral-300 text-neutral-900 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">Department</label>
                  <input
                    type="text"
                    required
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-neutral-300 text-neutral-900 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Dynamic Custom Questions created by Organizer */}
              {event.customFields && event.customFields.length > 0 && (
                <div className="pt-2 border-t border-blue-100 space-y-2.5">
                  <p className="text-xs font-bold text-neutral-800">Organizer Questionnaire</p>
                  {event.customFields.map((field) => (
                    <div key={field.id} className="text-xs">
                      <label className="font-semibold text-neutral-700 block mb-1">
                        {field.label} {field.required && <span className="text-rose-500">*</span>}
                      </label>
                      {field.type === 'select' ? (
                        <select
                          required={field.required}
                          value={formData.customData[field.id] || ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              customData: { ...formData.customData, [field.id]: e.target.value },
                            })
                          }
                          className="w-full px-3 py-2 rounded-xl bg-white border border-neutral-300 text-neutral-900 text-xs outline-none"
                        >
                          <option value="">Select an option</option>
                          {field.options?.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          required={field.required}
                          value={formData.customData[field.id] || ''}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              customData: { ...formData.customData, [field.id]: e.target.value },
                            })
                          }
                          placeholder={`Enter ${field.label.toLowerCase()}`}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-neutral-300 text-neutral-900 text-xs outline-none"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRegForm(false)}
                  className="px-3.5 py-2 rounded-xl border border-neutral-300 text-neutral-700 font-semibold text-xs hover:bg-neutral-100 transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={registering}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors shadow-sm disabled:opacity-50"
                >
                  {registering ? 'Securing Pass...' : isFull ? 'Confirm Waitlist Spot' : 'Confirm Free Registration'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Modal Sticky Footer CTA */}
        <div className="sticky bottom-0 z-20 px-4 sm:px-6 py-3.5 bg-neutral-50/95 backdrop-blur-md border-t border-neutral-200 flex items-center justify-between gap-3">
          <div className="text-xs">
            <span className="text-neutral-500 block">Admission</span>
            <span className="text-sm font-bold text-neutral-900">
              {event.isPaid ? `$${event.feeAmount}` : 'Free Entry'}
            </span>
          </div>

          {!event.isRegistered && !isCancelled && (
            <div>
              {!showRegForm ? (
                <button
                  type="button"
                  onClick={() => setShowRegForm(true)}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-sm transition-all"
                >
                  {isFull && event.waitlistEnabled ? 'Join Waitlist' : 'Register Now'}
                </button>
              ) : (
                <span className="text-xs text-blue-600 font-medium">Complete form above</span>
              )}
            </div>
          )}

          {event.isRegistered && (
            <button
              type="button"
              onClick={() => onOpenQRPass(event)}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1.5"
            >
              <QrCode className="w-4 h-4" />
              View Digital Pass
            </button>
          )}
        </div>
      </div>

      {/* Report Event Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-2xl border border-neutral-200 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-neutral-900">Report Campus Event</h3>
              <button type="button" onClick={() => setShowReportModal(false)}>
                <X className="w-4 h-4 text-neutral-400" />
              </button>
            </div>
            <p className="text-xs text-neutral-600">
              Help maintain a trusted campus directory. Our moderation team reviews every flag.
            </p>
            <form onSubmit={handleReportSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-neutral-700 block mb-1">Reason</label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs outline-none"
                >
                  <option value="Misleading information">Misleading date, time, or venue</option>
                  <option value="Fake or unauthorized organizer">Fake or unauthorized organizer</option>
                  <option value="Inappropriate content">Inappropriate or prohibited campus event</option>
                  <option value="Spam or duplicate">Duplicate or spam listing</option>
                </select>
              </div>
              <div>
                <label className="font-semibold text-neutral-700 block mb-1">Additional Context (Optional)</label>
                <textarea
                  rows={3}
                  value={reportNotes}
                  onChange={(e) => setReportNotes(e.target.value)}
                  placeholder="Explain why this event should be reviewed..."
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 text-xs outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-neutral-300 text-neutral-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold"
                >
                  Submit Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
