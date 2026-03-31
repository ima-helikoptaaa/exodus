import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '@/lib/api';
import type { ApplicationResume } from '@/types';
import axios from 'axios';

function getErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const msg = error.response?.data?.message;
    if (typeof msg === 'string') return msg;
    if (Array.isArray(msg)) return msg.join(', ');
  }
  return fallback;
}

export function useApplicationResumes(applicationId: string | undefined) {
  return useQuery<ApplicationResume[]>({
    queryKey: ['application-resumes', applicationId],
    queryFn: () => api.get(`/applications/${applicationId}/resume`).then((r) => r.data),
    enabled: !!applicationId,
  });
}

export function useLinkResume() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ applicationId, ...data }: { applicationId: string; resumeId: string; resumeVersionId: string }) =>
      api.post(`/applications/${applicationId}/resume`, data).then((r) => r.data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['application-resumes', variables.applicationId] });
      qc.invalidateQueries({ queryKey: ['application', variables.applicationId] });
      toast.success('Resume linked to application');
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Failed to link resume')),
  });
}

export function useUnlinkResume() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ applicationId, resumeId }: { applicationId: string; resumeId: string }) =>
      api.delete(`/applications/${applicationId}/resume/${resumeId}`),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['application-resumes', variables.applicationId] });
      qc.invalidateQueries({ queryKey: ['application', variables.applicationId] });
      toast.success('Resume unlinked');
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Failed to unlink resume')),
  });
}
