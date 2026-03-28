import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '@/lib/api';
import type { InterviewRound } from '@/types';
import axios from 'axios';

function getErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const msg = error.response?.data?.message;
    if (typeof msg === 'string') return msg;
    if (Array.isArray(msg)) return msg.join(', ');
  }
  return fallback;
}

export function useInterviewRounds(applicationId: string | undefined) {
  return useQuery<InterviewRound[]>({
    queryKey: ['interviews', applicationId],
    queryFn: () => api.get(`/interviews/application/${applicationId}`).then((r) => r.data),
    enabled: !!applicationId,
  });
}

export function useUpcomingInterviews(days = 7) {
  return useQuery<InterviewRound[]>({
    queryKey: ['interviews', 'upcoming', days],
    queryFn: () => api.get('/interviews/upcoming', { params: { days } }).then((r) => r.data),
  });
}

export function useCreateInterviewRound() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/interviews', data).then((r) => r.data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['interviews', variables.applicationId] });
      qc.invalidateQueries({ queryKey: ['application'] });
      toast.success('Interview round added');
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Failed to add interview round')),
  });
}

export function useUpdateInterviewRound() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      api.patch(`/interviews/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['interviews'] });
      qc.invalidateQueries({ queryKey: ['application'] });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Failed to update interview round')),
  });
}

export function useDeleteInterviewRound() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/interviews/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['interviews'] });
      qc.invalidateQueries({ queryKey: ['application'] });
      toast.success('Interview round deleted');
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Failed to delete interview round')),
  });
}

export function useAddPrepTopic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ roundId, ...data }: { roundId: string; title: string }) =>
      api.post(`/interviews/${roundId}/prep-topics`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['interviews'] });
      qc.invalidateQueries({ queryKey: ['application'] });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Failed to add prep topic')),
  });
}

export function useUpdatePrepTopic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      api.patch(`/interviews/prep-topics/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['interviews'] });
      qc.invalidateQueries({ queryKey: ['application'] });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Failed to update prep topic')),
  });
}

export function useDeletePrepTopic() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/interviews/prep-topics/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['interviews'] });
      qc.invalidateQueries({ queryKey: ['application'] });
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Failed to delete prep topic')),
  });
}
