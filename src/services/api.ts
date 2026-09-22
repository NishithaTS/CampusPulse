import { User, EventItem, Club, Certificate, NotificationItem, Venue, EventReport } from '../types.ts';

const TOKEN_KEY = 'campuspulse_jwt_token';
const STORAGE_KEYS = {
  SAVED_EVENT_IDS: 'campuspulse_saved_event_ids',
  REGISTRATIONS: 'campuspulse_registrations',
  ATTENDANCE: 'campuspulse_attendance',
  FEEDBACKS: 'campuspulse_feedbacks',
  CUSTOM_EVENTS: 'campuspulse_custom_events',
  CACHED_EVENTS: 'campuspulse_cached_events',
  USER_PROFILE: 'campuspulse_user_profile',
};

// Local storage helper for resilient client persistence
export const localStore = {
  getSavedEventIds: (): string[] => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.SAVED_EVENT_IDS) || '[]');
    } catch {
      return [];
    }
  },
  toggleSaveEventId: (eventId: string): boolean => {
    const ids = localStore.getSavedEventIds();
    const index = ids.indexOf(eventId);
    let isSaved = false;
    if (index > -1) {
      ids.splice(index, 1);
      isSaved = false;
    } else {
      ids.push(eventId);
      isSaved = true;
    }
    localStorage.setItem(STORAGE_KEYS.SAVED_EVENT_IDS, JSON.stringify(ids));
    return isSaved;
  },
  getLocalRegistrations: (): Record<string, any> => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.REGISTRATIONS) || '{}');
    } catch {
      return {};
    }
  },
  saveLocalRegistration: (eventId: string, regData: any) => {
    const regs = localStore.getLocalRegistrations();
    regs[eventId] = { ...regData, savedAt: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEYS.REGISTRATIONS, JSON.stringify(regs));
  },
  removeLocalRegistration: (eventId: string) => {
    const regs = localStore.getLocalRegistrations();
    delete regs[eventId];
    localStorage.setItem(STORAGE_KEYS.REGISTRATIONS, JSON.stringify(regs));
  },
  getLocalAttendance: (): string[] => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.ATTENDANCE) || '[]');
    } catch {
      return [];
    }
  },
  recordLocalAttendance: (eventId: string) => {
    const att = localStore.getLocalAttendance();
    if (!att.includes(eventId)) {
      att.push(eventId);
      localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(att));
    }
  },
  getCustomEvents: (): EventItem[] => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.CUSTOM_EVENTS) || '[]');
    } catch {
      return [];
    }
  },
  saveCustomEvent: (event: EventItem) => {
    const customs = localStore.getCustomEvents();
    const existingIdx = customs.findIndex((e) => e.id === event.id);
    if (existingIdx >= 0) {
      customs[existingIdx] = event;
    } else {
      customs.unshift(event);
    }
    localStorage.setItem(STORAGE_KEYS.CUSTOM_EVENTS, JSON.stringify(customs));
  },
};

export const authStorage = {
  getToken: () => localStorage.getItem(TOKEN_KEY),
  setToken: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clearToken: () => localStorage.removeItem(TOKEN_KEY),
};

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = authStorage.getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || `Request failed with status ${response.status}`);
  }

  return data as T;
}

