import React, { useState, useEffect } from 'react';
import {
  Search,
  Sparkles,
  Filter,
  Calendar,
  MapPin,
  Flame,
  Award,
  Coffee,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  Compass,
} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { EventCard } from './components/EventCard.tsx';
import { EventDetailsModal } from './components/EventDetailsModal.tsx';
import { CreateEventModal } from './components/CreateEventModal.tsx';
import { QRScannerModal } from './components/QRScannerModal.tsx';
import { FeedbackModal } from './components/FeedbackModal.tsx';
import { CertificateModal } from './components/CertificateModal.tsx';
import { CalendarView } from './components/CalendarView.tsx';
import { CampusMapView } from './components/CampusMapView.tsx';
import { ClubsView } from './components/ClubsView.tsx';
import { MyEventsView } from './components/MyEventsView.tsx';
import { OrganizerDashboardView } from './components/OrganizerDashboardView.tsx';
import { AdminDashboardView } from './components/AdminDashboardView.tsx';
import { EventItem, Certificate } from './types.ts';
import { api } from './services/api.ts';
import AnimatedGradient from './components/AnimatedGradient.tsx';

const CATEGORIES = [
  'All',
  'Technical',
  'Workshops',
  'Cultural',
  'Sports',
  'Career',
  'Hackathons',
];

const DEPARTMENTS = [
  'All Departments',
  'Computer Science',
  'Electronics & Comm.',
  'Mechanical',
  'Management & MBA',
  'Arts & Design',
];

