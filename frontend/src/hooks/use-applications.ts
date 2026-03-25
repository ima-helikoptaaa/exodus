import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '@/lib/api';
import type { Application, PipelineStage } from '@/types';

export function useApplications(params?: { stage?: PipelineStage; search?: string }) {
  return useQuery<Application[]>({
    queryKey: ['applications', params],
    queryFn: () => api.get('/applications', { params }).then((r) => r.data),
  });
}

export function useApplication(id: string | undefined) {
  return useQuery<Application>({
    queryKey: ['application', id],
    queryFn: () => api.get(`/applications/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/applications', data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['applications'] });
      toast.success('Application created');
    },
    onError: () => toast.error('Failed to create application'),
  });
}

export function useUpdateApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      api.patch(`/applications/${id}`, data).then((r) => r.data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['applications'] });
      qc.invalidateQueries({ queryKey: ['application', variables.id] });
      toast.success('Application updated');
    },
    onError: () => toast.error('Failed to update application'),
  });
}

export function useUpdateStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: PipelineStage }) =>
      api.patch(`/applications/${id}/stage`, { stage }).then((r) => r.data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['applications'] });
      qc.invalidateQueries({ queryKey: ['application', variables.id] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Stage updated');
    },
    onError: () => toast.error('Failed to update stage'),
  });
}

export function useDeleteApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/applications/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['applications'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Application deleted');
    },
    onError: () => toast.error('Failed to delete application'),
  });
}
