import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '@/lib/api';
import type { Resume, ResumeVersion } from '@/types';
import axios from 'axios';

function getErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const msg = error.response?.data?.message;
    if (typeof msg === 'string') return msg;
    if (Array.isArray(msg)) return msg.join(', ');
  }
  return fallback;
}

export function useResumes() {
  return useQuery<Resume[]>({
    queryKey: ['resumes'],
    queryFn: () => api.get('/resumes').then((r) => r.data),
  });
}

export function useResume(id: string | undefined) {
  return useQuery<Resume>({
    queryKey: ['resume', id],
    queryFn: () => api.get(`/resumes/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateResume() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string; latexSource?: string }) =>
      api.post('/resumes', data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['resumes'] });
      toast.success('Resume created');
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Failed to create resume')),
  });
}

export function useUpdateResume() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; description?: string }) =>
      api.patch(`/resumes/${id}`, data).then((r) => r.data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['resumes'] });
      qc.invalidateQueries({ queryKey: ['resume', variables.id] });
      toast.success('Resume updated');
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Failed to update resume')),
  });
}

export function useDeleteResume() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/resumes/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['resumes'] });
      toast.success('Resume deleted');
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Failed to delete resume')),
  });
}

export function useResumeVersions(resumeId: string | undefined) {
  return useQuery<ResumeVersion[]>({
    queryKey: ['resume-versions', resumeId],
    queryFn: () => api.get(`/resumes/${resumeId}/versions`).then((r) => r.data),
    enabled: !!resumeId,
  });
}

export function useSaveVersion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ resumeId, ...data }: { resumeId: string; latexSource: string; changeNote?: string }) =>
      api.post(`/resumes/${resumeId}/versions`, data).then((r) => r.data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['resume', variables.resumeId] });
      qc.invalidateQueries({ queryKey: ['resume-versions', variables.resumeId] });
      qc.invalidateQueries({ queryKey: ['resumes'] });
      toast.success('Version saved');
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Failed to save version')),
  });
}

export function useRestoreVersion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ resumeId, versionId }: { resumeId: string; versionId: string }) =>
      api.patch(`/resumes/${resumeId}/versions/${versionId}/restore`).then((r) => r.data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['resume', variables.resumeId] });
      qc.invalidateQueries({ queryKey: ['resume-versions', variables.resumeId] });
      toast.success('Version restored');
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Failed to restore version')),
  });
}

export function useCompileResume() {
  return useMutation({
    mutationFn: async (latexSource: string): Promise<string> => {
      const response = await api.post('/resumes/compile', { latexSource }, { responseType: 'blob' });
      return URL.createObjectURL(response.data);
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Failed to compile PDF')),
  });
}