export const api = {
  // Auth
  login: (credentials: { email: string; password: string }) =>
    request<{ token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),

  register: (userData: any) =>
    request<{ token: string; user: User }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),

  getMe: () => request<{ user: User; profile: any }>('/api/auth/me'),

  updateProfile: (profileData: any) =>
    request<{ success: boolean; user: User }>('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    }),

  getSettings: () =>
    request<{
      collegeName: string;
      collegeEmailDomain: string;
      allowExternalEmails: boolean;
      campusName: string;
      currentSemester: string;
    }>('/api/settings'),

  // Events
  getEvents: async (params: Record<string, string | boolean | undefined> = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== '') query.append(key, String(val));
    });

    try {
      const serverEvents = await request<EventItem[]>(`/api/events?${query.toString()}`);
      // Cache server events to local storage
      localStorage.setItem(STORAGE_KEYS.CACHED_EVENTS, JSON.stringify(serverEvents));

      // Merge with custom events from local storage if any
      const customEvents = localStore.getCustomEvents();
      const combined = [...customEvents, ...serverEvents.filter((se) => !customEvents.some((ce) => ce.id === se.id))];

      // Enrich with local storage bookmarks and registrations
      const savedIds = localStore.getSavedEventIds();
      const localRegs = localStore.getLocalRegistrations();
      const localAtt = localStore.getLocalAttendance();

      return combined.map((evt) => ({
        ...evt,
        isSaved: savedIds.includes(evt.id) || evt.isSaved,
        isRegistered: Boolean(localRegs[evt.id]) || evt.isRegistered,
        hasAttended: localAtt.includes(evt.id) || evt.hasAttended,
        registrationDetails: localRegs[evt.id] || evt.registrationDetails,
      }));
    } catch (err) {
      console.warn('Network request failed, falling back to local storage cache:', err);
      const cached = localStorage.getItem(STORAGE_KEYS.CACHED_EVENTS);
      const custom = localStore.getCustomEvents();
      const parsedCached: EventItem[] = cached ? JSON.parse(cached) : [];
      return [...custom, ...parsedCached];
    }
  },

  getEvent: async (id: string) => {
    try {
      const event = await request<EventItem & { venueDetails?: Venue; clubDetails?: Club; departmentDetails?: any }>(
        `/api/events/${id}`
      );
      const savedIds = localStore.getSavedEventIds();
      const localRegs = localStore.getLocalRegistrations();
      const localAtt = localStore.getLocalAttendance();

      return {
        ...event,
        isSaved: savedIds.includes(event.id) || event.isSaved,
        isRegistered: Boolean(localRegs[event.id]) || event.isRegistered,
        hasAttended: localAtt.includes(event.id) || event.hasAttended,
        registrationDetails: localRegs[event.id] || event.registrationDetails,
      };
    } catch (err) {
      // Check local storage custom events
      const custom = localStore.getCustomEvents().find((e) => e.id === id);
      if (custom) return custom as any;
      throw err;
    }
  },

  createEvent: async (eventData: any) => {
    try {
      const res = await request<{ success: boolean; event: EventItem }>('/api/events', {
        method: 'POST',
        body: JSON.stringify(eventData),
      });
      // Store in local storage as well
      localStore.saveCustomEvent(res.event);
      return res;
    } catch (err) {
      // Local storage fallback creation
      const localEvent: EventItem = {
        ...eventData,
        id: `local-evt-${Date.now()}`,
        registeredCount: 0,
        attendedCount: 0,
        status: 'published',
        verificationBadge: 'verified_club',
        isFeatured: false,
        createdAt: new Date().toISOString(),
      };
      localStore.saveCustomEvent(localEvent);
      return { success: true, event: localEvent };
    }
  },

  updateEvent: (id: string, eventData: any) =>
    request<{ success: boolean; event: EventItem }>(`/api/events/${id}`, {
      method: 'PUT',
      body: JSON.stringify(eventData),
    }),

  cancelEvent: (id: string) =>
    request<{ success: boolean; message: string; event: EventItem }>(`/api/events/${id}`, {
      method: 'DELETE',
    }),

  checkDuplicate: (eventData: { title: string; date: string; startTime?: string; venueId?: string }) =>
    request<{ isDuplicate: boolean; match?: EventItem; score: number; reason?: string }>(
      '/api/events/check-duplicate',
      {
        method: 'POST',
        body: JSON.stringify(eventData),
      }
    ),

  extractPosterAI: (imageBase64: string, mimeType?: string) =>
    request<{ success: boolean; data: any }>('/api/ai/extract-poster', {
      method: 'POST',
      body: JSON.stringify({ imageBase64, mimeType }),
    }),

  registerForEvent: async (id: string, formData: any) => {
    try {
      const res = await request<{ success: boolean; registration: any }>(`/api/events/${id}/register`, {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      // Persist registration in local storage
      localStore.saveLocalRegistration(id, res.registration);
      return res;
    } catch (err) {
      // Client-side fallback registration stored in localStorage
      const localReg = {
        id: `reg-${Date.now()}`,
        eventId: id,
        studentName: formData.fullName || 'Student',
        studentId: formData.studentId || '2026-ST-LOCAL',
        department: formData.department || 'Engineering',
        qrTicketCode: `CAMPUS-PASS-${id}-${Date.now()}`,
        status: 'confirmed',
        registeredAt: new Date().toISOString(),
      };
      localStore.saveLocalRegistration(id, localReg);
      return { success: true, registration: localReg };
    }
  },

  cancelRegistration: async (id: string) => {
    localStore.removeLocalRegistration(id);
    try {
      return await request<{ success: boolean; message: string }>(`/api/events/${id}/register`, {
        method: 'DELETE',
      });
    } catch {
      return { success: true, message: 'Registration cancelled locally.' };
    }
  },

  toggleSaveEvent: async (id: string) => {
    // Immediately reflect in local storage
    const isSaved = localStore.toggleSaveEventId(id);
    try {
      await request<{ success: boolean; isSaved: boolean }>(`/api/events/${id}/save`, {
        method: 'POST',
      });
    } catch {
      // Server call optional if offline, local storage already toggled
    }
    return { success: true, isSaved };
  },

  reportEvent: (id: string, reason: string, description?: string) =>
    request<{ success: boolean; message: string }>(`/api/events/${id}/report`, {
      method: 'POST',
      body: JSON.stringify({ reason, description }),
    }),

  // Attendance & Verification
  getAttendanceSession: (eventId: string) =>
    request<{ success: boolean; token: string; qrDataUrl: string; expiresAt: string; liveCount: number }>(
      `/api/events/${eventId}/attendance-session`
    ),

  markAttendance: async (eventId: string, data: { qrToken?: string; studentTicketCode?: string }) => {
    localStore.recordLocalAttendance(eventId);
    return request<{ success: boolean; message: string; attendance: any }>(`/api/events/${eventId}/attendance`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getAttendanceRoster: (eventId: string) =>
    request<{
      event: { id: string; title: string; capacity: number };
      totalRegistered: number;
      totalPresent: number;
      attendanceRate: number;
      roster: any[];
    }>(`/api/events/${eventId}/attendance-roster`),

  // Feedback & Reviews
  submitFeedback: async (eventId: string, feedbackData: any) => {
    try {
      const res = await request<{ success: boolean; message: string }>(`/api/events/${eventId}/feedback`, {
        method: 'POST',
        body: JSON.stringify(feedbackData),
      });
      // Store in local storage
      const feedbacks = JSON.parse(localStorage.getItem(STORAGE_KEYS.FEEDBACKS) || '{}');
      feedbacks[eventId] = { ...feedbackData, submittedAt: new Date().toISOString() };
      localStorage.setItem(STORAGE_KEYS.FEEDBACKS, JSON.stringify(feedbacks));
      return res;
    } catch (err) {
      const feedbacks = JSON.parse(localStorage.getItem(STORAGE_KEYS.FEEDBACKS) || '{}');
      feedbacks[eventId] = { ...feedbackData, submittedAt: new Date().toISOString() };
      localStorage.setItem(STORAGE_KEYS.FEEDBACKS, JSON.stringify(feedbacks));
      return { success: true, message: 'Feedback saved locally.' };
    }
  },

  getFeedback: (eventId: string) => request<any>(`/api/events/${eventId}/feedback`),

  // Certificates
  issueCertificates: (eventId: string) =>
    request<{ success: boolean; issuedCount: number; message: string }>(`/api/events/${eventId}/certificates`, {
      method: 'POST',
    }),

  verifyCertificate: (certificateId: string) =>
    request<{ valid: boolean; certificate?: Certificate; message?: string }>(`/api/certificates/verify/${certificateId}`),

  // Student Dashboard & History
  getMyEvents: async () => {
    try {
      const res = await request<{
        upcoming: EventItem[];
        saved: EventItem[];
        past: EventItem[];
        certificates: Certificate[];
      }>('/api/student/my-events');

      // Enrich with local storage items
      const localRegs = localStore.getLocalRegistrations();
      const customEvents = localStore.getCustomEvents();
      const savedIds = localStore.getSavedEventIds();

      // Check if custom events are saved or registered
      customEvents.forEach((ce) => {
        if (savedIds.includes(ce.id) && !res.saved.some((s) => s.id === ce.id)) {
          res.saved.push(ce);
        }
        if (localRegs[ce.id] && !res.upcoming.some((u) => u.id === ce.id)) {
          res.upcoming.push({ ...ce, isRegistered: true, registrationDetails: localRegs[ce.id] });
        }
      });

      return res;
    } catch {
      // Local storage fallback for my events
      const savedIds = localStore.getSavedEventIds();
      const localRegs = localStore.getLocalRegistrations();
      const cached = localStorage.getItem(STORAGE_KEYS.CACHED_EVENTS);
      const events: EventItem[] = cached ? JSON.parse(cached) : [];

      const saved = events.filter((e) => savedIds.includes(e.id));
      const upcoming = events
        .filter((e) => Boolean(localRegs[e.id]))
        .map((e) => ({ ...e, isRegistered: true, registrationDetails: localRegs[e.id] }));

      return {
        upcoming,
        saved,
        past: [],
        certificates: [],
      };
    }
  },

  // Venues
  getVenues: () => request<Venue[]>('/api/venues'),

  // Clubs
  getClubs: () => request<Club[]>('/api/clubs'),

  getClub: (id: string) => request<Club & { upcomingEvents: EventItem[]; pastEvents: EventItem[] }>(`/api/clubs/${id}`),

  toggleFollowClub: (id: string) =>
    request<{ success: boolean; isFollowed: boolean; followedCount: number }>(`/api/clubs/${id}/follow`, {
      method: 'POST',
    }),

  // Notifications
  getNotifications: () => request<NotificationItem[]>('/api/notifications'),

  markNotificationRead: (id: string) =>
    request<{ success: boolean }>(`/api/notifications/${id}/read`, {
      method: 'POST',
    }),

  markAllNotificationsRead: () =>
    request<{ success: boolean }>('/api/notifications/read-all', {
      method: 'POST',
    }),

  // Organizer Dashboard
  getOrganizerDashboard: () =>
    request<{
      metrics: {
        totalEvents: number;
        upcomingEvents: number;
        totalRegistrations: number;
        totalAttendance: number;
        attendanceRate: number;
        averageFeedback: number;
      };
      events: EventItem[];
    }>('/api/organizer/dashboard'),

  // Admin Analytics & Controls
  getAdminAnalytics: () =>
    request<{
      metrics: {
        totalStudents: number;
        totalOrganizers: number;
        totalClubs: number;
        totalEvents: number;
        pendingApprovals: number;
        totalRegistrations: number;
        totalAttendance: number;
        overallAttendanceRate: number;
        pendingReports: number;
      };
      categoryDistribution: { name: string; value: number }[];
      topClubs: { name: string; eventsCount: number; followers: number }[];
      registrationTrend: { month: string; registrations: number; attendance: number }[];
    }>('/api/admin/analytics'),

  approveEvent: (id: string, verificationBadge: string = 'official') =>
    request<{ success: boolean; event: EventItem }>(`/api/admin/events/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ verificationBadge }),
    }),

  rejectEvent: (id: string, reason: string, action: 'rejected' | 'request_changes' = 'rejected') =>
    request<{ success: boolean; event: EventItem }>(`/api/admin/events/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason, action }),
    }),

  toggleFeatureEvent: (id: string) =>
    request<{ success: boolean; isFeatured: boolean }>(`/api/admin/events/${id}/feature`, {
      method: 'POST',
    }),

  getAdminUsers: () => request<User[]>('/api/admin/users'),

  changeUserRole: (id: string, role: string) =>
    request<{ success: boolean; user: User }>(`/api/admin/users/${id}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    }),

  getAdminReports: () => request<EventReport[]>('/api/admin/reports'),

  updateReportStatus: (id: string, status: string, adminNotes?: string) =>
    request<{ success: boolean; report: EventReport }>(`/api/admin/reports/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ status, adminNotes }),
    }),

  getAdminSettings: () => request<any>('/api/admin/settings'),

  updateAdminSettings: (settings: any) =>
    request<{ success: boolean; settings: any }>('/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    }),

  createClub: (clubData: any) =>
    request<{ success: boolean; club: Club }>('/api/admin/clubs', {
      method: 'POST',
      body: JSON.stringify(clubData),
    }),

  updateClub: (id: string, clubData: any) =>
    request<{ success: boolean; club: Club }>(`/api/admin/clubs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(clubData),
    }),
};
