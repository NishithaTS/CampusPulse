import React, { useState, useEffect } from 'react';
import {
  Layers,
  Calendar,
  Users,
  Award,
  QrCode,
  Download,
  Star,
  PlusCircle,
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  X,
  ExternalLink,
} from 'lucide-react';
import { EventItem } from '../types.ts';
import { api } from '../services/api.ts';

interface OrganizerDashboardViewProps {
  onOpenCreateEvent: () => void;
  onOpenQRScanner: (event: EventItem) => void;
  onSelectEvent: (event: EventItem) => void;
}

export const OrganizerDashboardView: React.FC<OrganizerDashboardViewProps> = ({
  onOpenCreateEvent,
  onOpenQRScanner,
  onSelectEvent,
}) => {
  const [data, setData] = useState<{
    metrics: {
      totalEvents: number;
      upcomingEvents: number;
      totalRegistrations: number;
      totalAttendance: number;
      attendanceRate: number;
      averageFeedback: number;
    };
    events: EventItem[];
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [selectedRosterEvent, setSelectedRosterEvent] = useState<EventItem | null>(null);
  const [rosterData, setRosterData] = useState<any>(null);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.getOrganizerDashboard();
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleOpenRoster = async (event: EventItem) => {
    try {
      setSelectedRosterEvent(event);
      setLoadingRoster(true);
      const res = await api.getAttendanceRoster(event.id);
      setRosterData(res);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoadingRoster(false);
    }
  };

  const handleIssueCertificates = async (eventId: string) => {
    try {
      const res = await api.issueCertificates(eventId);
      setActionMessage(res.message);
      setTimeout(() => setActionMessage(null), 4000);
      fetchDashboard();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleExportCSV = (eventTitle: string, roster: any[]) => {
    const headers = ['Student ID', 'Full Name', 'College Email', 'Department', 'Year', 'Phone', 'Status', 'Attended', 'Verification Token'];
    const rows = roster.map((r) => [
      r.studentId,
      r.studentName,
      r.studentEmail,
      r.department,
      r.year,
      r.phone,
      r.status,
      r.isPresent ? 'YES' : 'NO',
      r.verificationToken || 'N/A',
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${eventTitle.replace(/[^a-z0-9]/gi, '_')}_attendance_roster.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-neutral-500">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs font-semibold">Loading organizer dashboard...</p>
      </div>
    );
  }

  const metrics = data?.metrics || {
    totalEvents: 0,
    upcomingEvents: 0,
    totalRegistrations: 0,
    totalAttendance: 0,
    attendanceRate: 0,
    averageFeedback: 0,
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2">
        <div>
          <h2 className="text-2xl font-extrabold text-neutral-900 tracking-tight">Organizer Control Center</h2>
          <p className="text-xs sm:text-sm text-neutral-500 font-medium">
            Monitor real-time student registrations, attendance check-ins, and event certificates.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenCreateEvent}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          Create New Event
        </button>
      </div>

      {actionMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-neutral-200 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">
            Total Events Managed
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-neutral-900">{metrics.totalEvents}</span>
            <span className="text-xs text-blue-600 font-semibold">{metrics.upcomingEvents} active</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-neutral-200 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">
            Total Registrations
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-neutral-900">{metrics.totalRegistrations}</span>
            <span className="text-xs text-neutral-400 font-medium">students</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-neutral-200 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">
            Verified Attendance Rate
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-emerald-600">{metrics.attendanceRate}%</span>
            <span className="text-xs text-neutral-500 font-medium">({metrics.totalAttendance} verified)</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-neutral-200 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">
            Average Feedback Score
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-black text-amber-500">{metrics.averageFeedback}</span>
            <span className="text-xs text-neutral-400 font-medium">/ 5.0 ★</span>
          </div>
        </div>
      </div>

      {/* Events Roster Table */}
      <div className="bg-white rounded-3xl border border-neutral-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-neutral-200 flex items-center justify-between">
          <h3 className="text-base font-bold text-neutral-900">Managed Campus Events</h3>
          <span className="text-xs text-neutral-500">{data?.events.length || 0} events listed</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-neutral-700">
            <thead className="bg-neutral-50 border-b border-neutral-200 text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3">Event Title</th>
                <th className="px-4 py-3">Date & Venue</th>
                <th className="px-4 py-3">Registrations</th>
                <th className="px-4 py-3">Attendance</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 font-medium">
              {data?.events.map((evt) => (
                <tr key={evt.id} className="hover:bg-neutral-50/80 transition-colors">
                  <td className="px-5 py-3.5">
                    <div
                      onClick={() => onSelectEvent(evt)}
                      className="font-bold text-neutral-900 hover:text-blue-600 transition-colors cursor-pointer truncate max-w-xs"
                    >
                      {evt.title}
                    </div>
                    <span className="text-[11px] text-neutral-400">{evt.category}</span>
                  </td>

                  <td className="px-4 py-3.5">
                    <div className="text-neutral-800">{evt.date}</div>
                    <div className="text-[11px] text-neutral-400 truncate max-w-[160px]">{evt.venueName}</div>
                  </td>

                  <td className="px-4 py-3.5">
                    <span className="font-bold text-neutral-900">{evt.registeredCount}</span>
                    <span className="text-neutral-400"> / {evt.capacity}</span>
                  </td>

                  <td className="px-4 py-3.5">
                    <span className="font-bold text-emerald-600">{evt.attendedCount || 0}</span>
                    <span className="text-[11px] text-neutral-400 block">
                      {evt.registeredCount > 0
                        ? `${Math.round(((evt.attendedCount || 0) / evt.registeredCount) * 100)}% present`
                        : '0%'}
                    </span>
                  </td>

                  <td className="px-4 py-3.5">
                    <span
                      className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        evt.status === 'published'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : evt.status === 'pending_approval'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : evt.status === 'cancelled'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-neutral-100 text-neutral-600'
                      }`}
                    >
                      {evt.status.replace('_', ' ')}
                    </span>
                  </td>

                  <td className="px-5 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => onOpenQRScanner(evt)}
                      className="px-2.5 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-semibold text-[11px] inline-flex items-center gap-1"
                      title="Open Live Attendance Scanner & Projector"
                    >
                      <QrCode className="w-3.5 h-3.5 text-blue-600" />
                      QR Check-In
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenRoster(evt)}
                      className="px-2.5 py-1 rounded-lg border border-neutral-300 hover:bg-neutral-100 text-neutral-700 font-semibold text-[11px] inline-flex items-center gap-1"
                      title="View Attendee List"
                    >
                      <Users className="w-3.5 h-3.5" />
                      Roster
                    </button>

                    <button
                      type="button"
                      onClick={() => handleIssueCertificates(evt.id)}
                      className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-[11px] inline-flex items-center gap-1"
                      title="Issue Certificates to Attendees"
                    >
                      <Award className="w-3.5 h-3.5 text-blue-600" />
                      Certificates
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Attendee Roster Modal */}
      {selectedRosterEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 overflow-y-auto">
          <div className="relative bg-white rounded-3xl shadow-2xl border border-neutral-200 max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/80">
              <div>
                <h3 className="text-base font-bold text-neutral-900">Attendee Roster & Check-In Record</h3>
                <p className="text-xs text-neutral-500 truncate max-w-md">{selectedRosterEvent.title}</p>
              </div>
              <div className="flex items-center gap-2">
                {rosterData && (
                  <button
                    type="button"
                    onClick={() => handleExportCSV(selectedRosterEvent.title, rosterData.roster)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    Export CSV
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedRosterEvent(null)}
                  className="p-2 rounded-xl hover:bg-neutral-200 text-neutral-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              {loadingRoster ? (
                <div className="p-12 text-center text-xs text-neutral-500">Loading attendee records...</div>
              ) : rosterData ? (
                <>
                  <div className="grid grid-cols-3 gap-3 text-center text-xs">
                    <div className="p-3 rounded-2xl bg-neutral-50 border border-neutral-200">
                      <span className="text-neutral-400 block text-[10px] uppercase font-bold">Total Registered</span>
                      <span className="text-lg font-extrabold text-neutral-900">{rosterData.totalRegistered}</span>
                    </div>
                    <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200">
                      <span className="text-emerald-700 block text-[10px] uppercase font-bold">Present (Verified)</span>
                      <span className="text-lg font-extrabold text-emerald-800">{rosterData.totalPresent}</span>
                    </div>
                    <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200">
                      <span className="text-blue-700 block text-[10px] uppercase font-bold">Turnout Rate</span>
                      <span className="text-lg font-extrabold text-blue-800">{rosterData.attendanceRate}%</span>
                    </div>
                  </div>

                  <div className="overflow-x-auto border border-neutral-200 rounded-2xl">
                    <table className="w-full text-left text-xs text-neutral-700">
                      <thead className="bg-neutral-50 border-b border-neutral-200 text-[10px] font-bold text-neutral-400 uppercase">
                        <tr>
                          <th className="px-4 py-2.5">Student</th>
                          <th className="px-3 py-2.5">Roll ID</th>
                          <th className="px-3 py-2.5">Department</th>
                          <th className="px-3 py-2.5">Attendance</th>
                          <th className="px-3 py-2.5">Verification Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100 font-medium">
                        {rosterData.roster.map((r: any) => (
                          <tr key={r.registrationId} className="hover:bg-neutral-50">
                            <td className="px-4 py-2.5">
                              <span className="font-bold text-neutral-900 block">{r.studentName}</span>
                              <span className="text-[11px] text-neutral-400">{r.studentEmail}</span>
                            </td>
                            <td className="px-3 py-2.5 font-mono text-[11px]">{r.studentId}</td>
                            <td className="px-3 py-2.5">{r.department}</td>
                            <td className="px-3 py-2.5">
                              {r.isPresent ? (
                                <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-[11px]">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Present
                                </span>
                              ) : (
                                <span className="text-neutral-400 text-[11px]">Not marked</span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-neutral-500 text-[11px]">
                              {r.markedAt ? new Date(r.markedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
