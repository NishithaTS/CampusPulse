import React, { useState, useEffect } from 'react';
import {
  X,
  QrCode,
  CheckCircle2,
  AlertTriangle,
  Users,
  Maximize2,
  Calendar,
  MapPin,
  Clock,
  Download,
  Copy,
  Check,
  ShieldCheck,
} from 'lucide-react';
import QRCode from 'qrcode';
import { EventItem } from '../types.ts';
import { api } from '../services/api.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface QRScannerModalProps {
  event: EventItem;
  mode?: 'student_pass' | 'organizer_scanner';
  onClose: () => void;
  onAttendanceMarked?: () => void;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  event,
  mode = 'student_pass',
  onClose,
  onAttendanceMarked,
}) => {
  const { user, role } = useAuth();
  const [activeTab, setActiveTab] = useState<'pass' | 'projector' | 'checkin'>(
    mode === 'organizer_scanner' ? 'projector' : 'pass'
  );

  // Student QR Pass Data
  const [studentQrDataUrl, setStudentQrDataUrl] = useState<string>('');
  const [copiedPass, setCopiedPass] = useState(false);

  // Organizer Session QR
  const [sessionQrDataUrl, setSessionQrDataUrl] = useState<string>('');
  const [sessionToken, setSessionToken] = useState<string>('');
  const [loadingSession, setLoadingSession] = useState(false);

  // Door Check-in input
  const [inputTicketCode, setInputTicketCode] = useState('');
  const [checkinStatus, setCheckinStatus] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);

  // Live roster count
  const [liveAttendedCount, setLiveAttendedCount] = useState(event.attendedCount || 0);

  // Generate Student QR Pass
  useEffect(() => {
    const generateStudentQR = async () => {
      const ticketCode = event.registrationDetails?.qrTicketCode || `CAMPUS-PASS-${event.id}-${user?.id}`;
      const payload = JSON.stringify({
        type: 'campuspulse_ticket',
        ticketCode,
        eventId: event.id,
        userId: user?.id,
        studentName: user?.name,
      });

      try {
        const url = await QRCode.toDataURL(payload, { width: 320, margin: 2 });
        setStudentQrDataUrl(url);
      } catch (err) {
        console.error('Failed to generate student QR:', err);
      }
    };

    if (user) {
      generateStudentQR();
    }
  }, [event, user]);

  // Fetch Organizer Projector Session QR
  const fetchSessionQR = async () => {
    try {
      setLoadingSession(true);
      const res = await api.getAttendanceSession(event.id);
      setSessionQrDataUrl(res.qrDataUrl);
      setSessionToken(res.token);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingSession(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'projector') {
      fetchSessionQR();
    }
  }, [activeTab]);

  // Handle Organizer manual checkin of student
  const handleCheckinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputTicketCode.trim()) return;

    try {
      setCheckingIn(true);
      setCheckinStatus(null);
      const res = await api.markAttendance(event.id, { studentTicketCode: inputTicketCode.trim() });
      if (res.success) {
        setCheckinStatus({
          type: 'success',
          text: `✓ Verified: Attendance recorded for ${res.attendance.studentName} (${res.attendance.studentId})`,
        });
        setInputTicketCode('');
        setLiveAttendedCount((prev) => prev + 1);
        if (onAttendanceMarked) onAttendanceMarked();
      }
    } catch (err: any) {
      setCheckinStatus({
        type: err.message.includes('already') ? 'warning' : 'error',
        text: err.message || 'Check-in failed. Please verify student pass.',
      });
    } finally {
      setCheckingIn(false);
    }
  };

  // Student scanning event QR simulation / direct verify
  const handleStudentSelfCheckin = async () => {
    if (!sessionToken && !event.qrSessionToken) return;
    try {
      setCheckingIn(true);
      setCheckinStatus(null);
      const res = await api.markAttendance(event.id, { qrToken: sessionToken || event.qrSessionToken });
      if (res.success) {
        setCheckinStatus({
          type: 'success',
          text: '✓ Attendance successfully verified! Thank you for joining.',
        });
        setLiveAttendedCount((prev) => prev + 1);
        if (onAttendanceMarked) onAttendanceMarked();
      }
    } catch (err: any) {
      setCheckinStatus({
        type: err.message.includes('already') ? 'warning' : 'error',
        text: err.message || 'Attendance recording failed.',
      });
    } finally {
      setCheckingIn(false);
    }
  };

  const isOrganizer = role === 'organizer' || role === 'admin' || event.organizerId === user?.id;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 overflow-y-auto">
      <div className="relative bg-white rounded-3xl shadow-2xl border border-neutral-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/70">
          <div>
            <h3 className="text-base font-bold text-neutral-900">
              {activeTab === 'pass' ? 'Digital Event Pass' : 'Attendance Control'}
            </h3>
            <p className="text-xs text-neutral-500 truncate max-w-xs">{event.title}</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-neutral-200/60 text-neutral-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher if Organizer */}
        {isOrganizer && (
          <div className="flex border-b border-neutral-200 bg-neutral-100 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('pass')}
              className={`flex-1 py-1.5 rounded-lg transition-colors ${
                activeTab === 'pass' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              My Pass
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('projector')}
              className={`flex-1 py-1.5 rounded-lg transition-colors ${
                activeTab === 'projector' ? 'bg-white text-red-700 shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Project Session QR
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('checkin')}
              className={`flex-1 py-1.5 rounded-lg transition-colors ${
                activeTab === 'checkin' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Door Check-in Desk
            </button>
          </div>
        )}

        {/* Modal Content */}
        <div className="p-5 space-y-4">
          {/* TAB 1: Student Digital Pass */}
          {activeTab === 'pass' && (
            <div className="space-y-4 text-center">
              {/* College Pass Card Design */}
              <div className="bg-gradient-to-b from-red-600 to-indigo-700 rounded-3xl p-5 text-white shadow-lg space-y-4 relative overflow-hidden">
                <div className="flex items-center justify-between border-b border-white/20 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm tracking-wider">CAMPUSPULSE PASS</span>
                    <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold">VERIFIED</span>
                  </div>
                  <ShieldCheck className="w-5 h-5 text-emerald-300" />
                </div>

                <div className="bg-white p-4 rounded-2xl shadow-inner max-w-[240px] mx-auto">
                  {studentQrDataUrl ? (
                    <img src={studentQrDataUrl} alt="QR Pass" className="w-full h-auto aspect-square object-contain" />
                  ) : (
                    <div className="w-48 h-48 flex items-center justify-center text-neutral-400">Generating QR...</div>
                  )}
                </div>

                <div>
                  <h4 className="font-bold text-base text-white">{user?.name}</h4>
                  <p className="text-xs text-red-100">
                    Roll ID: {event.registrationDetails?.studentId || '2026-ST-104'} • {event.registrationDetails?.department || 'Engineering'}
                  </p>
                </div>

                <div className="pt-3 border-t border-white/20 grid grid-cols-2 gap-2 text-left text-xs">
                  <div>
                    <span className="text-[10px] text-red-200 block uppercase">Date & Time</span>
                    <span className="font-semibold text-white">{event.date} • {event.startTime}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-red-200 block uppercase">Venue</span>
                    <span className="font-semibold text-white truncate block">{event.venueName}</span>
                  </div>
                </div>
              </div>

              {/* Simulation button for demo scan testing */}
              <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200 text-xs flex items-center justify-between gap-2">
                <div className="text-left">
                  <span className="font-bold text-neutral-800 block">At the Venue?</span>
                  <span className="text-[11px] text-neutral-500">Scan podium QR or click below to simulate verified check-in</span>
                </div>
                <button
                  type="button"
                  disabled={checkingIn}
                  onClick={handleStudentSelfCheckin}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shrink-0 disabled:opacity-50"
                >
                  {checkingIn ? 'Checking...' : 'Check-In Now'}
                </button>
              </div>

              {checkinStatus && (
                <div
                  className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 text-left ${
                    checkinStatus.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : checkinStatus.type === 'warning'
                      ? 'bg-amber-50 text-amber-800 border border-amber-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {checkinStatus.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{checkinStatus.text}</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Organizer Projector Session QR */}
          {activeTab === 'projector' && (
            <div className="space-y-4 text-center">
              <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-900 text-left">
                <p className="font-bold">🖥️ Auditorium / Entrance Display Mode</p>
                <p className="text-red-700 mt-0.5">
                  Project this QR code onto the stage screen or print at the entrance table. Attendees scan this with their CampusPulse app to verify attendance.
                </p>
              </div>

              <div className="bg-white border-2 border-neutral-200 p-4 rounded-3xl max-w-[280px] mx-auto shadow-md">
                {loadingSession ? (
                  <div className="w-64 h-64 flex items-center justify-center text-neutral-400 text-xs">
                    Generating Session QR...
                  </div>
                ) : sessionQrDataUrl ? (
                  <img src={sessionQrDataUrl} alt="Session QR" className="w-full h-auto aspect-square object-contain" />
                ) : (
                  <p className="text-xs text-neutral-500 py-12">Failed to load session QR.</p>
                )}
              </div>

              <div className="flex items-center justify-center gap-4 text-xs font-semibold text-neutral-700">
                <span className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-red-600" />
                  Live Verified: <strong className="text-neutral-950 text-sm">{liveAttendedCount}</strong> / {event.registeredCount}
                </span>
                <span className="text-neutral-300">|</span>
                <span className="text-neutral-500 truncate">Token: {sessionToken.slice(0, 16)}...</span>
              </div>
            </div>
          )}

          {/* TAB 3: Organizer Door Check-in Scanner Desk */}
          {activeTab === 'checkin' && (
            <div className="space-y-4">
              <div className="p-3 rounded-2xl bg-neutral-50 border border-neutral-200 text-xs text-neutral-700">
                <p className="font-bold text-neutral-900">Door Check-In Desk</p>
                <p className="text-neutral-500 mt-0.5">
                  Scan attendee QR pass or enter student ticket code / roll number below.
                </p>
              </div>

              <form onSubmit={handleCheckinSubmit} className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-neutral-700 block mb-1">
                    Student Pass Code or Ticket ID
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="e.g. CAMPUS-PASS-evt-..."
                      value={inputTicketCode}
                      onChange={(e) => setInputTicketCode(e.target.value)}
                      className="flex-1 px-3 py-2.5 rounded-xl border border-neutral-300 text-xs font-mono font-medium outline-none focus:ring-2 focus:ring-red-500"
                    />
                    <button
                      type="submit"
                      disabled={checkingIn || !inputTicketCode.trim()}
                      className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs disabled:opacity-50"
                    >
                      {checkingIn ? 'Verifying...' : 'Verify Entry'}
                    </button>
                  </div>
                </div>
              </form>

              {checkinStatus && (
                <div
                  className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 ${
                    checkinStatus.type === 'success'
                      ? 'bg-emerald-50 text-emerald-900 border border-emerald-300'
                      : checkinStatus.type === 'warning'
                      ? 'bg-amber-50 text-amber-900 border border-amber-300'
                      : 'bg-rose-50 text-rose-900 border border-rose-300'
                  }`}
                >
                  {checkinStatus.type === 'success' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                  )}
                  <span>{checkinStatus.text}</span>
                </div>
              )}

              <div className="pt-2 border-t border-neutral-200 flex items-center justify-between text-xs text-neutral-600">
                <span>Verified Attendance: {liveAttendedCount} students</span>
                <button
                  type="button"
                  onClick={() => {
                    // Quick sample autofill for instant testing
                    setInputTicketCode(`CAMPUS-PASS-${event.id}-${user?.id}`);
                  }}
                  className="text-red-600 font-semibold hover:underline"
                >
                  Insert Test Pass
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