function MainContent() {
  const { user, role } = useAuth();

  // Navigation State
  const [currentView, setCurrentView] = useState<
    'discover' | 'calendar' | 'map' | 'clubs' | 'my_events' | 'organizer_dashboard' | 'admin_dashboard'
  >('discover');

  // Discover Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedDepartment, setSelectedDepartment] = useState('All Departments');
  const [filterOnlyFreeFood, setFilterOnlyFreeFood] = useState(false);
  const [filterCertificates, setFilterCertificates] = useState(false);
  const [filterFeatured, setFilterFeatured] = useState(false);

  // Events Data
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  // Modals
  const [selectedEventForDetails, setSelectedEventForDetails] = useState<EventItem | null>(null);
  const [selectedEventForQR, setSelectedEventForQR] = useState<EventItem | null>(null);
  const [qrMode, setQrMode] = useState<'student_pass' | 'organizer_scanner'>('student_pass');
  const [selectedEventForFeedback, setSelectedEventForFeedback] = useState<EventItem | null>(null);
  const [selectedCertificate, setSelectedCertificate] = useState<Certificate | null>(null);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [showCreateEventModal, setShowCreateEventModal] = useState(false);

  const fetchEvents = async () => {
    try {
      setLoadingEvents(true);
      const res = await api.getEvents({
        category: selectedCategory !== 'All' ? selectedCategory : undefined,
        department: selectedDepartment !== 'All Departments' ? selectedDepartment : undefined,
        search: searchQuery || undefined,
        featured: filterFeatured ? true : undefined,
      });
      setEvents(res);
    } catch (err) {
      console.error('Failed to fetch events:', err);
    } finally {
      setLoadingEvents(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [selectedCategory, selectedDepartment, searchQuery, filterFeatured, user]);

  const handleToggleSave = async (event: EventItem) => {
    try {
      const res = await api.toggleSaveEvent(event.id);
      setEvents((prev) =>
        prev.map((e) => (e.id === event.id ? { ...e, isSaved: res.isSaved } : e))
      );
      if (selectedEventForDetails?.id === event.id) {
        setSelectedEventForDetails((prev) => (prev ? { ...prev, isSaved: res.isSaved } : null));
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Filter local attributes like Free Food & Certificates
  const displayedEvents = events.filter((e) => {
    if (
      filterOnlyFreeFood &&
      !e.tags?.some((t) => t.toLowerCase().includes('food') || t.toLowerCase().includes('refreshment'))
    ) {
      return false;
    }
    if (
      filterCertificates &&
      !e.certificateOffered &&
      !e.tags?.some((t) => t.toLowerCase().includes('cert'))
    ) {
      return false;
    }
    return true;
  });

  const featuredEvents = events.filter((e) => e.isFeatured);

  return (
    <div className="min-h-screen bg-[#fff8f2] text-[#171313] flex flex-col antialiased">
      {/* Top Navbar */}
      <Navbar
        currentTab={currentView}
        onTabChange={(tab) => setCurrentView(tab as any)}
        onOpenCreateEvent={() => setShowCreateEventModal(true)}
      />

      {/* Main App Canvas */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* VIEW 1: DISCOVER EVENTS */}
        {currentView === 'discover' && (
          <div className="space-y-6">
            <section className="relative isolate min-h-[430px] overflow-hidden rounded-[2rem] bg-[#8f1515] text-white shadow-2xl shadow-red-950/20">
              <AnimatedGradient
                config={{
                  preset: 'custom',
                  color1: '#4b0707',
                  color2: '#a91414',
                  color3: '#ff6a4d',
                  rotation: -38,
                  proportion: 58,
                  scale: 0.62,
                  speed: 12,
                  distortion: 32,
                  swirl: 68,
                  swirlIterations: 9,
                  softness: 88,
                  shape: 'Edge',
                  shapeSize: 42,
                }}
                noise={{ opacity: 0.18, scale: 0.7 }}
                className="-z-10 opacity-95"
              />
              <div className="absolute inset-0 -z-10 bg-gradient-to-br from-black/35 via-transparent to-red-950/30" />
              <div className="relative flex min-h-[430px] flex-col justify-between p-6 sm:p-10 lg:p-14">
                <div className="flex items-start justify-between gap-6 text-[11px] font-bold uppercase tracking-[0.24em] text-white/75">
                  <span>CampusPulse / KSIT</span>
                  <span className="hidden sm:block">Fall 2026 / Live Network</span>
                </div>
                <div className="max-w-4xl">
                  <p className="mb-5 text-xs font-bold uppercase tracking-[0.3em] text-orange-100">When campus life needs space</p>
                  <h1 className="max-w-3xl text-5xl font-black leading-[0.9] tracking-[-0.06em] sm:text-7xl lg:text-[7.5rem]">
                    Find your<br />next moment.
                  </h1>
                  <p className="mt-7 max-w-xl text-sm leading-6 text-white/80 sm:text-base">
                    The live pulse of KSIT — discover events, meet your people, and make every week count.
                  </p>
                </div>
                <div className="flex flex-wrap items-end justify-between gap-6 border-t border-white/25 pt-5 text-xs font-bold uppercase tracking-[0.18em] text-white/75">
                  <span>Scroll to explore</span>
                  <span>01 / 04 — Discover</span>
                </div>
              </div>
            </section>

            {/* Hero / Filter Section */}
            <div className="bg-[#fffdfb] rounded-3xl p-5 sm:p-7 border border-[#eaded7]/90 shadow-xs space-y-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#b51f1a] bg-[#fff0eb] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      Live Campus Feed
                    </span>
                    <span className="text-xs text-neutral-400">• Main Campus (Fall 2026)</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-neutral-900 mt-1">
                    Discover Campus Life & Events
                  </h1>
                </div>

                {/* Search Bar */}
                <div className="relative max-w-md w-full">
                  <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search hackathons, workshops, guest lectures, sports..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-neutral-50 border border-[#eaded7] text-xs sm:text-sm font-medium outline-none focus:bg-[#fffdfb] focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400 hover:text-neutral-600"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Category Pills & Quick Filter Badges */}
              <div className="space-y-3 pt-2 border-t border-neutral-100">
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                        selectedCategory === cat
                          ? 'bg-neutral-900 text-white shadow-xs scale-102'
                          : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Secondary Filters: Department, Refreshments, Certificates */}
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                  <select
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-neutral-300 text-xs bg-[#fffdfb] text-neutral-700 outline-none"
                  >
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => setFilterFeatured(!filterFeatured)}
                    className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition-colors ${
                      filterFeatured
                        ? 'bg-amber-500 text-white border-amber-500 shadow-2xs'
                        : 'border-neutral-300 text-neutral-600 bg-[#fffdfb] hover:bg-neutral-50'
                    }`}
                  >
                    <Flame className="w-3.5 h-3.5" />
                    Featured Only
                  </button>

                  <button
                    type="button"
                    onClick={() => setFilterOnlyFreeFood(!filterOnlyFreeFood)}
                    className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition-colors ${
                      filterOnlyFreeFood
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                        : 'border-neutral-300 text-neutral-600 bg-[#fffdfb] hover:bg-neutral-50'
                    }`}
                  >
                    <Coffee className="w-3.5 h-3.5" />
                    Free Food / Snacks
                  </button>

                  <button
                    type="button"
                    onClick={() => setFilterCertificates(!filterCertificates)}
                    className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition-colors ${
                      filterCertificates
                        ? 'bg-[#c52a22] text-white border-red-600 shadow-2xs'
                        : 'border-neutral-300 text-neutral-600 bg-[#fffdfb] hover:bg-neutral-50'
                    }`}
                  >
                    <Award className="w-3.5 h-3.5" />
                    Certificates Offered
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCertificate(null);
                      setShowCertificateModal(true);
                    }}
                    className="ml-auto text-xs text-neutral-500 hover:text-[#b51f1a] font-bold underline"
                  >
                    Verify a Certificate ID
                  </button>
                </div>
              </div>
            </div>

            {/* Featured Highlights (if any exist and not filtering out) */}
            {featuredEvents.length > 0 && selectedCategory === 'All' && !searchQuery && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <h3 className="text-sm font-black uppercase tracking-wider text-neutral-700">
                    Campus Spotlight & Flagship Events
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {featuredEvents.slice(0, 2).map((fe) => (
                    <div
                      key={`feat-${fe.id}`}
                      onClick={() => setSelectedEventForDetails(fe)}
                      className="bg-gradient-to-r from-neutral-900 to-neutral-800 rounded-3xl p-5 text-white flex flex-col sm:flex-row gap-5 items-center cursor-pointer shadow-lg hover:scale-[1.01] transition-transform border border-neutral-700"
                    >
                      <img
                        src={fe.posterUrl}
                        alt={fe.title}
                        className="w-full sm:w-36 h-36 rounded-2xl object-cover shrink-0 border border-white/10"
                      />
                      <div className="space-y-2 flex-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-400 text-neutral-950 px-2 py-0.5 rounded-md">
                          Flagship Event
                        </span>
                        <h4 className="text-lg font-bold leading-snug">{fe.title}</h4>
                        <p className="text-xs text-neutral-300 line-clamp-2">{fe.description}</p>
                        <div className="pt-2 flex items-center justify-between text-xs text-neutral-400">
                          <span>{fe.date} • {fe.venueName}</span>
                          <span className="text-amber-300 font-bold">Register Now →</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Main Events Grid */}
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-bold text-neutral-500">
                <span>Showing {displayedEvents.length} upcoming campus events</span>
                <span>Sorted by Date (Chronological)</span>
              </div>

              {loadingEvents ? (
                <div className="p-16 text-center text-neutral-400">
                  <div className="w-8 h-8 border-3 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-xs font-semibold">Loading verified campus events...</p>
                </div>
              ) : displayedEvents.length === 0 ? (
                <div className="p-16 text-center bg-[#fffdfb] rounded-3xl border border-[#eaded7]">
                  <Compass className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-neutral-800">No events found matching your criteria</h3>
                  <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
                    Try adjusting your department filter, keywords, or browse all categories to explore upcoming campus activities.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory('All');
                      setSelectedDepartment('All Departments');
                      setSearchQuery('');
                      setFilterOnlyFreeFood(false);
                      setFilterCertificates(false);
                      setFilterFeatured(false);
                    }}
                    className="mt-4 px-4 py-2 rounded-xl bg-[#c52a22] hover:bg-[#9f1e19] text-white text-xs font-bold shadow-xs"
                  >
                    Reset All Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {displayedEvents.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onSelect={(e) => setSelectedEventForDetails(e)}
                      onToggleSave={(e) => handleToggleSave(e)}
                      onOpenQR={(e) => {
                        setSelectedEventForQR(e);
                        setQrMode('student_pass');
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW 2: CALENDAR VIEW */}
        {currentView === 'calendar' && (
          <CalendarView
            events={events}
            onSelectEvent={(evt) => setSelectedEventForDetails(evt)}
          />
        )}

        {/* VIEW 3: CAMPUS MAP */}
        {currentView === 'map' && (
          <CampusMapView
            events={events}
            onSelectEvent={(evt) => setSelectedEventForDetails(evt)}
          />
        )}

        {/* VIEW 4: CLUBS & SOCIETIES */}
        {currentView === 'clubs' && (
          <ClubsView
            onSelectEvent={(evt) => setSelectedEventForDetails(evt)}
          />
        )}

        {/* VIEW 5: MY PASSES & HISTORY */}
        {currentView === 'my_events' && (
          <MyEventsView
            onSelectEvent={(evt) => setSelectedEventForDetails(evt)}
            onOpenQRPass={(evt) => {
              setSelectedEventForQR(evt);
              setQrMode('student_pass');
            }}
            onOpenFeedback={(evt) => setSelectedEventForFeedback(evt)}
            onOpenCertificate={(cert) => {
              setSelectedCertificate(cert);
              setShowCertificateModal(true);
            }}
          />
        )}

        {/* VIEW 6: ORGANIZER DASHBOARD */}
        {currentView === 'organizer_dashboard' && (
          <OrganizerDashboardView
            onOpenCreateEvent={() => setShowCreateEventModal(true)}
            onOpenQRScanner={(evt) => {
              setSelectedEventForQR(evt);
              setQrMode('organizer_scanner');
            }}
            onSelectEvent={(evt) => setSelectedEventForDetails(evt)}
          />
        )}

        {/* VIEW 7: ADMIN DASHBOARD */}
        {currentView === 'admin_dashboard' && (
          <AdminDashboardView
            onSelectEvent={(evt) => setSelectedEventForDetails(evt)}
          />
        )}
      </main>

      {/* FOOTER */}
      <footer className="mt-auto border-t border-[#eaded7]/80 bg-[#fffdfb] py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-neutral-500">
          <div className="flex items-center gap-2">
            <span className="font-bold text-neutral-900">CampusPulse</span>
            <span>• Verified University Event Management & Discovery Platform</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => {
                setSelectedCertificate(null);
                setShowCertificateModal(true);
              }}
              className="hover:text-[#b51f1a] font-semibold"
            >
              Verify Certificate
            </button>
            <span>•</span>
            <span className="font-mono text-neutral-400">KSIT v2.4 (Active)</span>
          </div>
        </div>
      </footer>

      {/* MODALS */}

      {/* Event Details Modal */}
      {selectedEventForDetails && (
        <EventDetailsModal
          eventId={selectedEventForDetails.id}
          onClose={() => setSelectedEventForDetails(null)}
          onRefreshList={fetchEvents}
          onOpenQRPass={(evt) => {
            setSelectedEventForQR(evt);
            setQrMode('student_pass');
          }}
          onOpenFeedback={(evt) => {
            setSelectedEventForFeedback(evt);
          }}
        />
      )}

      {/* Create Event Modal */}
      {showCreateEventModal && (
        <CreateEventModal
          onClose={() => setShowCreateEventModal(false)}
          onEventCreated={() => {
            fetchEvents();
            setCurrentView('discover');
          }}
        />
      )}

      {/* QR Code Scanner / Pass Modal */}
      {selectedEventForQR && (
        <QRScannerModal
          event={selectedEventForQR}
          mode={qrMode}
          onClose={() => setSelectedEventForQR(null)}
          onAttendanceMarked={() => {
            fetchEvents();
          }}
        />
      )}

      {/* Feedback Modal */}
      {selectedEventForFeedback && (
        <FeedbackModal
          event={selectedEventForFeedback}
          onClose={() => setSelectedEventForFeedback(null)}
          onFeedbackSubmitted={() => {
            fetchEvents();
          }}
        />
      )}

      {/* Certificate Modal */}
      {showCertificateModal && (
        <CertificateModal
          certificate={selectedCertificate || undefined}
          onClose={() => {
            setShowCertificateModal(false);
            setSelectedCertificate(null);
          }}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainContent />
    </AuthProvider>
  );
}
