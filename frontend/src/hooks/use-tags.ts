import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Tag } from '@/types';

export function useTags(category?: string) {
  return useQuery<Tag[]>({
    queryKey: ['tags', category],
    queryFn: () => api.get('/tags', { params: category ? { category } : undefined }).then((r) => r.data),
  });
}

export function useCreateTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; color?: string; category?: string }) =>
      api.post('/tags', data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tags'] }),
  });
}

export function useAssignTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { applicationId: string; tagId: string }) =>
      api.post('/tags/assign', data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['applications'] });
      qc.invalidateQueries({ queryKey: ['application'] });
    },
  });
}

export function useUnassignTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ applicationId, tagId }: { applicationId: string; tagId: string }) =>
      api.delete(`/tags/assign/${applicationId}/${tagId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['applications'] });
      qc.invalidateQueries({ queryKey: ['application'] });
    },
  });
}
