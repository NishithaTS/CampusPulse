import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  role: 'student' | 'organizer' | 'admin';
  avatar?: string;
  campus: string;
  createdAt: string;
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

export interface OrganizerProfile {
  id: string;
  userId: string;
  organizationName: string;
  type: 'club' | 'department' | 'faculty' | 'other';
  autoPublish: boolean;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  building: string;
  contactEmail: string;
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
  organizerUserId?: string;
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

export interface Event {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  posterUrl: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  registrationDeadline: string;
  venueId: string;
  venueName?: string;
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
  createdAt: string;
  updatedAt: string;
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

export interface Attendance {
  id: string;
  eventId: string;
  registrationId: string;
  userId: string;
  studentId: string;
  studentName: string;
  markedAt: string;
  markedByMethod: 'qr_scan' | 'manual';
  verificationToken: string;
}

export interface Feedback {
  id: string;
  eventId: string;
  userId: string;
  studentName: string;
  overallRating: number; // 1-5
  contentRating?: number;
  speakerRating?: number;
  organizationRating?: number;
  venueRating?: number;
  comment: string;
  submittedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'registration_confirmed' | 'event_reminder' | 'event_updated' | 'venue_changed' | 'event_cancelled' | 'deadline_approaching' | 'club_event' | 'certificate_available' | 'approval_status';
  title: string;
  message: string;
  eventId?: string;
  isRead: boolean;
  actionUrl?: string;
  createdAt: string;
}

export interface Certificate {
  id: string;
  certificateId: string; // verification code
  eventId: string;
  userId: string;
  studentName: string;
  eventName: string;
  date: string;
  organizerName: string;
  collegeName: string;
  issuedAt: string;
}

export interface EventReport {
  id: string;
  eventId: string;
  eventTitle: string;
  reportedByUserId: string;
  reporterName: string;
  reason: 'Incorrect information' | 'Fake event' | 'Wrong venue' | 'Duplicate' | 'Inappropriate content' | 'Cancelled event' | 'Other';
  description: string;
  status: 'pending' | 'reviewed' | 'dismissed' | 'action_taken';
  adminNotes?: string;
  createdAt: string;
}

export interface SystemSettings {
  collegeName: string;
  collegeEmailDomain: string;
  allowExternalEmails: boolean;
  autoApproveVerifiedClubs: boolean;
  currentSemester: string;
  campusName: string;
}

export interface DatabaseSchema {
  users: User[];
  students: StudentProfile[];
  organizers: OrganizerProfile[];
  clubs: Club[];
  departments: Department[];
  venues: Venue[];
  events: Event[];
  registrations: Registration[];
  attendance: Attendance[];
  feedback: Feedback[];
  notifications: Notification[];
  savedEvents: { id: string; userId: string; eventId: string; savedAt: string }[];
  clubFollowers: { id: string; userId: string; clubId: string; followedAt: string }[];
  certificates: Certificate[];
  eventReports: EventReport[];
  settings: SystemSettings;
}

let memoryDb: DatabaseSchema | null = null;

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function getSeedData(): DatabaseSchema {
  const salt = bcrypt.genSaltSync(10);
  const studentHash = bcrypt.hashSync('StudentPass123!', salt);
  const organizerHash = bcrypt.hashSync('OrganizerPass123!', salt);
  const adminHash = bcrypt.hashSync('AdminPass123!', salt);

  const users: User[] = [
    {
      id: 'usr-admin-1',
      email: 'admin@college.edu',
      passwordHash: adminHash,
      name: 'Dr. Robert Vance',
      role: 'admin',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
      campus: 'Main North Campus',
      createdAt: '2026-01-10T09:00:00.000Z',
    },
    {
      id: 'usr-org-1',
      email: 'birds@college.edu',
      passwordHash: organizerHash,
      name: 'BIRDS AI & Robotics Society',
      role: 'organizer',
      avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
      campus: 'Main North Campus',
      createdAt: '2026-01-15T10:00:00.000Z',
    },
    {
      id: 'usr-org-2',
      email: 'csi@college.edu',
      passwordHash: organizerHash,
      name: 'CSI Student Chapter',
      role: 'organizer',
      avatar: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=150&auto=format&fit=crop&q=80',
      campus: 'Main North Campus',
      createdAt: '2026-01-18T10:00:00.000Z',
    },
    {
      id: 'usr-student-1',
      email: 'alex.chen@college.edu',
      passwordHash: studentHash,
      name: 'Alex Chen',
      role: 'student',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      campus: 'Main North Campus',
      createdAt: '2026-02-01T11:00:00.000Z',
    },
    {
      id: 'usr-student-2',
      email: 'priya.patel@college.edu',
      passwordHash: studentHash,
      name: 'Priya Patel',
      role: 'student',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
      campus: 'Main North Campus',
      createdAt: '2026-02-02T12:00:00.000Z',
    },
  ];

  const students: StudentProfile[] = [
    {
      id: 'std-1',
      userId: 'usr-student-1',
      studentId: '2024-CS-042',
      department: 'Computer Science & Engineering',
      year: '3rd Year',
      phone: '+1 (555) 321-7890',
      interests: ['Technical', 'AI/ML', 'Hackathons', 'Workshops', 'Research'],
    },
    {
      id: 'std-2',
      userId: 'usr-student-2',
      studentId: '2024-EC-089',
      department: 'Electronics & Communication',
      year: '2nd Year',
      phone: '+1 (555) 654-1234',
      interests: ['Cultural', 'Sports', 'Workshops', 'Entrepreneurship'],
    },
  ];

  const organizers: OrganizerProfile[] = [
    {
      id: 'org-1',
      userId: 'usr-org-1',
      organizationName: 'BIRDS - Bio-Inspired Robotics & AI Society',
      type: 'club',
      autoPublish: true,
    },
    {
      id: 'org-2',
      userId: 'usr-org-2',
      organizationName: 'Computer Society of India (CSI)',
      type: 'club',
      autoPublish: false,
    },
  ];

  const departments: Department[] = [
    { id: 'dept-1', name: 'Computer Science & Engineering', code: 'CSE', building: 'Turing Hall', contactEmail: 'cse-dept@college.edu' },
    { id: 'dept-2', name: 'Electronics & Communication', code: 'ECE', building: 'Tesla Building', contactEmail: 'ece-dept@college.edu' },
    { id: 'dept-3', name: 'Mechanical Engineering', code: 'MECH', building: 'Da Vinci Complex', contactEmail: 'mech-dept@college.edu' },
    { id: 'dept-4', name: 'Management & Business Studies', code: 'MBA', building: 'Drucker Plaza', contactEmail: 'business@college.edu' },
    { id: 'dept-5', name: 'Humanities & Sciences', code: 'H&S', building: 'Aristotle Hall', contactEmail: 'humanities@college.edu' },
  ];

  const venues: Venue[] = [
    {
      id: 'ven-1',
      name: 'Main University Auditorium',
      building: 'Central Academic Block',
      room: 'Auditorium Level 1',
      capacity: 650,
      facilities: ['A/V Projection', 'Stage Lighting', 'Surround Audio', 'Wheelchair Access', 'Live Stream Rig'],
      coordinates: { x: 48, y: 35, lat: 37.7749, lng: -122.4194 },
    },
    {
      id: 'ven-2',
      name: 'Dr. APJ Abdul Kalam Seminar Hall',
      building: 'Turing Hall',
      room: 'Hall 301',
      capacity: 150,
      facilities: ['Dual Projectors', 'Smart Podium', 'AC', 'High-Speed Wi-Fi'],
      coordinates: { x: 30, y: 45, lat: 37.7752, lng: -122.4189 },
    },
    {
      id: 'ven-3',
      name: 'Innovation & Robotics Lab',
      building: 'Tesla Building',
      room: 'Lab B-12',
      capacity: 80,
      facilities: ['Soldering Stations', '3D Printers', 'Compute Clusters', 'Safety Shields'],
      coordinates: { x: 65, y: 55, lat: 37.7745, lng: -122.4178 },
    },
    {
      id: 'ven-4',
      name: 'Campus Sports Arena & Amphitheater',
      building: 'Athletics Complex',
      room: 'Court 1 & Open Amphitheater',
      capacity: 400,
      facilities: ['Outdoor Floodlights', 'PA Sound System', 'Bleachers', 'First Aid Center'],
      coordinates: { x: 80, y: 70, lat: 37.7738, lng: -122.4165 },
    },
    {
      id: 'ven-5',
      name: 'Design Thinking Studio',
      building: 'Drucker Plaza',
      room: 'Studio 204',
      capacity: 60,
      facilities: ['Whiteboards', 'Moveable Desks', 'Display Screens', 'Collaboration Pods'],
      coordinates: { x: 22, y: 75, lat: 37.7758, lng: -122.4205 },
    },
  ];

  const clubs: Club[] = [
    {
      id: 'clb-1',
      name: 'BIRDS AI & Robotics',
      code: 'BIRDS',
      description: 'Premier student research and project group dedicated to robotics, computer vision, autonomous drones, and applied AI systems.',
      logo: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=150&auto=format&fit=crop&q=80',
      category: 'Technical',
      facultyCoordinator: 'Dr. S. Ramanujan (CSE)',
      studentCoordinators: ['Karan Mehta (Lead)', 'Sneha Gupta (Tech Head)'],
      memberCount: 140,
      status: 'active',
      socialLinks: { website: 'https://birds-robotics.college.edu', instagram: '@birds_college', github: 'github.com/birds-robotics' },
      followedCount: 342,
      organizerUserId: 'usr-org-1',
    },
    {
      id: 'clb-2',
      name: 'IEEE Student Branch',
      code: 'IEEE-SB',
      description: 'Global technical professional organization inspiring technological innovation and excellence for the benefit of humanity.',
      logo: 'https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=150&auto=format&fit=crop&q=80',
      category: 'Technical',
      facultyCoordinator: 'Prof. David Miller (ECE)',
      studentCoordinators: ['Aarav Sharma (Chair)', 'Maya Lin (Vice Chair)'],
      memberCount: 220,
      status: 'active',
      socialLinks: { website: 'https://ieee.college.edu', linkedin: 'linkedin.com/school/college-ieee' },
      followedCount: 480,
    },
    {
      id: 'clb-3',
      name: 'CSI Student Chapter',
      code: 'CSI',
      description: 'Computer Society of India college chapter driving algorithmic problem solving, coding bootcamps, and software hackathons.',
      logo: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=150&auto=format&fit=crop&q=80',
      category: 'Technical',
      facultyCoordinator: 'Dr. Meenakshi Rao (CSE)',
      studentCoordinators: ['Rohan Verma (President)', 'Aditi Nair (Secretary)'],
      memberCount: 185,
      status: 'active',
      socialLinks: { website: 'https://csi.college.edu', github: 'github.com/csi-college' },
      followedCount: 395,
      organizerUserId: 'usr-org-2',
    },
    {
      id: 'clb-4',
      name: 'Rhythm & Notes Cultural Society',
      code: 'CULTURAL',
      description: 'The heartbeat of campus performing arts, organizing theatre fests, acoustic nights, western music showcases, and dance battles.',
      logo: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=150&auto=format&fit=crop&q=80',
      category: 'Cultural',
      facultyCoordinator: 'Prof. Elena Rostova (H&S)',
      studentCoordinators: ['Nikhil Dsouza (Coordinator)', 'Tanya Kapoor (Dance Lead)'],
      memberCount: 310,
      status: 'active',
      socialLinks: { instagram: '@rhythm_notes_arts' },
      followedCount: 620,
    },
    {
      id: 'clb-5',
      name: 'Athletics & Sports Council',
      code: 'SPORTS',
      description: 'Overseeing inter-department tournaments, football leagues, basketball championships, fitness bootcamps, and annual athletic meets.',
      logo: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=150&auto=format&fit=crop&q=80',
      category: 'Sports',
      facultyCoordinator: 'Coach Marcus Sterling (Physical Ed)',
      studentCoordinators: ['Devendra Singh (Sports Sec)', 'Chloe Bennett (Vice Sec)'],
      memberCount: 260,
      status: 'active',
      socialLinks: { instagram: '@campuspulse_sports' },
      followedCount: 410,
    },
    {
      id: 'clb-6',
      name: 'E-Cell (Entrepreneurship Cell)',
      code: 'ECELL',
      description: 'Empowering campus innovators, fostering startup incubation, pitch fests, venture capitalist networking, and founder fireside chats.',
      logo: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=150&auto=format&fit=crop&q=80',
      category: 'Entrepreneurship',
      facultyCoordinator: 'Dr. Arvind Swaminathan (Management)',
      studentCoordinators: ['Varun Bajaj (Lead)', 'Simran Kaur (Incubation Lead)'],
      memberCount: 160,
      status: 'active',
      socialLinks: { website: 'https://ecell.college.edu', linkedin: 'linkedin.com/company/ecell-campus' },
      followedCount: 375,
    },
  ];

  // Dynamic realistic dates
  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const in3Days = new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0];
  const in5Days = new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0];
  const in7Days = new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0];
  const past3Days = new Date(Date.now() - 86400000 * 3).toISOString().split('T')[0];

  const events: Event[] = [
    {
      id: 'evt-1',
      title: 'Generative AI & LLM Engineering Workshop',
      description: 'Deep dive into state-of-the-art Generative AI frameworks, prompt orchestration, retrieval augmented generation (RAG), and deploying production LLMs on Google Cloud Vertex AI and Gemini APIs. Hands-on coding session with provided GPU cloud environments.',
      category: 'Technical',
      tags: ['AI/ML', 'Python', 'Google Cloud', 'Hands-on', 'Workshop'],
      posterUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
      date: todayStr,
      startTime: '15:30',
      endTime: '18:00',
      registrationDeadline: todayStr + 'T14:00:00.000Z',
      venueId: 'ven-2',
      venueName: 'Dr. APJ Abdul Kalam Seminar Hall (Turing 301)',
      organizerId: 'usr-org-1',
      organizerName: 'BIRDS AI & Robotics Society',
      clubId: 'clb-1',
      capacity: 120,
      registeredCount: 87,
      attendedCount: 73,
      eligibility: 'Open to 2nd, 3rd, and 4th Year Engineering & CS students with basic Python proficiency.',
      entryRequirements: 'Bring your laptop with Chrome and Python 3.10+ installed. Power strips provided.',
      contactInfo: 'birds-workshop@college.edu | +1 (555) 901-2345',
      speaker: {
        name: 'Dr. Anya Sharma',
        role: 'Staff Research Engineer at Google DeepMind',
        topic: 'Foundations of Modern Multimodal Reasoning Models',
        bio: 'Alumna of 2018 batch, author of 12 top-tier NeurIPS & ICML publications on efficient LLM fine-tuning.',
        avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
      },
      customFields: [
        { id: 'cf-gh', label: 'GitHub Profile URL', type: 'text', required: true },
        { id: 'cf-level', label: 'Experience with PyTorch/TensorFlow', type: 'select', options: ['Beginner', 'Intermediate', 'Advanced'], required: true },
      ],
      waitlistEnabled: true,
      isPaid: false,
      status: 'published',
      verificationBadge: 'verified_club',
      isFeatured: true,
      qrSessionToken: 'PULSE-EVT1-TOKEN-SESSION-8891',
      createdAt: '2026-09-01T10:00:00.000Z',
      updatedAt: '2026-09-15T14:00:00.000Z',
    },
    {
      id: 'evt-2',
      title: 'HackCampus 2026: 36-Hour National Hackathon',
      description: 'The flagship annual 36-hour hackathon of the university. Tackle problem statements across Smart Cities, FinTech, Healthcare, Autonomous Mobility, and Climate Tech. Mentorship from industry tech leads, hardware kits provided, and $15,000 prize pool.',
      category: 'Hackathons',
      tags: ['Hackathon', 'Coding', 'Prizes', 'Mentorship', 'Flagship'],
      posterUrl: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&auto=format&fit=crop&q=80',
      date: in5Days,
      startTime: '09:00',
      endTime: '21:00',
      registrationDeadline: in3Days + 'T23:59:00.000Z',
      venueId: 'ven-1',
      venueName: 'Main University Auditorium & Exhibition Complex',
      organizerId: 'usr-org-2',
      organizerName: 'CSI Student Chapter',
      clubId: 'clb-3',
      capacity: 350,
      registeredCount: 298,
      attendedCount: 0,
      eligibility: 'All undergraduate and postgraduate college students. Teams of 2 to 4 members.',
      entryRequirements: 'College photo ID card and registration confirmation QR pass required at security gate.',
      contactInfo: 'hackcampus@college.edu | +1 (555) 789-0123',
      speaker: {
        name: 'Vikram Malhotra & Tech Jury',
        role: 'VP of Engineering, CloudScale & Angel Investor',
        topic: 'Building Venture-Scale Products During College',
      },
      waitlistEnabled: true,
      isPaid: false,
      status: 'published',
      verificationBadge: 'official',
      isFeatured: true,
      qrSessionToken: 'PULSE-EVT2-TOKEN-SESSION-4421',
      createdAt: '2026-09-02T11:00:00.000Z',
      updatedAt: '2026-09-18T16:00:00.000Z',
    },
    {
      id: 'evt-3',
      title: 'Annual Inter-College Acoustic & Indie Music Night',
      description: 'An enchanting evening under the stars featuring student bands, acoustic vocal ensembles, violin solos, and guest indie songwriter performances. Food trucks, student merchandise stalls, and illuminated amphitheatres.',
      category: 'Cultural',
      tags: ['Music', 'Concert', 'Student Life', 'Bands', 'Evening'],
      posterUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80',
      date: in3Days,
      startTime: '18:00',
      endTime: '21:30',
      registrationDeadline: in3Days + 'T16:00:00.000Z',
      venueId: 'ven-4',
      venueName: 'Campus Sports Arena & Amphitheater',
      organizerId: 'usr-admin-1',
      organizerName: 'Rhythm & Notes Cultural Society',
      clubId: 'clb-4',
      capacity: 400,
      registeredCount: 382,
      attendedCount: 0,
      eligibility: 'Open to all university students, faculty, and verified guests.',
      entryRequirements: 'Show your digital CampusPulse pass on your phone for wristband entry.',
      contactInfo: 'cultural-fest@college.edu',
      waitlistEnabled: true,
      isPaid: false,
      status: 'published',
      verificationBadge: 'official',
      isFeatured: true,
      qrSessionToken: 'PULSE-EVT3-TOKEN-SESSION-9912',
      createdAt: '2026-09-05T12:00:00.000Z',
      updatedAt: '2026-09-19T09:00:00.000Z',
    },
    {
      id: 'evt-4',
      title: 'Campus Founder Pitch & Venture Showcase',
      description: 'Student founders pitch early-stage software, hardware, and social impact startups before a panel of venture capital partners, alumni angel investors, and university innovation board directors. Winners receive $5,000 seed grants and incubation space.',
      category: 'Entrepreneurship',
      tags: ['Startups', 'Pitch', 'Venture Capital', 'Grants', 'Networking'],
      posterUrl: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800&auto=format&fit=crop&q=80',
      date: in7Days,
      startTime: '14:00',
      endTime: '17:30',
      registrationDeadline: in5Days + 'T23:59:00.000Z',
      venueId: 'ven-5',
      venueName: 'Design Thinking Studio (Drucker 204)',
      organizerId: 'usr-admin-1',
      organizerName: 'E-Cell (Entrepreneurship Cell)',
      clubId: 'clb-6',
      capacity: 75,
      registeredCount: 62,
      attendedCount: 0,
      eligibility: 'All students interested in startups, entrepreneurship, or joining student venture teams.',
      entryRequirements: 'Smart casual dress code. Pitch decks must be submitted 48h prior.',
      contactInfo: 'ecell-pitches@college.edu',
      speaker: {
        name: 'Sarah Jenkins',
        role: 'Partner at Catalyst Ventures',
        topic: 'What Early Investors Look For in Technical Student Founders',
      },
      waitlistEnabled: true,
      isPaid: false,
      status: 'published',
      verificationBadge: 'verified_club',
      isFeatured: false,
      qrSessionToken: 'PULSE-EVT4-TOKEN-SESSION-3310',
      createdAt: '2026-09-06T14:00:00.000Z',
      updatedAt: '2026-09-17T11:00:00.000Z',
    },
    {
      id: 'evt-5',
      title: 'Autonomous Drone Navigation & Embedded ROS2 Bootcamp',
      description: 'Comprehensive physical workshop covering PX4 flight controllers, ROS2 micro-nodes, obstacle avoidance using depth sensors, and real quadcopter flight testing in the indoor flight testing cage.',
      category: 'Workshops',
      tags: ['Robotics', 'Drones', 'ROS2', 'Hardware', 'Sensors'],
      posterUrl: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&auto=format&fit=crop&q=80',
      date: past3Days,
      startTime: '10:00',
      endTime: '16:00',
      registrationDeadline: past3Days + 'T09:00:00.000Z',
      venueId: 'ven-3',
      venueName: 'Innovation & Robotics Lab (Tesla B-12)',
      organizerId: 'usr-org-1',
      organizerName: 'BIRDS AI & Robotics Society',
      clubId: 'clb-1',
      capacity: 45,
      registeredCount: 45,
      attendedCount: 42,
      eligibility: 'ECE, CSE, and Mech students.',
      entryRequirements: 'Safety goggles provided. Close-toed footwear mandatory in the robotics lab.',
      contactInfo: 'birds-drones@college.edu',
      speaker: {
        name: 'Prof. K. Sundaram',
        role: 'Director, Unmanned Systems Lab',
        topic: 'Kalman Filters & Visual Inertial Odometry in Real Flight',
      },
      waitlistEnabled: false,
      isPaid: false,
      status: 'completed',
      verificationBadge: 'verified_club',
      isFeatured: false,
      qrSessionToken: 'PULSE-EVT5-COMPLETED',
      createdAt: '2026-08-20T10:00:00.000Z',
      updatedAt: '2026-09-20T18:00:00.000Z',
    },
    {
      id: 'evt-6',
      title: 'Inter-Department 7-a-Side Football Championship',
      description: 'Kickoff tournament featuring 16 department teams battling for the Chancellor Trophy. Knockout rounds, dynamic commentary, refreshments, and athletic scouts attending.',
      category: 'Sports',
      tags: ['Football', 'Championship', 'Tournament', 'Trophy', 'Outdoor'],
      posterUrl: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&auto=format&fit=crop&q=80',
      date: tomorrow,
      startTime: '16:30',
      endTime: '20:00',
      registrationDeadline: todayStr + 'T20:00:00.000Z',
      venueId: 'ven-4',
      venueName: 'Campus Sports Arena & Amphitheater',
      organizerId: 'usr-admin-1',
      organizerName: 'Athletics & Sports Council',
      clubId: 'clb-5',
      capacity: 250,
      registeredCount: 180,
      attendedCount: 0,
      eligibility: 'Spectators welcome across all batches. Team rosters locked.',
      entryRequirements: 'Campus ID card required for stand entry.',
      contactInfo: 'sports@college.edu',
      waitlistEnabled: true,
      isPaid: false,
      status: 'published',
      verificationBadge: 'department',
      isFeatured: false,
      qrSessionToken: 'PULSE-EVT6-TOKEN-SESSION-7723',
      createdAt: '2026-09-10T12:00:00.000Z',
      updatedAt: '2026-09-18T10:00:00.000Z',
    },
    {
      id: 'evt-7',
      title: 'Cybersecurity Threat Modeling & CTF Challenge',
      description: 'Capture-the-flag competition focusing on web app vulnerabilities, cryptography breakdowns, binary reverse engineering, and cloud configuration exploits. Sponsored by leading security firms.',
      category: 'Competitions',
      tags: ['Security', 'CTF', 'Cyber', 'Hacking', 'Cryptography'],
      posterUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800&auto=format&fit=crop&q=80',
      date: in7Days,
      startTime: '10:00',
      endTime: '15:00',
      registrationDeadline: in5Days + 'T23:59:00.000Z',
      venueId: 'ven-2',
      venueName: 'Dr. APJ Abdul Kalam Seminar Hall (Turing 301)',
      organizerId: 'usr-org-2',
      organizerName: 'CSI Student Chapter',
      clubId: 'clb-3',
      capacity: 100,
      registeredCount: 54,
      attendedCount: 0,
      eligibility: 'Solo or duo participation. Open to all students.',
      entryRequirements: 'Kali Linux VM or preferred security tools installed.',
      contactInfo: 'csi-ctf@college.edu',
      waitlistEnabled: true,
      isPaid: false,
      status: 'pending_approval',
      verificationBadge: 'none',
      isFeatured: false,
      qrSessionToken: 'PULSE-EVT7-PENDING',
      createdAt: '2026-09-18T14:00:00.000Z',
      updatedAt: '2026-09-18T14:00:00.000Z',
    },
  ];

  const registrations: Registration[] = [
    {
      id: 'reg-1',
      eventId: 'evt-1',
      userId: 'usr-student-1',
      studentId: '2024-CS-042',
      studentName: 'Alex Chen',
      studentEmail: 'alex.chen@college.edu',
      department: 'Computer Science & Engineering',
      year: '3rd Year',
      phone: '+1 (555) 321-7890',
      customData: { 'GitHub Profile URL': 'https://github.com/alexchen-tech', 'Experience with PyTorch/TensorFlow': 'Intermediate' },
      status: 'confirmed',
      registeredAt: '2026-09-12T10:30:00.000Z',
      qrTicketCode: 'CAMPUS-PASS-EVT1-USR1-CONFIRMED',
    },
    {
      id: 'reg-2',
      eventId: 'evt-5',
      userId: 'usr-student-1',
      studentId: '2024-CS-042',
      studentName: 'Alex Chen',
      studentEmail: 'alex.chen@college.edu',
      department: 'Computer Science & Engineering',
      year: '3rd Year',
      phone: '+1 (555) 321-7890',
      status: 'confirmed',
      registeredAt: '2026-08-25T14:20:00.000Z',
      qrTicketCode: 'CAMPUS-PASS-EVT5-USR1-CONFIRMED',
    },
  ];

  const attendance: Attendance[] = [
    {
      id: 'att-1',
      eventId: 'evt-5',
      registrationId: 'reg-2',
      userId: 'usr-student-1',
      studentId: '2024-CS-042',
      studentName: 'Alex Chen',
      markedAt: past3Days + 'T10:15:30.000Z',
      markedByMethod: 'qr_scan',
      verificationToken: 'VERIF-TOKEN-PASS-99120',
    },
  ];

  const feedback: Feedback[] = [
    {
      id: 'fb-1',
      eventId: 'evt-5',
      userId: 'usr-student-1',
      studentName: 'Alex Chen',
      overallRating: 5,
      contentRating: 5,
      speakerRating: 5,
      organizationRating: 4,
      venueRating: 5,
      comment: 'Super practical hands-on session! Flying the real quadcopters with ROS2 topics was mindblowing.',
      submittedAt: past3Days + 'T17:00:00.000Z',
    },
  ];

  const certificates: Certificate[] = [
    {
      id: 'cert-1',
      certificateId: 'CP-CERT-2026-09-88124',
      eventId: 'evt-5',
      userId: 'usr-student-1',
      studentName: 'Alex Chen',
      eventName: 'Autonomous Drone Navigation & Embedded ROS2 Bootcamp',
      date: past3Days,
      organizerName: 'BIRDS AI & Robotics Society',
      collegeName: 'Apex Institute of Technology & Science',
      issuedAt: past3Days + 'T19:00:00.000Z',
    },
  ];

  const notifications: Notification[] = [
    {
      id: 'notif-1',
      userId: 'usr-student-1',
      type: 'registration_confirmed',
      title: 'Registration Confirmed 🎉',
      message: 'You are registered for Generative AI & LLM Engineering Workshop. Your digital QR pass is ready.',
      eventId: 'evt-1',
      isRead: false,
      actionUrl: '/events/evt-1',
      createdAt: '2026-09-12T10:30:05.000Z',
    },
    {
      id: 'notif-2',
      userId: 'usr-student-1',
      type: 'venue_changed',
      title: '⚠️ Venue Updated',
      message: 'Generative AI & LLM Workshop has moved to Dr. APJ Abdul Kalam Seminar Hall (Turing 301).',
      eventId: 'evt-1',
      isRead: false,
      actionUrl: '/events/evt-1',
      createdAt: todayStr + 'T08:00:00.000Z',
    },
    {
      id: 'notif-3',
      userId: 'usr-student-1',
      type: 'certificate_available',
      title: 'Official Certificate Issued 📜',
      message: 'Your verifiable certificate of completion for Autonomous Drone Navigation is now available.',
      eventId: 'evt-5',
      isRead: true,
      actionUrl: '/certificates',
      createdAt: past3Days + 'T19:05:00.000Z',
    },
  ];

  const savedEvents = [
    { id: 'sv-1', userId: 'usr-student-1', eventId: 'evt-2', savedAt: '2026-09-15T11:00:00.000Z' },
    { id: 'sv-2', userId: 'usr-student-1', eventId: 'evt-3', savedAt: '2026-09-16T15:20:00.000Z' },
  ];

  const clubFollowers = [
    { id: 'cfw-1', userId: 'usr-student-1', clubId: 'clb-1', followedAt: '2026-02-10T10:00:00.000Z' },
    { id: 'cfw-2', userId: 'usr-student-1', clubId: 'clb-3', followedAt: '2026-02-15T12:00:00.000Z' },
  ];

  const eventReports: EventReport[] = [
    {
      id: 'rep-1',
      eventId: 'evt-7',
      eventTitle: 'Cybersecurity Threat Modeling & CTF Challenge',
      reportedByUserId: 'usr-student-2',
      reporterName: 'Priya Patel',
      reason: 'Wrong venue',
      description: 'The seminar hall is currently under audio rewiring for tomorrow morning.',
      status: 'pending',
      createdAt: '2026-09-19T11:00:00.000Z',
    },
  ];

  const settings: SystemSettings = {
    collegeName: 'Apex Institute of Technology & Science',
    collegeEmailDomain: 'college.edu',
    allowExternalEmails: true,
    autoApproveVerifiedClubs: false,
    currentSemester: 'Fall 2026',
    campusName: 'Main North Campus',
  };

  return {
    users,
    students,
    organizers,
    clubs,
    departments,
    venues,
    events,
    registrations,
    attendance,
    feedback,
    notifications,
    savedEvents,
    clubFollowers,
    certificates,
    eventReports,
    settings,
  };
}

export function getDb(): DatabaseSchema {
  if (memoryDb) return memoryDb;
  ensureDataDir();

  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      memoryDb = JSON.parse(raw);
      return memoryDb!;
    } catch (e) {
      console.error('Failed to parse database file, re-seeding:', e);
    }
  }

  memoryDb = getSeedData();
  saveDb();
  return memoryDb;
}

export function saveDb() {
  if (!memoryDb) return;
  ensureDataDir();
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(memoryDb, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to write database file:', e);
  }
}
