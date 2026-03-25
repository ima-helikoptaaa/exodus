export type PipelineStage =
  | 'WISHLIST'
  | 'APPLIED'
  | 'INTRODUCTORY_CALL'
  | 'ROUND_1'
  | 'ROUND_2'
  | 'ROUND_3'
  | 'ROUND_4'
  | 'ROUND_5'
  | 'OFFER'
  | 'REJECTED'
  | 'WITHDRAWN';

export type InterviewType =
  | 'DSA'
  | 'LLD'
  | 'HLD'
  | 'SYSTEM_DESIGN'
  | 'BEHAVIORAL'
  | 'INTRO_CALL'
  | 'HR'
  | 'TAKE_HOME'
  | 'CODING_CHALLENGE'
  | 'OTHER';

export type InterviewStatus = 'UPCOMING' | 'COMPLETED' | 'CANCELLED';

export type ContactRole = 'RECRUITER' | 'HIRING_MANAGER' | 'REFERRAL' | 'INTERVIEWER' | 'OTHER';

export interface Company {
  id: string;
  name: string;
  website?: string;
  industry?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Tag {
  id: string;
  name: string;
  color?: string;
  category?: string;
}

export interface PrepTopic {
  id: string;
  interviewRoundId: string;
  title: string;
  completed: boolean;
  resourceUrl?: string;
  notes?: string;
}

export interface InterviewRound {
  id: string;
  applicationId: string;
  roundNumber: number;
  type: InterviewType;
  scheduledAt?: string;
  durationMin?: number;
  status: InterviewStatus;
  prepNotes?: string;
  reflection?: string;
  difficulty?: number;
  interviewerName?: string;
  meetingLink?: string;
  prepTopics: PrepTopic[];
  application?: Application;
}

export interface Contact {
  id: string;
  applicationId?: string;
  name: string;
  email?: string;
  phone?: string;
  linkedIn?: string;
  role: ContactRole;
  company?: string;
  lastContactedAt?: string;
  notes?: string;
  application?: Application;
}

export interface Note {
  id: string;
  applicationId?: string;
  interviewRoundId?: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface Application {
  id: string;
  companyId: string;
  company: Company;
  role: string;
  jobUrl?: string;
  jobDescription?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  location?: string;
  isRemote: boolean;
  stage: PipelineStage;
  priority: number;
  appliedDate?: string;
  followUpDate?: string;
  deadlineDate?: string;
  createdAt: string;
  updatedAt: string;
  tags: { tag: Tag; assignedAt: string }[];
  interviewRounds: InterviewRound[];
  contacts: Contact[];
  notes: Note[];
  _count?: { interviewRounds: number; notes: number; contacts: number };
}

export interface DashboardStats {
  total: number;
  byStage: { stage: PipelineStage; _count: number }[];
  responseRate: number;
  offers: number;
}

export const STAGE_LABELS: Record<PipelineStage, string> = {
  WISHLIST: 'Wishlist',
  APPLIED: 'Applied',
  INTRODUCTORY_CALL: 'Intro Call',
  ROUND_1: 'Round 1',
  ROUND_2: 'Round 2',
  ROUND_3: 'Round 3',
  ROUND_4: 'Round 4',
  ROUND_5: 'Round 5',
  OFFER: 'Offer',
  REJECTED: 'Rejected',
  WITHDRAWN: 'Withdrawn',
};

export const STAGE_ORDER: PipelineStage[] = [
  'WISHLIST',
  'APPLIED',
  'INTRODUCTORY_CALL',
  'ROUND_1',
  'ROUND_2',
  'ROUND_3',
  'ROUND_4',
  'ROUND_5',
  'OFFER',
  'REJECTED',
  'WITHDRAWN',
];

export const INTERVIEW_TYPE_LABELS: Record<InterviewType, string> = {
  DSA: 'DSA',
  LLD: 'LLD',
  HLD: 'HLD',
  SYSTEM_DESIGN: 'System Design',
  BEHAVIORAL: 'Behavioral',
  INTRO_CALL: 'Intro Call',
  HR: 'HR',
  TAKE_HOME: 'Take Home',
  CODING_CHALLENGE: 'Coding Challenge',
  OTHER: 'Other',
};

export const STAGE_COLORS: Record<PipelineStage, string> = {
  WISHLIST: 'bg-slate-100 text-slate-700 dark:bg-slate-800/50 dark:text-slate-300',
  APPLIED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  INTRODUCTORY_CALL: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
  ROUND_1: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  ROUND_2: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  ROUND_3: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  ROUND_4: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/40 dark:text-fuchsia-300',
  ROUND_5: 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300',
  OFFER: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  REJECTED: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  WITHDRAWN: 'bg-gray-100 text-gray-500 dark:bg-gray-800/50 dark:text-gray-400',
};
