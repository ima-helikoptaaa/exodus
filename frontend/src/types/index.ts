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
  source?: string;
  jobDescription?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  location?: string;
  isRemote: boolean;
  stage: PipelineStage;
  priority: number;
  matchScore?: number;
  matchReasons?: string;
  postedAt?: string;
  appliedDate?: string;
  followUpDate?: string;
  deadlineDate?: string;
  createdAt: string;
  updatedAt: string;
  tags: { tag: Tag; assignedAt: string }[];
  interviewRounds: InterviewRound[];
  contacts: Contact[];
  notes: Note[];
  applicationResumes?: ApplicationResume[];
  _count?: { interviewRounds: number; notes: number; contacts: number };
}

export interface DashboardStats {
  total: number;
  byStage: { stage: PipelineStage; _count: number }[];
  responseRate: number;
  offers: number;
}

// Resume types

export type ProfileSection =
  | 'SUMMARY'
  | 'EXPERIENCE'
  | 'SKILLS'
  | 'PROJECTS'
  | 'EDUCATION'
  | 'ACHIEVEMENTS'
  | 'CERTIFICATIONS';

export const PROFILE_SECTION_LABELS: Record<ProfileSection, string> = {
  SUMMARY: 'Professional Summary',
  EXPERIENCE: 'Work Experience',
  SKILLS: 'Skills',
  PROJECTS: 'Projects',
  EDUCATION: 'Education',
  ACHIEVEMENTS: 'Achievements',
  CERTIFICATIONS: 'Certifications',
};

export const PROFILE_SECTIONS: ProfileSection[] = [
  'SUMMARY',
  'EXPERIENCE',
  'SKILLS',
  'PROJECTS',
  'EDUCATION',
  'ACHIEVEMENTS',
  'CERTIFICATIONS',
];

export interface MasterProfile {
  id: string;
  sections: Record<ProfileSection, string>;
  createdAt: string;
  updatedAt: string;
}

export interface Resume {
  id: string;
  name: string;
  description?: string;
  currentVersionId?: string;
  currentVersion?: ResumeVersion;
  createdAt: string;
  updatedAt: string;
  versions?: ResumeVersion[];
  applicationResumes?: ApplicationResume[];
  _count?: { versions: number; applicationResumes: number };
}

export interface ResumeVersion {
  id: string;
  resumeId: string;
  latexSource: string;
  versionNumber: number;
  changeNote?: string;
  createdAt: string;
}

export interface ApplicationResume {
  id: string;
  applicationId: string;
  resumeId: string;
  resumeVersionId: string;
  resume?: Resume;
  resumeVersion?: ResumeVersion;
  application?: Application;
  linkedAt: string;
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
  WISHLIST: 'bg-slate-100 text-slate-600 dark:bg-slate-500/10 dark:text-slate-400',
  APPLIED: 'bg-teal-100 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400',
  INTRODUCTORY_CALL: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-400',
  ROUND_1: 'bg-sky-100 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400',
  ROUND_2: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400',
  ROUND_3: 'bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400',
  ROUND_4: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/10 dark:text-fuchsia-400',
  ROUND_5: 'bg-pink-100 text-pink-700 dark:bg-pink-500/10 dark:text-pink-400',
  OFFER: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  REJECTED: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400',
  WITHDRAWN: 'bg-gray-100 text-gray-500 dark:bg-gray-500/10 dark:text-gray-500',
};

export const STAGE_DOT_COLORS: Record<PipelineStage, string> = {
  WISHLIST: 'bg-slate-400',
  APPLIED: 'bg-teal-400',
  INTRODUCTORY_CALL: 'bg-cyan-400',
  ROUND_1: 'bg-sky-400',
  ROUND_2: 'bg-indigo-400',
  ROUND_3: 'bg-violet-400',
  ROUND_4: 'bg-fuchsia-400',
  ROUND_5: 'bg-pink-400',
  OFFER: 'bg-emerald-400',
  REJECTED: 'bg-red-400',
  WITHDRAWN: 'bg-gray-500',
};

// Scout types

export interface ScoutRun {
  id: string;
  startedAt: string;
  finishedAt?: string;
  companiesChecked: number;
  jobsScanned: number;
  jobsAdded: number;
  jobsSkipped: number;
  status: string;
  summary?: string;
  _count?: { logs: number };
}

export interface ScoutLog {
  id: string;
  scoutRunId: string;
  companyName: string;
  role: string;
  jobUrl?: string;
  location?: string;
  action: string;
  reason?: string;
  matchScore?: number;
  createdAt: string;
}

export interface ScoutRunResult {
  runId: string;
  companiesChecked: number;
  jobsScanned: number;
  jobsAdded: number;
  jobsSkipped: number;
  scoringFailures: number;
  outage: boolean;
  preview?: Array<{
    company: string;
    role: string;
    location: string;
    score: number;
    url: string;
  }>;
}
