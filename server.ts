import express from 'express';
import { createServer as createHttpServer } from 'node:http';
import path from 'path';
import crypto from 'crypto';
import QRCode from 'qrcode';
import { createServer as createViteServer } from 'vite';
import {
  getDb,
  saveDb,
  User,
  StudentProfile,
  OrganizerProfile,
  Event,
  Registration,
  Attendance,
  Feedback,
  Notification,
  Certificate,
  EventReport,
  Club,
} from './server/db.ts';
import {
  hashPassword,
  comparePassword,
  generateToken,
  authenticate,
  requireAuth,
  requireRole,
  AuthRequest,
} from './server/auth.ts';
import { extractEventFromPoster, calculateDuplicateScore } from './server/gemini.ts';

const PORT = 3000;

async function startServer() {
  const app = express();
  const httpServer = createHttpServer(app);

  // Support JSON and urlencoded with generous limits for poster images
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));

  // Global auth token extractor
  app.use(authenticate);

  // ----------------------------------------------------
  // PUBLIC & AUTH APIS
  // ----------------------------------------------------

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // College settings
  app.get('/api/settings', (req, res) => {
    const db = getDb();
    res.json({
      collegeName: db.settings.collegeName,
      collegeEmailDomain: db.settings.collegeEmailDomain,
      allowExternalEmails: db.settings.allowExternalEmails,
      campusName: db.settings.campusName,
      currentSemester: db.settings.currentSemester,
    });
  });

  // Register
  app.post('/api/auth/register', (req, res) => {
    const { email, password, name, role = 'student', studentId, department, year, phone, organizationName, orgType } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required.' });
    }

    const db = getDb();

    // Check college email restriction
    if (!db.settings.allowExternalEmails && db.settings.collegeEmailDomain) {
      if (!email.toLowerCase().endsWith(`@${db.settings.collegeEmailDomain.toLowerCase()}`)) {
        return res.status(400).json({
          error: `Registration is restricted to official college email addresses ending in @${db.settings.collegeEmailDomain}`,
        });
      }
    }

    const existingUser = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const newUser: User = {
      id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      email: email.toLowerCase().trim(),
      passwordHash: hashPassword(password),
      name: name.trim(),
      role: role as any,
      avatar: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`,
      campus: db.settings.campusName,
      createdAt: new Date().toISOString(),
    };

    db.users.push(newUser);

    if (newUser.role === 'student') {
      const studentProfile: StudentProfile = {
        id: `std-${Date.now()}`,
        userId: newUser.id,
        studentId: studentId || `2026-ST-${Math.floor(100 + Math.random() * 900)}`,
        department: department || 'Computer Science & Engineering',
        year: year || '1st Year',
        phone: phone || '',
        interests: ['Technical', 'Workshops', 'Hackathons'],
      };
      db.students.push(studentProfile);
    } else if (newUser.role === 'organizer') {
      const orgProfile: OrganizerProfile = {
        id: `org-${Date.now()}`,
        userId: newUser.id,
        organizationName: organizationName || name,
        type: (orgType as any) || 'club',
        autoPublish: false,
      };
      db.organizers.push(orgProfile);
    }

    saveDb();

    const token = generateToken(newUser);
    res.status(201).json({
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        campus: newUser.campus,
        avatar: newUser.avatar,
      },
    });
  });

  // Login
  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const db = getDb();
    const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());
    if (!user || !comparePassword(password, user.passwordHash)) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = generateToken(user);
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        campus: user.campus,
        avatar: user.avatar,
      },
    });
  });

  // Get Current User Profile
  app.get('/api/auth/me', requireAuth, (req: AuthRequest, res) => {
    const db = getDb();
    const user = db.users.find(u => u.id === req.user!.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let profileData: any = {};
    if (user.role === 'student') {
      profileData = db.students.find(s => s.userId === user.id) || {};
    } else if (user.role === 'organizer') {
      profileData = db.organizers.find(o => o.userId === user.id) || {};
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        campus: user.campus,
        avatar: user.avatar,
        createdAt: user.createdAt,
      },
      profile: profileData,
    });
  });

  // Update Profile
  app.put('/api/auth/profile', requireAuth, (req: AuthRequest, res) => {
    const db = getDb();
    const user = db.users.find(u => u.id === req.user!.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { name, avatar, interests, department, year, phone } = req.body;
    if (name) user.name = name;
    if (avatar) user.avatar = avatar;

    if (user.role === 'student') {
      let student = db.students.find(s => s.userId === user.id);
      if (!student) {
        student = {
          id: `std-${Date.now()}`,
          userId: user.id,
          studentId: 'ST-NEW',
          department: department || 'Engineering',
          year: year || '1st Year',
          phone: phone || '',
          interests: interests || [],
        };
        db.students.push(student);
      } else {
        if (interests) student.interests = interests;
        if (department) student.department = department;
        if (year) student.year = year;
        if (phone) student.phone = phone;
      }
    }

    saveDb();
    res.json({ success: true, user });
  });

  // ----------------------------------------------------
  // EVENTS DISCOVERY & DETAILS
  // ----------------------------------------------------

  app.get('/api/events', (req: AuthRequest, res) => {
    const db = getDb();
    const {
      search,
      category,
      organizer,
      clubId,
      departmentId,
      venueId,
      dateFilter,
      registration,
      isPaid,
      sort = 'date',
      includeAll = 'false',
    } = req.query as Record<string, string>;

    const todayStr = new Date().toISOString().split('T')[0];
    const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const weekEndStr = new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0];
    const monthEndStr = new Date(Date.now() + 86400000 * 30).toISOString().split('T')[0];

    let results = db.events.filter(event => {
      // By default, public/students only see published and completed/cancelled events
      if (includeAll !== 'true' && req.user?.role !== 'admin') {
        if (req.user?.role === 'organizer') {
          // Organizers can also see their own drafts and pending events
          if (event.organizerId !== req.user.id && event.status !== 'published' && event.status !== 'completed' && event.status !== 'cancelled') {
            return false;
          }
        } else {
          if (event.status !== 'published' && event.status !== 'completed' && event.status !== 'cancelled') {
            return false;
          }
        }
      }

      if (category && category !== 'All' && event.category.toLowerCase() !== category.toLowerCase()) {
        return false;
      }

      if (clubId && event.clubId !== clubId) {
        return false;
      }

      if (departmentId && event.departmentId !== departmentId) {
        return false;
      }

      if (venueId && event.venueId !== venueId) {
        return false;
      }

      if (organizer && !event.organizerName.toLowerCase().includes(organizer.toLowerCase())) {
        return false;
      }

      if (isPaid !== undefined && isPaid !== '') {
        const isPaidBool = isPaid === 'true';
        if (event.isPaid !== isPaidBool) return false;
      }

      if (registration) {
        if (registration === 'open' && event.registeredCount >= event.capacity) return false;
        if (registration === 'full' && event.registeredCount < event.capacity) return false;
        if (registration === 'closed' && event.status !== 'completed' && event.status !== 'cancelled') return false;
      }

      if (dateFilter) {
        if (dateFilter === 'today' && event.date !== todayStr) return false;
        if (dateFilter === 'tomorrow' && event.date !== tomorrowStr) return false;
        if (dateFilter === 'this_week' && (event.date < todayStr || event.date > weekEndStr)) return false;
        if (dateFilter === 'this_month' && (event.date < todayStr || event.date > monthEndStr)) return false;
        if (dateFilter === 'past' && event.date >= todayStr) return false;
      }

      if (search && search.trim()) {
        const q = search.toLowerCase().trim();
        const inTitle = event.title.toLowerCase().includes(q);
        const inDesc = event.description.toLowerCase().includes(q);
        const inOrganizer = event.organizerName.toLowerCase().includes(q);
        const inVenue = (event.venueName || '').toLowerCase().includes(q);
        const inCategory = event.category.toLowerCase().includes(q);
        const inTags = event.tags.some(t => t.toLowerCase().includes(q));
        if (!inTitle && !inDesc && !inOrganizer && !inVenue && !inCategory && !inTags) {
          return false;
        }
      }

      return true;
    });

    // Sort
    if (sort === 'date') {
      results.sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
    } else if (sort === 'popularity') {
      results.sort((a, b) => b.registeredCount - a.registeredCount);
    } else if (sort === 'recently_added') {
      results.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }

    // Attach user-specific bookmark/registration tags if user is logged in
    const userId = req.user?.id;
    const userRegistrations = userId ? new Set(db.registrations.filter(r => r.userId === userId && r.status === 'confirmed').map(r => r.eventId)) : new Set();
    const userSaved = userId ? new Set(db.savedEvents.filter(s => s.userId === userId).map(s => s.eventId)) : new Set();

    const mapped = results.map(evt => ({
      ...evt,
      isRegistered: userRegistrations.has(evt.id),
      isSaved: userSaved.has(evt.id),
    }));

    res.json(mapped);
  });

  // Get Event Details
  app.get('/api/events/:id', (req: AuthRequest, res) => {
    const db = getDb();
    const event = db.events.find(e => e.id === req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const venue = db.venues.find(v => v.id === event.venueId);
    const club = event.clubId ? db.clubs.find(c => c.id === event.clubId) : undefined;
    const department = event.departmentId ? db.departments.find(d => d.id === event.departmentId) : undefined;

    const userId = req.user?.id;
    const registration = userId ? db.registrations.find(r => r.eventId === event.id && r.userId === userId && r.status === 'confirmed') : undefined;
    const saved = userId ? db.savedEvents.some(s => s.eventId === event.id && s.userId === userId) : false;
    const attendance = userId ? db.attendance.find(a => a.eventId === event.id && a.userId === userId) : undefined;
    const feedback = userId ? db.feedback.find(f => f.eventId === event.id && f.userId === userId) : undefined;

    res.json({
      ...event,
      venueDetails: venue,
      clubDetails: club,
      departmentDetails: department,
      isRegistered: !!registration,
      registrationDetails: registration,
      isSaved: saved,
      hasAttended: !!attendance,
      attendanceDetails: attendance,
      hasFeedback: !!feedback,
      feedbackDetails: feedback,
    });
  });

  // Duplicate Check API
  app.post('/api/events/check-duplicate', requireAuth, (req: AuthRequest, res) => {
    const db = getDb();
    const { title, date, startTime, venueId, organizerId } = req.body;
    if (!title || !date) {
      return res.status(400).json({ error: 'Title and date are required for duplicate check.' });
    }

    const check = calculateDuplicateScore({ title, date, startTime, venueId, organizerId }, db.events);
    res.json(check);
  });

  // AI Poster Extraction API
  app.post('/api/ai/extract-poster', requireAuth, async (req: AuthRequest, res) => {
    try {
      const { imageBase64, mimeType } = req.body;
      const extracted = await extractEventFromPoster(imageBase64, mimeType);
      res.json({ success: true, data: extracted });
    } catch (err: any) {
      console.error('Error extracting poster:', err);
      res.status(500).json({ error: err.message || 'Failed to extract poster details.' });
    }
  });

  // Create Event
  app.post('/api/events', requireAuth, requireRole('organizer', 'admin'), (req: AuthRequest, res) => {
    const db = getDb();
    const user = req.user!;
    const {
      title,
      description,
      category,
      tags = [],
      posterUrl,
      date,
      startTime,
      endTime,
      registrationDeadline,
      venueId,
      capacity = 100,
      eligibility = 'All students',
      entryRequirements = 'Student ID',
      contactInfo,
      speaker,
      customFields = [],
      waitlistEnabled = true,
      clubId,
      departmentId,
      isPaid = false,
      feeAmount = 0,
      status: requestedStatus,
    } = req.body;

    if (!title || !description || !date || !startTime || !venueId) {
      return res.status(400).json({ error: 'Title, description, date, start time, and venue are required.' });
    }

    const venue = db.venues.find(v => v.id === venueId);
    const venueName = venue ? `${venue.name} (${venue.building} - ${venue.room})` : 'Campus Venue';

    const organizerProfile = db.organizers.find(o => o.userId === user.id);
    const isAdmin = user.role === 'admin';
    const autoPublish = isAdmin || (organizerProfile?.autoPublish ?? false);

    // Initial status determination
    let finalStatus: Event['status'] = 'draft';
    if (requestedStatus === 'draft') {
      finalStatus = 'draft';
    } else if (autoPublish) {
      finalStatus = 'published';
    } else {
      finalStatus = 'pending_approval';
    }

    // Determine verification badge
    let verificationBadge: Event['verificationBadge'] = 'none';
    if (isAdmin) {
      verificationBadge = 'official';
    } else if (clubId) {
      verificationBadge = 'verified_club';
    } else if (departmentId) {
      verificationBadge = 'department';
    }

    const newEvent: Event = {
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: title.trim(),
      description: description.trim(),
      category: category || 'Workshops',
      tags: Array.isArray(tags) ? tags : [tags],
      posterUrl: posterUrl || 'https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=800&auto=format&fit=crop&q=80',
      date,
      startTime,
      endTime: endTime || startTime,
      registrationDeadline: registrationDeadline || `${date}T${startTime}:00.000Z`,
      venueId,
      venueName,
      organizerId: user.id,
      organizerName: organizerProfile?.organizationName || user.name,
      clubId,
      departmentId,
      capacity: Number(capacity) || 100,
      registeredCount: 0,
      attendedCount: 0,
      eligibility,
      entryRequirements,
      contactInfo: contactInfo || user.email,
      speaker,
      customFields,
      waitlistEnabled: !!waitlistEnabled,
      isPaid: !!isPaid,
      feeAmount: Number(feeAmount) || 0,
      status: finalStatus,
      verificationBadge,
      isFeatured: false,
      qrSessionToken: `PULSE-SESSION-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.events.push(newEvent);

    // If submitted for approval, notify admins
    if (finalStatus === 'pending_approval') {
      const adminUsers = db.users.filter(u => u.role === 'admin');
      adminUsers.forEach(adm => {
        db.notifications.push({
          id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          userId: adm.id,
          type: 'approval_status',
          title: 'Event Approval Needed 📋',
          message: `Organizer "${newEvent.organizerName}" submitted "${newEvent.title}" for review.`,
          eventId: newEvent.id,
          isRead: false,
          actionUrl: '/admin/events/approvals',
          createdAt: new Date().toISOString(),
        });
      });
    }

    saveDb();
    res.status(201).json({ success: true, event: newEvent });
  });

  // Edit Event
  app.put('/api/events/:id', requireAuth, requireRole('organizer', 'admin'), (req: AuthRequest, res) => {
    const db = getDb();
    const user = req.user!;
    const event = db.events.find(e => e.id === req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    if (user.role !== 'admin' && event.organizerId !== user.id) {
      return res.status(403).json({ error: 'You are not authorized to edit this event.' });
    }

    const previousVenueId = event.venueId;
    const fieldsToUpdate = [
      'title', 'description', 'category', 'tags', 'posterUrl', 'date',
      'startTime', 'endTime', 'registrationDeadline', 'venueId', 'capacity',
      'eligibility', 'entryRequirements', 'contactInfo', 'speaker', 'customFields',
      'waitlistEnabled', 'status', 'isPaid', 'feeAmount', 'clubId', 'departmentId'
    ];

    fieldsToUpdate.forEach(field => {
      if (req.body[field] !== undefined) {
        (event as any)[field] = req.body[field];
      }
    });

    if (req.body.venueId) {
      const venue = db.venues.find(v => v.id === req.body.venueId);
      if (venue) {
        event.venueName = `${venue.name} (${venue.building} - ${venue.room})`;
      }
    }

    event.updatedAt = new Date().toISOString();

    // If venue changed, notify registered students!
    if (previousVenueId !== event.venueId) {
      const registrations = db.registrations.filter(r => r.eventId === event.id && r.status === 'confirmed');
      registrations.forEach(reg => {
        db.notifications.push({
          id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          userId: reg.userId,
          type: 'venue_changed',
          title: '⚠️ Venue Updated',
          message: `"${event.title}" has been moved to ${event.venueName}.`,
          eventId: event.id,
          isRead: false,
          actionUrl: `/events/${event.id}`,
          createdAt: new Date().toISOString(),
        });
      });
    }

    saveDb();
    res.json({ success: true, event });
  });

  // Cancel / Delete Event
  app.delete('/api/events/:id', requireAuth, requireRole('organizer', 'admin'), (req: AuthRequest, res) => {
    const db = getDb();
    const user = req.user!;
    const event = db.events.find(e => e.id === req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    if (user.role !== 'admin' && event.organizerId !== user.id) {
      return res.status(403).json({ error: 'You are not authorized to cancel this event.' });
    }

    // As per Requirement 41: Cancelled events should remain visible with a clear "Cancelled" status rather than silently disappearing.
    event.status = 'cancelled';
    event.updatedAt = new Date().toISOString();

    // Notify registered attendees
    const registrations = db.registrations.filter(r => r.eventId === event.id && r.status === 'confirmed');
    registrations.forEach(reg => {
      db.notifications.push({
        id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        userId: reg.userId,
        type: 'event_cancelled',
        title: 'Event Cancelled',
        message: `"${event.title}" scheduled for ${event.date} has been cancelled by the organizer.`,
        eventId: event.id,
        isRead: false,
        actionUrl: `/events/${event.id}`,
        createdAt: new Date().toISOString(),
      });
    });

    saveDb();
    res.json({ success: true, message: 'Event has been marked as cancelled.', event });
  });

  // ----------------------------------------------------
  // EVENT REGISTRATION & BOOKMARKS
  // ----------------------------------------------------

  app.post('/api/events/:id/register', requireAuth, (req: AuthRequest, res) => {
    const db = getDb();
    const user = req.user!;
    const event = db.events.find(e => e.id === req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    if (event.status !== 'published') {
      return res.status(400).json({ error: 'Registration is not open for this event.' });
    }

    // Check if already registered
    const existing = db.registrations.find(r => r.eventId === event.id && r.userId === user.id && r.status !== 'cancelled');
    if (existing) {
      return res.status(400).json({ error: 'You are already registered for this event.', registration: existing });
    }

    const studentProfile = db.students.find(s => s.userId === user.id);
    const { name, email, studentId, department, year, phone, customData = {} } = req.body;

    // Check capacity
    const isFull = event.registeredCount >= event.capacity;
    if (isFull && !event.waitlistEnabled) {
      return res.status(400).json({ error: 'This event has reached full capacity.' });
    }

    const regStatus: Registration['status'] = isFull ? 'waitlisted' : 'confirmed';
    const regId = `reg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const qrCodeTicket = `CAMPUS-PASS-${event.id}-${user.id}-${regId}`;

    const newRegistration: Registration = {
      id: regId,
      eventId: event.id,
      userId: user.id,
      studentId: studentId || studentProfile?.studentId || 'ID-CAMPUS',
      studentName: name || user.name,
      studentEmail: email || user.email,
      department: department || studentProfile?.department || 'Engineering',
      year: year || studentProfile?.year || '1st Year',
      phone: phone || studentProfile?.phone || '',
      customData,
      status: regStatus,
      registeredAt: new Date().toISOString(),
      qrTicketCode: qrCodeTicket,
    };

    db.registrations.push(newRegistration);
    if (regStatus === 'confirmed') {
      event.registeredCount += 1;
    }

    // In-app Notification
    db.notifications.push({
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      userId: user.id,
      type: 'registration_confirmed',
      title: regStatus === 'confirmed' ? 'Registration Confirmed 🎉' : 'Added to Waitlist ⏳',
      message: `You are successfully registered for "${event.title}". View your digital QR ticket anytime in My Events.`,
      eventId: event.id,
      isRead: false,
      actionUrl: `/events/${event.id}`,
      createdAt: new Date().toISOString(),
    });

    saveDb();
    res.status(201).json({ success: true, registration: newRegistration });
  });

  // Cancel Registration
  app.delete('/api/events/:id/register', requireAuth, (req: AuthRequest, res) => {
    const db = getDb();
    const user = req.user!;
    const reg = db.registrations.find(r => r.eventId === req.params.id && r.userId === user.id && r.status !== 'cancelled');
    if (!reg) {
      return res.status(404).json({ error: 'Active registration not found.' });
    }

    reg.status = 'cancelled';
    const event = db.events.find(e => e.id === req.params.id);
    if (event && event.registeredCount > 0) {
      event.registeredCount -= 1;
    }

    saveDb();
    res.json({ success: true, message: 'Registration successfully cancelled.' });
  });

  // Toggle Save/Bookmark Event
  app.post('/api/events/:id/save', requireAuth, (req: AuthRequest, res) => {
    const db = getDb();
    const user = req.user!;
    const eventId = req.params.id;

    const existingIndex = db.savedEvents.findIndex(s => s.userId === user.id && s.eventId === eventId);
    let isSaved = false;

    if (existingIndex >= 0) {
      db.savedEvents.splice(existingIndex, 1);
      isSaved = false;
    } else {
      db.savedEvents.push({
        id: `sv-${Date.now()}`,
        userId: user.id,
        eventId,
        savedAt: new Date().toISOString(),
      });
      isSaved = true;
    }

    saveDb();
    res.json({ success: true, isSaved });
  });

  // Report Event
  app.post('/api/events/:id/report', requireAuth, (req: AuthRequest, res) => {
    const db = getDb();
    const user = req.user!;
    const event = db.events.find(e => e.id === req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const { reason, description } = req.body;
    if (!reason) return res.status(400).json({ error: 'Report reason is required.' });

    const newReport: EventReport = {
      id: `rep-${Date.now()}`,
      eventId: event.id,
      eventTitle: event.title,
      reportedByUserId: user.id,
      reporterName: user.name,
      reason,
      description: description || '',
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    db.eventReports.push(newReport);
    saveDb();

    res.status(201).json({ success: true, message: 'Report submitted for administrative review.' });
  });

  // ----------------------------------------------------
  // QR CODE ATTENDANCE
  // ----------------------------------------------------

  // Generate Organizer Session QR Code / Refresh Token
  app.get('/api/events/:id/attendance-session', requireAuth, requireRole('organizer', 'admin'), async (req: AuthRequest, res) => {
    const db = getDb();
    const event = db.events.find(e => e.id === req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    if (req.user!.role !== 'admin' && event.organizerId !== req.user!.id) {
      return res.status(403).json({ error: 'Unauthorized to generate attendance session for this event.' });
    }

    if (!event.qrSessionToken) {
      event.qrSessionToken = `PULSE-SESSION-${event.id}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      saveDb();
    }

    // Generate real base64 QR code image
    const qrData = JSON.stringify({
      type: 'campuspulse_attendance',
      eventId: event.id,
      token: event.qrSessionToken,
      eventTitle: event.title,
      date: event.date,
    });

    const qrDataUrl = await QRCode.toDataURL(qrData, { width: 320, margin: 2 });

    res.json({
      eventId: event.id,
      token: event.qrSessionToken,
      qrDataUrl,
      eventTitle: event.title,
      venueName: event.venueName,
    });
  });

  // Student Marks Attendance by scanning Organizer's QR or Organizer scanning Student ticket
  app.post('/api/events/:id/attendance', requireAuth, (req: AuthRequest, res) => {
    const db = getDb();
    const user = req.user!;
    const event = db.events.find(e => e.id === req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const { qrToken, studentTicketCode } = req.body;

    let targetUserId = user.id;
    let targetStudentName = user.name;
    let targetStudentId = 'ST-ID';

    // If organizer is scanning a student's ticket
    if (studentTicketCode && (user.role === 'organizer' || user.role === 'admin')) {
      const regByTicket = db.registrations.find(r => r.qrTicketCode === studentTicketCode && r.eventId === event.id);
      if (!regByTicket) {
        return res.status(400).json({ error: 'Invalid or unregistered student pass.' });
      }
      targetUserId = regByTicket.userId;
      targetStudentName = regByTicket.studentName;
      targetStudentId = regByTicket.studentId;
    } else {
      // Normal flow: Student is scanning event attendance QR
      if (!qrToken || qrToken !== event.qrSessionToken) {
        return res.status(400).json({ error: 'Invalid or expired event attendance QR code.' });
      }

      // Check if student is registered for the event
      const reg = db.registrations.find(r => r.eventId === event.id && r.userId === user.id && r.status === 'confirmed');
      if (!reg) {
        return res.status(400).json({ error: 'You are not registered for this event. Only registered attendees can mark attendance.' });
      }

      targetStudentName = reg.studentName;
      targetStudentId = reg.studentId;
    }

    // Check duplicate attendance
    const alreadyMarked = db.attendance.find(a => a.eventId === event.id && a.userId === targetUserId);
    if (alreadyMarked) {
      return res.status(409).json({ error: 'Attendance has already been recorded for this attendee.', attendance: alreadyMarked });
    }

    const reg = db.registrations.find(r => r.eventId === event.id && r.userId === targetUserId);

    const newAttendance: Attendance = {
      id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      eventId: event.id,
      registrationId: reg?.id || 'reg-direct',
      userId: targetUserId,
      studentId: targetStudentId,
      studentName: targetStudentName,
      markedAt: new Date().toISOString(),
      markedByMethod: 'qr_scan',
      verificationToken: `ATT-VERIF-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
    };

    db.attendance.push(newAttendance);
    event.attendedCount = (event.attendedCount || 0) + 1;

    // Send confirmation notification
    db.notifications.push({
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      userId: targetUserId,
      type: 'event_reminder',
      title: '✓ Attendance Marked',
      message: `Your presence has been successfully verified for "${event.title}". Thank you for attending!`,
      eventId: event.id,
      isRead: false,
      actionUrl: `/events/${event.id}`,
      createdAt: new Date().toISOString(),
    });

    saveDb();
    res.json({ success: true, message: '✓ Attendance marked successfully!', attendance: newAttendance });
  });

  // Get Event Attendance Roster & Export CSV
  app.get('/api/events/:id/attendance', requireAuth, requireRole('organizer', 'admin'), (req: AuthRequest, res) => {
    const db = getDb();
    const event = db.events.find(e => e.id === req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    if (req.user!.role !== 'admin' && event.organizerId !== req.user!.id) {
      return res.status(403).json({ error: 'Unauthorized to view attendance for this event.' });
    }

    const registrations = db.registrations.filter(r => r.eventId === event.id);
    const attendanceRecords = db.attendance.filter(a => a.eventId === event.id);
    const attendedUserIds = new Set(attendanceRecords.map(a => a.userId));

    const roster = registrations.map(reg => {
      const att = attendanceRecords.find(a => a.userId === reg.userId);
      return {
        registrationId: reg.id,
        userId: reg.userId,
        studentId: reg.studentId,
        studentName: reg.studentName,
        studentEmail: reg.studentEmail,
        department: reg.department,
        year: reg.year,
        phone: reg.phone,
        status: reg.status,
        registeredAt: reg.registeredAt,
        isPresent: attendedUserIds.has(reg.userId),
        markedAt: att?.markedAt || null,
        markedByMethod: att?.markedByMethod || null,
        verificationToken: att?.verificationToken || null,
      };
    });

    const totalRegistered = registrations.filter(r => r.status === 'confirmed').length;
    const totalPresent = attendanceRecords.length;
    const attendanceRate = totalRegistered > 0 ? Number(((totalPresent / totalRegistered) * 100).toFixed(1)) : 0;

    res.json({
      eventId: event.id,
      eventTitle: event.title,
      totalRegistered,
      totalPresent,
      attendanceRate,
      roster,
    });
  });

  // ----------------------------------------------------
  // POST-EVENT FEEDBACK
  // ----------------------------------------------------

  app.post('/api/events/:id/feedback', requireAuth, (req: AuthRequest, res) => {
    const db = getDb();
    const user = req.user!;
    const event = db.events.find(e => e.id === req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    // As per Requirement 21 & 41: Only attendees should be able to submit official feedback
    const hasAttended = db.attendance.some(a => a.eventId === event.id && a.userId === user.id);
    if (!hasAttended && user.role !== 'admin') {
      return res.status(403).json({ error: 'Only verified attendees of this event can submit official feedback.' });
    }

    const existingFeedback = db.feedback.find(f => f.eventId === event.id && f.userId === user.id);
    if (existingFeedback) {
      return res.status(400).json({ error: 'You have already submitted feedback for this event.' });
    }

    const { overallRating, contentRating, speakerRating, organizationRating, venueRating, comment } = req.body;
    if (!overallRating || overallRating < 1 || overallRating > 5) {
      return res.status(400).json({ error: 'An overall rating between 1 and 5 stars is required.' });
    }

    const newFeedback: Feedback = {
      id: `fb-${Date.now()}`,
      eventId: event.id,
      userId: user.id,
      studentName: user.name,
      overallRating: Number(overallRating),
      contentRating: contentRating ? Number(contentRating) : undefined,
      speakerRating: speakerRating ? Number(speakerRating) : undefined,
      organizationRating: organizationRating ? Number(organizationRating) : undefined,
      venueRating: venueRating ? Number(venueRating) : undefined,
      comment: (comment || '').trim(),
      submittedAt: new Date().toISOString(),
    };

    db.feedback.push(newFeedback);
    saveDb();

    res.status(201).json({ success: true, message: 'Feedback submitted successfully.', feedback: newFeedback });
  });

  app.get('/api/events/:id/feedback', (req, res) => {
    const db = getDb();
    const feedbacks = db.feedback.filter(f => f.eventId === req.params.id);

    const count = feedbacks.length;
    let avgOverall = 0;
    let avgContent = 0;
    let avgSpeaker = 0;
    let avgOrg = 0;
    let avgVenue = 0;

    if (count > 0) {
      avgOverall = Number((feedbacks.reduce((acc, f) => acc + f.overallRating, 0) / count).toFixed(1));
      const withContent = feedbacks.filter(f => f.contentRating);
      if (withContent.length) avgContent = Number((withContent.reduce((acc, f) => acc + f.contentRating!, 0) / withContent.length).toFixed(1));
      const withSpeaker = feedbacks.filter(f => f.speakerRating);
      if (withSpeaker.length) avgSpeaker = Number((withSpeaker.reduce((acc, f) => acc + f.speakerRating!, 0) / withSpeaker.length).toFixed(1));
      const withOrg = feedbacks.filter(f => f.organizationRating);
      if (withOrg.length) avgOrg = Number((withOrg.reduce((acc, f) => acc + f.organizationRating!, 0) / withOrg.length).toFixed(1));
      const withVenue = feedbacks.filter(f => f.venueRating);
      if (withVenue.length) avgVenue = Number((withVenue.reduce((acc, f) => acc + f.venueRating!, 0) / withVenue.length).toFixed(1));
    }

    res.json({
      count,
      averages: {
        overall: avgOverall,
        content: avgContent,
        speaker: avgSpeaker,
        organization: avgOrg,
        venue: avgVenue,
      },
      reviews: feedbacks.map(f => ({
        id: f.id,
        studentName: f.studentName.slice(0, 1) + '*** ' + f.studentName.slice(-1), // semi-anonymous for privacy
        overallRating: f.overallRating,
        comment: f.comment,
        submittedAt: f.submittedAt,
      })),
    });
  });

  // ----------------------------------------------------
  // CERTIFICATES
  // ----------------------------------------------------

  // Organizer issues certificates to attendees
  app.post('/api/events/:id/certificates/issue', requireAuth, requireRole('organizer', 'admin'), (req: AuthRequest, res) => {
    const db = getDb();
    const event = db.events.find(e => e.id === req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const attendanceRecords = db.attendance.filter(a => a.eventId === event.id);
    if (attendanceRecords.length === 0) {
      return res.status(400).json({ error: 'No attendees recorded for this event yet.' });
    }

    let issuedCount = 0;
    attendanceRecords.forEach(att => {
      const existingCert = db.certificates.find(c => c.eventId === event.id && c.userId === att.userId);
      if (!existingCert) {
        const certCode = `CP-CERT-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
        const newCert: Certificate = {
          id: `cert-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          certificateId: certCode,
          eventId: event.id,
          userId: att.userId,
          studentName: att.studentName,
          eventName: event.title,
          date: event.date,
          organizerName: event.organizerName,
          collegeName: db.settings.collegeName,
          issuedAt: new Date().toISOString(),
        };
        db.certificates.push(newCert);
        issuedCount++;

        // Notify student
        db.notifications.push({
          id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          userId: att.userId,
          type: 'certificate_available',
          title: 'Official Certificate Issued 📜',
          message: `Your verified certificate for "${event.title}" is ready to view and download.`,
          eventId: event.id,
          isRead: false,
          actionUrl: '/certificates',
          createdAt: new Date().toISOString(),
        });
      }
    });

    saveDb();
    res.json({ success: true, message: `Successfully issued ${issuedCount} certificates.`, totalCertificates: attendanceRecords.length });
  });

  // Verify Certificate by code
  app.get('/api/certificates/:code/verify', (req, res) => {
    const db = getDb();
    const cert = db.certificates.find(c => c.certificateId.toUpperCase() === req.params.code.toUpperCase());
    if (!cert) {
      return res.status(404).json({ valid: false, error: 'Certificate not found or invalid verification code.' });
    }

    res.json({
      valid: true,
      certificate: cert,
    });
  });

  // ----------------------------------------------------
  // STUDENT DASHBOARD & PERSONALIZATION
  // ----------------------------------------------------

  app.get('/api/student/my-events', requireAuth, (req: AuthRequest, res) => {
    const db = getDb();
    const userId = req.user!.id;

    const userRegistrations = db.registrations.filter(r => r.userId === userId && r.status !== 'cancelled');
    const registeredEventIds = new Set(userRegistrations.map(r => r.eventId));

    const savedEventIds = new Set(db.savedEvents.filter(s => s.userId === userId).map(s => s.eventId));
    const attendedEventIds = new Set(db.attendance.filter(a => a.userId === userId).map(a => a.eventId));
    const feedbackEventIds = new Set(db.feedback.filter(f => f.userId === userId).map(f => f.eventId));

    const todayStr = new Date().toISOString().split('T')[0];

    const upcomingEvents: any[] = [];
    const pastEvents: any[] = [];
    const savedEvents: any[] = [];

    db.events.forEach(evt => {
      const isReg = registeredEventIds.has(evt.id);
      const isSaved = savedEventIds.has(evt.id);
      const hasAttended = attendedEventIds.has(evt.id);
      const hasFeedback = feedbackEventIds.has(evt.id);
      const reg = userRegistrations.find(r => r.eventId === evt.id);

      const enriched = {
        ...evt,
        isRegistered: isReg,
        registrationDetails: reg,
        hasAttended,
        hasFeedback,
      };

      if (isReg) {
        if (evt.date >= todayStr && evt.status !== 'completed' && evt.status !== 'cancelled') {
          upcomingEvents.push(enriched);
        } else {
          pastEvents.push(enriched);
        }
      }

      if (isSaved) {
        savedEvents.push(enriched);
      }
    });

    const userCertificates = db.certificates.filter(c => c.userId === userId);

    res.json({
      upcoming: upcomingEvents,
      saved: savedEvents,
      past: pastEvents,
      certificates: userCertificates,
    });
  });

  // Personalized event recommendations based on scoring rule:
  // Interest match + Followed club + Category preference + Upcoming date
  app.get('/api/student/recommendations', requireAuth, (req: AuthRequest, res) => {
    const db = getDb();
    const userId = req.user!.id;
    const student = db.students.find(s => s.userId === userId);
    const interests = new Set((student?.interests || []).map(i => i.toLowerCase()));

    const followedClubIds = new Set(db.clubFollowers.filter(cf => cf.userId === userId).map(cf => cf.clubId));
    const todayStr = new Date().toISOString().split('T')[0];

    const eligible = db.events.filter(e => e.status === 'published' && e.date >= todayStr);

    const scored = eligible.map(evt => {
      let score = 0;

      // 1. Followed club bonus (+30)
      if (evt.clubId && followedClubIds.has(evt.clubId)) {
        score += 30;
      }

      // 2. Category interest match (+25)
      if (interests.has(evt.category.toLowerCase())) {
        score += 25;
      }

      // 3. Tag match (+10 per tag up to 30)
      let tagMatches = 0;
      evt.tags.forEach(t => {
        if (interests.has(t.toLowerCase())) tagMatches++;
      });
      score += Math.min(tagMatches * 10, 30);

      // 4. Proximity bonus for events in next 7 days (+15)
      const diffDays = (new Date(evt.date).getTime() - new Date(todayStr).getTime()) / (1000 * 3600 * 24);
      if (diffDays >= 0 && diffDays <= 7) {
        score += 15;
      }

      // 5. Featured bonus (+10)
      if (evt.isFeatured) score += 10;

      return {
        ...evt,
        recommendationScore: score,
        matchReason: evt.clubId && followedClubIds.has(evt.clubId)
          ? 'From a club you follow'
          : tagMatches > 0
          ? 'Matches your technical interests'
          : 'Trending on campus',
      };
    });

    scored.sort((a, b) => b.recommendationScore - a.recommendationScore);
    res.json(scored.slice(0, 6));
  });

  // ----------------------------------------------------
  // CLUBS DIRECTORY & FOLLOW
  // ----------------------------------------------------

  app.get('/api/clubs', (req: AuthRequest, res) => {
    const db = getDb();
    const userId = req.user?.id;
    const userFollows = userId ? new Set(db.clubFollowers.filter(f => f.userId === userId).map(f => f.clubId)) : new Set();
    const todayStr = new Date().toISOString().split('T')[0];

    const clubsList = db.clubs.map(club => {
      const upcomingEventsCount = db.events.filter(e => e.clubId === club.id && e.status === 'published' && e.date >= todayStr).length;
      return {
        ...club,
        upcomingEventsCount,
        isFollowed: userFollows.has(club.id),
      };
    });

    res.json(clubsList);
  });

  app.get('/api/clubs/:id', (req: AuthRequest, res) => {
    const db = getDb();
    const club = db.clubs.find(c => c.id === req.params.id);
    if (!club) return res.status(404).json({ error: 'Club not found' });

    const userId = req.user?.id;
    const isFollowed = userId ? db.clubFollowers.some(f => f.userId === userId && f.clubId === club.id) : false;

    const todayStr = new Date().toISOString().split('T')[0];
    const clubEvents = db.events.filter(e => e.clubId === club.id && (e.status === 'published' || e.status === 'completed'));
    const upcomingEvents = clubEvents.filter(e => e.date >= todayStr);
    const pastEvents = clubEvents.filter(e => e.date < todayStr);

    res.json({
      ...club,
      isFollowed,
      upcomingEvents,
      pastEvents,
    });
  });

  app.post('/api/clubs/:id/follow', requireAuth, (req: AuthRequest, res) => {
    const db = getDb();
    const user = req.user!;
    const clubId = req.params.id;
    const club = db.clubs.find(c => c.id === clubId);
    if (!club) return res.status(404).json({ error: 'Club not found' });

    const idx = db.clubFollowers.findIndex(f => f.userId === user.id && f.clubId === clubId);
    let isFollowed = false;

    if (idx >= 0) {
      db.clubFollowers.splice(idx, 1);
      club.followedCount = Math.max(0, club.followedCount - 1);
      isFollowed = false;
    } else {
      db.clubFollowers.push({
        id: `cfw-${Date.now()}`,
        userId: user.id,
        clubId,
        followedAt: new Date().toISOString(),
      });
      club.followedCount += 1;
      isFollowed = true;
    }

    saveDb();
    res.json({ success: true, isFollowed, followedCount: club.followedCount });
  });

  // ----------------------------------------------------
  // VENUES & DEPARTMENTS & CAMPUS MAP
  // ----------------------------------------------------

  app.get('/api/venues', (req, res) => {
    const db = getDb();
    res.json(db.venues);
  });

  app.get('/api/departments', (req, res) => {
    const db = getDb();
    res.json(db.departments);
  });

  // ----------------------------------------------------
  // NOTIFICATIONS
  // ----------------------------------------------------

  app.get('/api/notifications', requireAuth, (req: AuthRequest, res) => {
    const db = getDb();
    const userNotifications = db.notifications
      .filter(n => n.userId === req.user!.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    res.json(userNotifications);
  });

  app.put('/api/notifications/:id/read', requireAuth, (req: AuthRequest, res) => {
    const db = getDb();
    const notif = db.notifications.find(n => n.id === req.params.id && n.userId === req.user!.id);
    if (notif) {
      notif.isRead = true;
      saveDb();
    }
    res.json({ success: true });
  });

  app.post('/api/notifications/mark-all-read', requireAuth, (req: AuthRequest, res) => {
    const db = getDb();
    db.notifications.forEach(n => {
      if (n.userId === req.user!.id) n.isRead = true;
    });
    saveDb();
    res.json({ success: true });
  });

  // ----------------------------------------------------
  // ORGANIZER DASHBOARD APIS
  // ----------------------------------------------------

  app.get('/api/organizer/dashboard', requireAuth, requireRole('organizer', 'admin'), (req: AuthRequest, res) => {
    const db = getDb();
    const user = req.user!;

    const myEvents = user.role === 'admin' ? db.events : db.events.filter(e => e.organizerId === user.id);
    const todayStr = new Date().toISOString().split('T')[0];

    const upcomingCount = myEvents.filter(e => e.date >= todayStr && e.status === 'published').length;
    const totalRegistrations = myEvents.reduce((acc, e) => acc + (e.registeredCount || 0), 0);
    const totalAttendance = myEvents.reduce((acc, e) => acc + (e.attendedCount || 0), 0);
    const attendanceRate = totalRegistrations > 0 ? Number(((totalAttendance / totalRegistrations) * 100).toFixed(1)) : 0;

    // Average feedback rating
    const myEventIds = new Set(myEvents.map(e => e.id));
    const feedbacks = db.feedback.filter(f => myEventIds.has(f.eventId));
    const avgRating = feedbacks.length > 0 ? Number((feedbacks.reduce((acc, f) => acc + f.overallRating, 0) / feedbacks.length).toFixed(1)) : 4.8;

    res.json({
      metrics: {
        totalEvents: myEvents.length,
        upcomingEvents: upcomingCount,
        totalRegistrations,
        totalAttendance,
        attendanceRate,
        averageFeedback: avgRating,
      },
      events: myEvents,
    });
  });

  // ----------------------------------------------------
  // ADMIN DASHBOARD & APPROVAL APIS
  // ----------------------------------------------------

  app.get('/api/admin/analytics', requireAuth, requireRole('admin'), (req: AuthRequest, res) => {
    const db = getDb();

    const totalStudents = db.users.filter(u => u.role === 'student').length;
    const totalOrganizers = db.users.filter(u => u.role === 'organizer').length;
    const totalClubs = db.clubs.length;
    const totalEvents = db.events.length;
    const pendingApprovals = db.events.filter(e => e.status === 'pending_approval').length;
    const totalRegistrations = db.registrations.length;
    const totalAttendance = db.attendance.length;
    const overallAttendanceRate = totalRegistrations > 0 ? Number(((totalAttendance / totalRegistrations) * 100).toFixed(1)) : 0;

    // Category distribution
    const categoryCounts: Record<string, number> = {};
    db.events.forEach(e => {
      categoryCounts[e.category] = (categoryCounts[e.category] || 0) + 1;
    });

    // Top active clubs
    const topClubs = db.clubs
      .map(c => ({
        name: c.name,
        eventsCount: db.events.filter(e => e.clubId === c.id).length,
        followers: c.followedCount,
      }))
      .sort((a, b) => b.eventsCount - a.eventsCount)
      .slice(0, 5);

    // Registration trend simulation
    const registrationTrend = [
      { month: 'May', registrations: 120, attendance: 98 },
      { month: 'Jun', registrations: 180, attendance: 145 },
      { month: 'Jul', registrations: 90, attendance: 75 },
      { month: 'Aug', registrations: 340, attendance: 290 },
      { month: 'Sep', registrations: totalRegistrations, attendance: totalAttendance },
    ];

    res.json({
      metrics: {
        totalStudents,
        totalOrganizers,
        totalClubs,
        totalEvents,
        pendingApprovals,
        totalRegistrations,
        totalAttendance,
        overallAttendanceRate,
        pendingReports: db.eventReports.filter(r => r.status === 'pending').length,
      },
      categoryDistribution: Object.entries(categoryCounts).map(([name, value]) => ({ name, value })),
      topClubs,
      registrationTrend,
    });
  });

  // Admin: Approve Event
  app.post('/api/admin/events/:id/approve', requireAuth, requireRole('admin'), (req: AuthRequest, res) => {
    const db = getDb();
    const event = db.events.find(e => e.id === req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const { verificationBadge = 'official' } = req.body;
    event.status = 'published';
    event.verificationBadge = verificationBadge;
    event.updatedAt = new Date().toISOString();

    // Notify organizer
    db.notifications.push({
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      userId: event.organizerId,
      type: 'approval_status',
      title: 'Event Approved & Published! 🚀',
      message: `Your event "${event.title}" has been approved by the administration and is now live for student registrations.`,
      eventId: event.id,
      isRead: false,
      actionUrl: `/events/${event.id}`,
      createdAt: new Date().toISOString(),
    });

    saveDb();
    res.json({ success: true, event });
  });

  // Admin: Reject Event / Request Changes
  app.post('/api/admin/events/:id/reject', requireAuth, requireRole('admin'), (req: AuthRequest, res) => {
    const db = getDb();
    const event = db.events.find(e => e.id === req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const { reason, action = 'rejected' } = req.body;
    if (!reason) return res.status(400).json({ error: 'An explanation is required.' });

    event.status = action === 'request_changes' ? 'draft' : 'rejected';
    event.rejectionReason = reason;
    event.updatedAt = new Date().toISOString();

    // Notify organizer
    db.notifications.push({
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      userId: event.organizerId,
      type: 'approval_status',
      title: action === 'request_changes' ? 'Changes Requested for Event' : 'Event Submission Rejected',
      message: `Admin feedback on "${event.title}": ${reason}`,
      eventId: event.id,
      isRead: false,
      actionUrl: `/organizer/events`,
      createdAt: new Date().toISOString(),
    });

    saveDb();
    res.json({ success: true, event });
  });

  // Admin: Toggle Feature Event
  app.post('/api/admin/events/:id/feature', requireAuth, requireRole('admin'), (req: AuthRequest, res) => {
    const db = getDb();
    const event = db.events.find(e => e.id === req.params.id);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    event.isFeatured = !event.isFeatured;
    saveDb();
    res.json({ success: true, isFeatured: event.isFeatured });
  });

  // Admin: Users List
  app.get('/api/admin/users', requireAuth, requireRole('admin'), (req: AuthRequest, res) => {
    const db = getDb();
    const usersList = db.users.map(u => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      avatar: u.avatar,
      campus: u.campus,
      createdAt: u.createdAt,
    }));
    res.json(usersList);
  });

  // Admin: Change User Role
  app.put('/api/admin/users/:id/role', requireAuth, requireRole('admin'), (req: AuthRequest, res) => {
    const db = getDb();
    const user = db.users.find(u => u.id === req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { role } = req.body;
    if (!['student', 'organizer', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role.' });
    }

    user.role = role;
    saveDb();
    res.json({ success: true, user });
  });

  // Admin: Reports
  app.get('/api/admin/reports', requireAuth, requireRole('admin'), (req: AuthRequest, res) => {
    const db = getDb();
    res.json(db.eventReports.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  });

  app.put('/api/admin/reports/:id', requireAuth, requireRole('admin'), (req: AuthRequest, res) => {
    const db = getDb();
    const report = db.eventReports.find(r => r.id === req.params.id);
    if (!report) return res.status(404).json({ error: 'Report not found' });

    const { status, adminNotes } = req.body;
    if (status) report.status = status;
    if (adminNotes !== undefined) report.adminNotes = adminNotes;

    saveDb();
    res.json({ success: true, report });
  });

  // Admin: Settings
  app.get('/api/admin/settings', requireAuth, requireRole('admin'), (req: AuthRequest, res) => {
    const db = getDb();
    res.json(db.settings);
  });

  app.put('/api/admin/settings', requireAuth, requireRole('admin'), (req: AuthRequest, res) => {
    const db = getDb();
    const { collegeName, collegeEmailDomain, allowExternalEmails, autoApproveVerifiedClubs, currentSemester, campusName } = req.body;

    if (collegeName) db.settings.collegeName = collegeName;
    if (collegeEmailDomain) db.settings.collegeEmailDomain = collegeEmailDomain;
    if (allowExternalEmails !== undefined) db.settings.allowExternalEmails = allowExternalEmails;
    if (autoApproveVerifiedClubs !== undefined) db.settings.autoApproveVerifiedClubs = autoApproveVerifiedClubs;
    if (currentSemester) db.settings.currentSemester = currentSemester;
    if (campusName) db.settings.campusName = campusName;

    saveDb();
    res.json({ success: true, settings: db.settings });
  });

  // Admin: Club Management
  app.post('/api/admin/clubs', requireAuth, requireRole('admin'), (req: AuthRequest, res) => {
    const db = getDb();
    const { name, code, description, logo, category, facultyCoordinator, studentCoordinators = [] } = req.body;
    if (!name || !code) return res.status(400).json({ error: 'Name and Code are required.' });

    const newClub: Club = {
      id: `clb-${Date.now()}`,
      name,
      code,
      description: description || '',
      logo: logo || 'https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=150&auto=format&fit=crop&q=80',
      category: category || 'Technical',
      facultyCoordinator: facultyCoordinator || 'Faculty In-charge',
      studentCoordinators: Array.isArray(studentCoordinators) ? studentCoordinators : [studentCoordinators],
      memberCount: 25,
      status: 'active',
      socialLinks: {},
      followedCount: 10,
    };

    db.clubs.push(newClub);
    saveDb();
    res.status(201).json({ success: true, club: newClub });
  });

  app.put('/api/admin/clubs/:id', requireAuth, requireRole('admin'), (req: AuthRequest, res) => {
    const db = getDb();
    const club = db.clubs.find(c => c.id === req.params.id);
    if (!club) return res.status(404).json({ error: 'Club not found' });

    const { name, code, description, logo, category, facultyCoordinator, studentCoordinators, status } = req.body;
    if (name) club.name = name;
    if (code) club.code = code;
    if (description) club.description = description;
    if (logo) club.logo = logo;
    if (category) club.category = category;
    if (facultyCoordinator) club.facultyCoordinator = facultyCoordinator;
    if (studentCoordinators) club.studentCoordinators = studentCoordinators;
    if (status) club.status = status;

    saveDb();
    res.json({ success: true, club });
  });

  // ----------------------------------------------------
  // VITE MIDDLEWARE OR STATIC SERVING
  // ----------------------------------------------------

  if (process.env.NODE_ENV !== 'production') {
  const vite = await createViteServer({
    server: { middlewareMode: true, hmr: { server: httpServer } },
    appType: 'spa',
  });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`CampusPulse server active on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to boot CampusPulse server:', err);
  process.exit(1);
});
