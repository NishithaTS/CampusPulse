import React, { useState, useEffect } from 'react';
import {
  Shield,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Users,
  Building2,
  Calendar,
  Settings,
  Flag,
  Sparkles,
  Search,
  Check,
  Award,
} from 'lucide-react';
import { EventItem, Club, User, EventReport } from '../types.ts';
import { api } from '../services/api.ts';

interface AdminDashboardViewProps {
  onSelectEvent: (event: EventItem) => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({ onSelectEvent }) => {
  const [activeTab, setActiveTab] = useState<'approvals' | 'analytics' | 'clubs' | 'users' | 'reports' | 'settings'>('approvals');
  const [analytics, setAnalytics] = useState<any>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [reports, setReports] = useState<EventReport[]>([]);
  const [settings, setSettings] = useState<any>({
    collegeName: 'KSIT',
    collegeEmailDomain: 'college.edu',
    allowExternalEmails: false,
    autoApproveVerifiedClubs: false,
    currentSemester: 'Fall 2026',
    campusName: 'Main Technology Campus',
  });

  const [loading, setLoading] = useState(true);
  const [rejectingEventId, setRejectingEventId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('Please add detailed session prerequisites and confirm faculty advisor signature.');
  const [newClubName, setNewClubName] = useState('');
  const [newClubCode, setNewClubCode] = useState('');
  const [newClubCategory, setNewClubCategory] = useState('Technical');
  const [newClubFaculty, setNewClubFaculty] = useState('Dr. Alan Turing');
  const [showAddClubModal, setShowAddClubModal] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [anData, evList, clList, uList, repList, setList] = await Promise.all([
        api.getAdminAnalytics(),
        api.getEvents({ includeAll: true }),
        api.getClubs(),
        api.getAdminUsers(),
        api.getAdminReports(),
        api.getAdminSettings(),
      ]);

      setAnalytics(anData);
      setEvents(evList);
      setClubs(clList);
      setUsers(uList);
      setReports(repList);
      if (setList) setSettings(setList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApprove = async (eventId: string, badge: string = 'official') => {
    try {
      await api.approveEvent(eventId, badge);
      setMessage('Event approved and officially published to campus directory.');
      setTimeout(() => setMessage(null), 4000);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleReject = async (eventId: string, action: 'rejected' | 'request_changes') => {
    try {
      await api.rejectEvent(eventId, rejectReason, action);
      setRejectingEventId(null);
      setMessage(action === 'request_changes' ? 'Changes requested from organizer.' : 'Event submission rejected.');
      setTimeout(() => setMessage(null), 4000);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleToggleFeature = async (eventId: string) => {
    try {
      await api.toggleFeatureEvent(eventId);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleChangeRole = async (userId: string, role: string) => {
    try {
      await api.changeUserRole(userId, role);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateClub = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createClub({
        name: newClubName,
        code: newClubCode,
        category: newClubCategory,
        facultyCoordinator: newClubFaculty,
      });
      setShowAddClubModal(false);
      setNewClubName('');
      setNewClubCode('');
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.updateAdminSettings(settings);
      setMessage('Campus configuration updated successfully.');
      setTimeout(() => setMessage(null), 3500);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const pendingEvents = events.filter((e) => e.status === 'pending_approval');

  if (loading) {
    return (
      <div className="p-12 text-center text-neutral-500">
        <div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs font-semibold">Loading administrative portal...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-extrabold text-neutral-900 tracking-tight">Dean & Admin Portal</h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
              Campus Authority
            </span>
          </div>
          <p className="text-xs sm:text-sm text-neutral-500 font-medium">
            Campus-wide event moderation, club approvals, role assignments, and security settings.
          </p>
        </div>
      </div>

      {message && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {/* Admin KPI Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-xs">
        <div className="p-3.5 bg-white rounded-2xl border border-neutral-200 shadow-2xs">
          <span className="text-[10px] text-neutral-400 font-bold uppercase block">Pending</span>
          <span className="text-xl font-black text-amber-600">{pendingEvents.length}</span>
        </div>
        <div className="p-3.5 bg-white rounded-2xl border border-neutral-200 shadow-2xs">
          <span className="text-[10px] text-neutral-400 font-bold uppercase block">Total Events</span>
          <span className="text-xl font-black text-neutral-900">{analytics?.metrics.totalEvents || 0}</span>
        </div>
        <div className="p-3.5 bg-white rounded-2xl border border-neutral-200 shadow-2xs">
          <span className="text-[10px] text-neutral-400 font-bold uppercase block">Students</span>
          <span className="text-xl font-black text-neutral-900">{analytics?.metrics.totalStudents || 0}</span>
        </div>
        <div className="p-3.5 bg-white rounded-2xl border border-neutral-200 shadow-2xs">
          <span className="text-[10px] text-neutral-400 font-bold uppercase block">Organizers</span>
          <span className="text-xl font-black text-neutral-900">{analytics?.metrics.totalOrganizers || 0}</span>
        </div>
        <div className="p-3.5 bg-white rounded-2xl border border-neutral-200 shadow-2xs">
          <span className="text-[10px] text-neutral-400 font-bold uppercase block">Clubs</span>
          <span className="text-xl font-black text-neutral-900">{clubs.length}</span>
        </div>
        <div className="p-3.5 bg-white rounded-2xl border border-neutral-200 shadow-2xs">
          <span className="text-[10px] text-neutral-400 font-bold uppercase block">Turnout Rate</span>
          <span className="text-xl font-black text-emerald-600">{analytics?.metrics.overallAttendanceRate || 0}%</span>
        </div>
        <div className="p-3.5 bg-white rounded-2xl border border-neutral-200 shadow-2xs">
          <span className="text-[10px] text-neutral-400 font-bold uppercase block">Reports</span>
          <span className="text-xl font-black text-rose-600">{reports.filter((r) => r.status === 'pending').length}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-neutral-200 bg-neutral-100 p-1.5 rounded-2xl text-xs font-bold gap-1 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('approvals')}
          className={`px-4 py-2 rounded-xl transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'approvals' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          Event Approvals ({pendingEvents.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('clubs')}
          className={`px-4 py-2 rounded-xl transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'clubs' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          Clubs & Societies ({clubs.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded-xl transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'users' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          User Roles ({users.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('reports')}
          className={`px-4 py-2 rounded-xl transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'reports' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          <Flag className="w-3.5 h-3.5" />
          Campus Reports ({reports.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 rounded-xl transition-colors whitespace-nowrap flex items-center gap-1.5 ${
            activeTab === 'settings' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          <Settings className="w-3.5 h-3.5" />
          College Settings
        </button>
      </div>

      {/* TAB CONTENT: EVENT APPROVALS */}
      {activeTab === 'approvals' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-neutral-200 shadow-sm p-5">
            <h3 className="text-base font-bold text-neutral-900 mb-1">Submissions Requiring Administrative Approval</h3>
            <p className="text-xs text-neutral-500 mb-4">
              Review event details, venue safety capacity, and attach official college verification badges.
            </p>

            {pendingEvents.length === 0 ? (
              <div className="py-12 text-center text-xs text-neutral-400 bg-neutral-50 rounded-2xl border border-neutral-100">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="font-bold text-neutral-700">All submissions reviewed!</p>
                <p>No events are currently awaiting approval.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingEvents.map((evt) => (
                  <div
                    key={evt.id}
                    className="p-4 rounded-2xl border border-neutral-200 bg-neutral-50/50 hover:bg-neutral-50 transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-neutral-900">{evt.title}</span>
                        <span className="px-2 py-0.5 rounded-md bg-neutral-200 text-neutral-700 text-[10px] font-bold">
                          {evt.category}
                        </span>
                      </div>
                      <p className="text-neutral-500 text-xs">
                        Organizer: <strong className="text-neutral-800">{evt.organizerName}</strong> • Date: {evt.date} ({evt.startTime}) • Venue: {evt.venueName}
                      </p>
                      <p className="text-neutral-600 line-clamp-1 italic">{evt.description}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => onSelectEvent(evt)}
                        className="px-3 py-1.5 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-700 font-semibold"
                      >
                        Inspect Details
                      </button>

                      <button
                        type="button"
                        onClick={() => handleApprove(evt.id, 'official')}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1 shadow-2xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Approve & Verify
                      </button>

                      <button
                        type="button"
                        onClick={() => setRejectingEventId(evt.id)}
                        className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold border border-rose-200"
                      >
                        Reject / Changes
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: CLUBS MANAGEMENT */}
      {activeTab === 'clubs' && (
        <div className="bg-white rounded-3xl border border-neutral-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-neutral-900">Campus Registered Societies</h3>
              <p className="text-xs text-neutral-500">Official student organizations recognized by college administration.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddClubModal(true)}
              className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs"
            >
              + Register New Society
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-neutral-700">
              <thead className="bg-neutral-50 border-b border-neutral-200 text-[10px] font-bold text-neutral-400 uppercase">
                <tr>
                  <th className="px-4 py-2.5">Society Name</th>
                  <th className="px-3 py-2.5">Code</th>
                  <th className="px-3 py-2.5">Category</th>
                  <th className="px-3 py-2.5">Faculty Coordinator</th>
                  <th className="px-3 py-2.5">Followers</th>
                  <th className="px-3 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 font-medium">
                {clubs.map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-3 font-bold text-neutral-900">{c.name}</td>
                    <td className="px-3 py-3 font-mono">{c.code}</td>
                    <td className="px-3 py-3">{c.category}</td>
                    <td className="px-3 py-3">{c.facultyCoordinator}</td>
                    <td className="px-3 py-3 font-bold text-neutral-700">{c.followedCount}</td>
                    <td className="px-3 py-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT: USERS & ROLES */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-3xl border border-neutral-200 shadow-sm p-5 space-y-4">
          <div>
            <h3 className="text-base font-bold text-neutral-900">Campus User Registry & Role Assignment</h3>
            <p className="text-xs text-neutral-500">
              Assign role privileges (Student, Organizer, or Dean/Admin) to campus members.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-neutral-700">
              <thead className="bg-neutral-50 border-b border-neutral-200 text-[10px] font-bold text-neutral-400 uppercase">
                <tr>
                  <th className="px-4 py-2.5">User</th>
                  <th className="px-3 py-2.5">College Email</th>
                  <th className="px-3 py-2.5">Campus</th>
                  <th className="px-3 py-2.5">Current Role</th>
                  <th className="px-4 py-2.5 text-right">Change Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 font-medium">
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="px-4 py-3 font-bold text-neutral-900">{u.name}</td>
                    <td className="px-3 py-3 font-mono text-[11px] text-neutral-600">{u.email}</td>
                    <td className="px-3 py-3">{u.campus}</td>
                    <td className="px-3 py-3">
                      <span className="px-2.5 py-0.5 rounded-md font-bold text-[10px] uppercase bg-neutral-100 text-neutral-800">
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <select
                        value={u.role}
                        onChange={(e) => handleChangeRole(u.id, e.target.value)}
                        className="px-2 py-1 rounded-lg border border-neutral-300 text-xs font-semibold outline-none bg-white"
                      >
                        <option value="student">Student</option>
                        <option value="organizer">Organizer</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT: CAMPUS REPORTS */}
      {activeTab === 'reports' && (
        <div className="bg-white rounded-3xl border border-neutral-200 shadow-sm p-5 space-y-4">
          <div>
            <h3 className="text-base font-bold text-neutral-900">Student Event Flags & Moderation Queue</h3>
            <p className="text-xs text-neutral-500">Review concerns regarding misleading schedules, unauthorized organizers, or improper events.</p>
          </div>

          {reports.length === 0 ? (
            <p className="text-xs text-neutral-400 text-center py-8">No open event reports.</p>
          ) : (
            <div className="space-y-3">
              {reports.map((rep) => (
                <div key={rep.id} className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-neutral-900 text-sm">Event: "{rep.eventTitle}"</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-800">
                      {rep.status}
                    </span>
                  </div>
                  <p className="text-rose-600 font-semibold">Flag Reason: {rep.reason}</p>
                  {rep.description && <p className="text-neutral-600 italic">"{rep.description}"</p>}
                  <div className="pt-2 flex items-center justify-between text-[11px] text-neutral-400">
                    <span>Reported by: {rep.reporterName}</span>
                    <button
                      type="button"
                      onClick={() => alert('Moderation report marked as resolved.')}
                      className="text-red-600 font-bold hover:underline"
                    >
                      Mark Resolved
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: SETTINGS */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="bg-white rounded-3xl border border-neutral-200 shadow-sm p-6 space-y-4 max-w-xl">
          <div>
            <h3 className="text-base font-bold text-neutral-900">Institution Configuration</h3>
            <p className="text-xs text-neutral-500">Configure college email restrictions and auto-approval policies.</p>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="font-bold text-neutral-700 block mb-1">College Name</label>
              <input
                type="text"
                value={settings.collegeName}
                onChange={(e) => setSettings({ ...settings, collegeName: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 font-semibold outline-none"
              />
            </div>

            <div>
              <label className="font-bold text-neutral-700 block mb-1">Official Email Domain</label>
              <input
                type="text"
                value={settings.collegeEmailDomain}
                onChange={(e) => setSettings({ ...settings, collegeEmailDomain: e.target.value })}
                placeholder="college.edu"
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 font-mono outline-none"
              />
              <p className="text-[11px] text-neutral-400 mt-0.5">Students must register with an email ending in @{settings.collegeEmailDomain}</p>
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.allowExternalEmails}
                  onChange={(e) => setSettings({ ...settings, allowExternalEmails: e.target.checked })}
                  className="w-4 h-4 text-purple-600 rounded"
                />
                <span className="font-semibold text-neutral-800">
                  Allow external email domains (e.g., for test accounts or visiting scholars)
                </span>
              </label>
            </div>

            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.autoApproveVerifiedClubs}
                  onChange={(e) => setSettings({ ...settings, autoApproveVerifiedClubs: e.target.checked })}
                  className="w-4 h-4 text-purple-600 rounded"
                />
                <span className="font-semibold text-neutral-800">
                  Auto-publish events submitted by verified student club leaders
                </span>
              </label>
            </div>
          </div>

          <div className="pt-3 border-t border-neutral-100 flex justify-end">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs"
            >
              Save Campus Policy
            </button>
          </div>
        </form>
      )}

      {/* Reject Reason Modal */}
      {rejectingEventId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3">
          <div className="bg-white rounded-3xl p-5 max-w-md w-full shadow-2xl border border-neutral-200 space-y-3 text-xs">
            <h4 className="text-base font-bold text-neutral-900">Event Feedback / Changes</h4>
            <p className="text-neutral-500">Provide specific feedback to the organizer explaining why approval cannot be granted yet.</p>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-neutral-300 outline-none"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectingEventId(null)}
                className="px-3 py-1.5 rounded-lg border border-neutral-300 text-neutral-700 font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleReject(rejectingEventId, 'request_changes')}
                className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold"
              >
                Request Changes
              </button>
              <button
                type="button"
                onClick={() => handleReject(rejectingEventId, 'rejected')}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
                Reject Outright
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Club Modal */}
      {showAddClubModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3">
          <form onSubmit={handleCreateClub} className="bg-white rounded-3xl p-5 max-w-md w-full shadow-2xl border border-neutral-200 space-y-3 text-xs">
            <h4 className="text-base font-bold text-neutral-900">Charter New Campus Society</h4>
            <div>
              <label className="font-bold text-neutral-700 block mb-1">Society Name</label>
              <input
                type="text"
                required
                placeholder="e.g. KSIT Quantum Computing Society"
                value={newClubName}
                onChange={(e) => setNewClubName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 outline-none"
              />
            </div>
            <div>
              <label className="font-bold text-neutral-700 block mb-1">Society Code</label>
              <input
                type="text"
                required
                placeholder="e.g. AQCS"
                value={newClubCode}
                onChange={(e) => setNewClubCode(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 outline-none uppercase"
              />
            </div>
            <div>
              <label className="font-bold text-neutral-700 block mb-1">Discipline</label>
              <select
                value={newClubCategory}
                onChange={(e) => setNewClubCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 outline-none"
              >
                <option value="Technical">Technical</option>
                <option value="Cultural">Cultural</option>
                <option value="Sports">Sports</option>
                <option value="Career">Career & Placement</option>
                <option value="Entrepreneurship">Entrepreneurship</option>
              </select>
            </div>
            <div>
              <label className="font-bold text-neutral-700 block mb-1">Faculty Coordinator</label>
              <input
                type="text"
                required
                value={newClubFaculty}
                onChange={(e) => setNewClubFaculty(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 outline-none"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddClubModal(false)}
                className="px-3 py-1.5 rounded-lg border border-neutral-300 text-neutral-700 font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold"
              >
                Charter Society
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
