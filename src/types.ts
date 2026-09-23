export type UserRole = 'student' | 'coordinator' | 'organizer' | 'admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  campus: string;
  createdAt?: string;
}

export interface StudentProfile {
  id: string;
  userId: string;
  studentId: string;
  department: string;
  year: string;
  phone: string;
  interests: string[];
}

export interface Venue {
  id: string;
  name: string;
  building: string;
  room: string;
  capacity: number;
  facilities: string[];
  coordinates: { x: number; y: number; lat?: number; lng?: number };
}

export interface EventSpeaker {
  name: string;
  role: string;
  topic?: string;
  bio?: string;
  avatar?: string;
}

export interface CustomField {
  id: string;
  label: string;
  type: 'text' | 'select' | 'checkbox';
  options?: string[];
  required: boolean;
}

export interface EventItem {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  posterUrl: string;
  date: string;
  startTime: string;
  endTime: string;
  registrationDeadline: string;
  venueId: string;
  venueName?: string;
  venueDetails?: Venue;
  organizerId: string;
  organizerName: string;
  clubId?: string;
  departmentId?: string;
  capacity: number;
  registeredCount: number;
  attendedCount: number;
  eligibility: string;
  entryRequirements: string;
  contactInfo: string;
  speaker?: EventSpeaker;
  customFields?: CustomField[];
  waitlistEnabled: boolean;
  isPaid: boolean;
  feeAmount?: number;
  status: 'draft' | 'pending_approval' | 'approved' | 'published' | 'completed' | 'cancelled' | 'rejected';
  verificationBadge: 'none' | 'official' | 'verified_club' | 'department';
  isFeatured: boolean;
  rejectionReason?: string;
  qrSessionToken?: string;
  certificateOffered?: boolean;
  isRegistered?: boolean;
  registrationDetails?: Registration;
  isSaved?: boolean;
  hasAttended?: boolean;
  attendanceDetails?: any;
  hasFeedback?: boolean;
  recommendationScore?: number;
  matchReason?: string;
}

export interface Registration {
  id: string;
  eventId: string;
  userId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  department: string;
  year: string;
  phone: string;
  customData?: Record<string, any>;
  status: 'confirmed' | 'waitlisted' | 'cancelled';
  registeredAt: string;
  qrTicketCode: string;
}

export interface Club {
  id: string;
  name: string;
  code: string;
  description: string;
  logo: string;
  category: string;
  facultyCoordinator: string;
  studentCoordinators: string[];
  memberCount: number;
  status: 'active' | 'suspended' | 'pending';
  socialLinks: { website?: string; instagram?: string; linkedin?: string; github?: string };
  followedCount: number;
  upcomingEventsCount?: number;
  isFollowed?: boolean;
  upcomingEvents?: EventItem[];
  pastEvents?: EventItem[];
}

export interface Certificate {
  id: string;
  certificateId: string;
  eventId: string;
  userId: string;
  studentName: string;
  eventName: string;
  date: string;
  organizerName: string;
  collegeName: string;
  issuedAt: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  eventId?: string;
  isRead: boolean;
  actionUrl?: string;
  createdAt: string;
}

export interface EventReport {
  id: string;
  eventId: string;
  eventTitle: string;
  reportedByUserId: string;
  reporterName: string;
  reason: string;
  description: string;
  status: 'pending' | 'reviewed' | 'dismissed' | 'action_taken';
  adminNotes?: string;
  createdAt: string;
}
