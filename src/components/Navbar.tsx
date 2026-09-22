import React, { useState, useEffect, useRef } from 'react';
import {
  Compass,
  Calendar,
  Ticket,
  Users,
  MapPin,
  Bell,
  Check,
  PlusCircle,
  Shield,
  Layers,
  LogOut,
  ChevronDown,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../services/api.ts';
import { NotificationItem, UserRole } from '../types.ts';

interface NavbarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  onOpenCreateEvent: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  onOpenCreateEvent,
}) => {
  const { user, role, logout, fastSwitchRole } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const data = await api.getNotifications();
      setNotifications(data);
    } catch (err) {
      // silent catch for unauth
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [user]);

  // Click outside listeners
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifs(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <>
      {/* Top Main Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo & Campus Badge */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onTabChange('home')}
              className="flex items-center gap-2.5 text-left focus:outline-none"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-xl shadow-md shadow-blue-500/20">
                <span className="tracking-tighter">CP</span>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-lg font-extrabold text-neutral-900 tracking-tight">CampusPulse</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Live Campus Network" />
                </div>
                <span className="text-[11px] text-neutral-500 font-medium block">Apex University • Fall 2026</span>
              </div>
            </button>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1">
            <button
              type="button"
              onClick={() => onTabChange('home')}
              className={`px-3 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                currentTab === 'home'
                  ? 'bg-neutral-100 text-neutral-900'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
              }`}
            >
              <Compass className="w-4 h-4" />
              Discover
            </button>
            <button
              type="button"
              onClick={() => onTabChange('calendar')}
              className={`px-3 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                currentTab === 'calendar'
                  ? 'bg-neutral-100 text-neutral-900'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
              }`}
            >
              <Calendar className="w-4 h-4" />
              Calendar
            </button>
            <button
              type="button"
              onClick={() => onTabChange('my-events')}
              className={`px-3 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                currentTab === 'my-events'
                  ? 'bg-neutral-100 text-neutral-900'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
              }`}
            >
              <Ticket className="w-4 h-4" />
              My Passes
            </button>
            <button
              type="button"
              onClick={() => onTabChange('clubs')}
              className={`px-3 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                currentTab === 'clubs'
                  ? 'bg-neutral-100 text-neutral-900'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
              }`}
            >
              <Users className="w-4 h-4" />
              Clubs
            </button>
            <button
              type="button"
              onClick={() => onTabChange('campus-map')}
              className={`px-3 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                currentTab === 'campus-map'
                  ? 'bg-neutral-100 text-neutral-900'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
              }`}
            >
              <MapPin className="w-4 h-4" />
              Campus Map
            </button>

            {/* Role-Specific Tabs */}
            {(role === 'organizer' || role === 'admin') && (
              <button
                type="button"
                onClick={() => onTabChange('organizer')}
                className={`px-3 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                  currentTab === 'organizer'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
                }`}
              >
                <Layers className="w-4 h-4 text-blue-600" />
                Organizer Hub
              </button>
            )}

            {role === 'admin' && (
              <button
                type="button"
                onClick={() => onTabChange('admin')}
                className={`px-3 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                  currentTab === 'admin'
                    ? 'bg-purple-50 text-purple-700 border border-purple-200'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
                }`}
              >
                <Shield className="w-4 h-4 text-purple-600" />
                Admin Portal
              </button>
            )}
          </nav>

          {/* Right Action Tools */}
          <div className="flex items-center gap-2.5">
            {/* Quick Persona Switcher for Evaluation */}
            <div className="hidden lg:flex items-center bg-neutral-100 p-1 rounded-xl border border-neutral-200 text-xs">
              <span className="px-2 font-medium text-neutral-500">Role:</span>
              {(['student', 'organizer', 'admin'] as UserRole[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => fastSwitchRole(r)}
                  className={`px-2.5 py-1 rounded-lg font-semibold capitalize transition-all ${
                    role === r
                      ? 'bg-white text-neutral-900 shadow-xs border border-neutral-200'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            {/* Create Event CTA (Organizers & Admin) */}
            {(role === 'organizer' || role === 'admin') && (
              <button
                type="button"
                onClick={onOpenCreateEvent}
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm transition-all"
              >
                <PlusCircle className="w-4 h-4" />
                Create Event
              </button>
            )}

            {/* Notifications Bell */}
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => setShowNotifs(!showNotifs)}
                className="relative p-2.5 rounded-xl hover:bg-neutral-100 text-neutral-600 transition-colors"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifs && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-neutral-200 p-3 z-50">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-100">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-sm text-neutral-900">Campus Alerts</span>
                      {unreadCount > 0 && (
                        <span className="text-[11px] bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded-full">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={handleMarkAllRead}
                        className="text-xs text-blue-600 hover:underline font-medium"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-72 overflow-y-auto space-y-2">
                    {notifications.length === 0 ? (
                      <p className="text-center py-6 text-xs text-neutral-400">No notifications at this time.</p>
                    ) : (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          className={`p-2.5 rounded-xl text-xs transition-colors border ${
                            notif.isRead
                              ? 'bg-neutral-50/50 border-neutral-100 text-neutral-600'
                              : 'bg-blue-50/70 border-blue-100 text-neutral-900 font-medium'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-bold text-neutral-900">{notif.title}</span>
                            <span className="text-[10px] text-neutral-400 shrink-0">
                              {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="mt-1 text-neutral-600 leading-relaxed">{notif.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Avatar & Menu */}
            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-neutral-100 transition-colors focus:outline-none"
              >
                <img
                  src={user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                  alt={user?.name || 'User'}
                  className="w-8 h-8 rounded-lg object-cover border border-neutral-200"
                />
                <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-neutral-200 p-3 z-50">
                  <div className="pb-3 border-b border-neutral-100 mb-2">
                    <p className="font-bold text-sm text-neutral-900 truncate">{user?.name}</p>
                    <p className="text-xs text-neutral-500 truncate">{user?.email}</p>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-neutral-100 text-neutral-700">
                        {user?.role}
                      </span>
                      <span className="text-[10px] text-neutral-400 truncate">{user?.campus}</span>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => {
                        onTabChange('my-events');
                        setShowProfileMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-neutral-700 hover:bg-neutral-50 flex items-center gap-2"
                    >
                      <Ticket className="w-3.5 h-3.5" />
                      My Registrations & Tickets
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onTabChange('clubs');
                        setShowProfileMenu(false);
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-neutral-700 hover:bg-neutral-50 flex items-center gap-2"
                    >
                      <Users className="w-3.5 h-3.5" />
                      Followed Clubs
                    </button>
                    {(role === 'organizer' || role === 'admin') && (
                      <button
                        type="button"
                        onClick={() => {
                          onTabChange('organizer');
                          setShowProfileMenu(false);
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl text-blue-700 hover:bg-blue-50 flex items-center gap-2"
                      >
                        <Layers className="w-3.5 h-3.5" />
                        Organizer Control Center
                      </button>
                    )}
                    {role === 'admin' && (
                      <button
                        type="button"
                        onClick={() => {
                          onTabChange('admin');
                          setShowProfileMenu(false);
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl text-purple-700 hover:bg-purple-50 flex items-center gap-2"
                      >
                        <Shield className="w-3.5 h-3.5" />
                        Dean / Admin Portal
                      </button>
                    )}

                    <div className="pt-2 border-t border-neutral-100">
                      <button
                        type="button"
                        onClick={() => {
                          logout();
                          setShowProfileMenu(false);
                        }}
                        className="w-full text-left px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar for Touch Devices */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-neutral-200 px-3 py-2 flex items-center justify-around shadow-lg">
        <button
          type="button"
          onClick={() => onTabChange('home')}
          className={`flex flex-col items-center gap-1 text-[10px] font-semibold ${
            currentTab === 'home' ? 'text-blue-600' : 'text-neutral-500'
          }`}
        >
          <Compass className="w-5 h-5" />
          <span>Discover</span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange('calendar')}
          className={`flex flex-col items-center gap-1 text-[10px] font-semibold ${
            currentTab === 'calendar' ? 'text-blue-600' : 'text-neutral-500'
          }`}
        >
          <Calendar className="w-5 h-5" />
          <span>Calendar</span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange('my-events')}
          className={`flex flex-col items-center gap-1 text-[10px] font-semibold ${
            currentTab === 'my-events' ? 'text-blue-600' : 'text-neutral-500'
          }`}
        >
          <Ticket className="w-5 h-5" />
          <span>Passes</span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange('clubs')}
          className={`flex flex-col items-center gap-1 text-[10px] font-semibold ${
            currentTab === 'clubs' ? 'text-blue-600' : 'text-neutral-500'
          }`}
        >
          <Users className="w-5 h-5" />
          <span>Clubs</span>
        </button>

        {(role === 'organizer' || role === 'admin') ? (
          <button
            type="button"
            onClick={() => onTabChange('organizer')}
            className={`flex flex-col items-center gap-1 text-[10px] font-semibold ${
              currentTab === 'organizer' ? 'text-blue-600' : 'text-neutral-500'
            }`}
          >
            <Layers className="w-5 h-5" />
            <span>Manage</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onTabChange('campus-map')}
            className={`flex flex-col items-center gap-1 text-[10px] font-semibold ${
              currentTab === 'campus-map' ? 'text-blue-600' : 'text-neutral-500'
            }`}
          >
            <MapPin className="w-5 h-5" />
            <span>Map</span>
          </button>
        )}
      </div>
    </>
  );
};
