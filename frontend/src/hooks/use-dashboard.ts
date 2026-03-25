import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { DashboardStats, InterviewRound, InterviewType, Application } from '@/types';

export function useDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => api.get('/dashboard/stats').then((r) => r.data),
  });
}

export function useDailyApplications(days = 30) {
  return useQuery<{ date: string; count: number }[]>({
    queryKey: ['dashboard', 'daily', days],
    queryFn: () => api.get('/dashboard/daily', { params: { days } }).then((r) => r.data),
  });
}

export function useDashboardUpcoming() {
  return useQuery<InterviewRound[]>({
    queryKey: ['dashboard', 'upcoming'],
    queryFn: () => api.get('/dashboard/upcoming-interviews').then((r) => r.data),
  });
}

export function useFollowUps() {
  return useQuery<Application[]>({
    queryKey: ['dashboard', 'follow-ups'],
    queryFn: () => api.get('/dashboard/follow-ups').then((r) => r.data),
  });
}

export function useActivityHeatmap(months = 6) {
  return useQuery<{ date: string; count: number }[]>({
    queryKey: ['dashboard', 'heatmap', months],
    queryFn: () => api.get('/dashboard/activity-heatmap', { params: { months } }).then((r) => r.data),
  });
}

export interface InterviewInsight {
  id: string;
  companyName: string;
  applicationId: string;
  role: string;
  type: InterviewType;
  roundNumber: number;
  difficulty: number | null;
  reflection: string | null;
  scheduledAt: string | null;
  prepTopics: { title: string; completed: boolean }[];
}

export function useInterviewInsights() {
  return useQuery<InterviewInsight[]>({
    queryKey: ['dashboard', 'interview-insights'],
    queryFn: () => api.get('/dashboard/interview-insights').then((r) => r.data),
  });
}
