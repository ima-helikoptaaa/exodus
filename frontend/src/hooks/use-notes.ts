import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '@/lib/api';

export function useCreateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { applicationId?: string; interviewRoundId?: string; content: string }) =>
      api.post('/notes', data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['application'] });
      toast.success('Note added');
    },
    onError: () => toast.error('Failed to add note'),
  });
}

export function useUpdateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      api.patch(`/notes/${id}`, { content }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['application'] });
      toast.success('Note updated');
    },
    onError: () => toast.error('Failed to update note'),
  });
}

export function useDeleteNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/notes/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['application'] });
      toast.success('Note deleted');
    },
    onError: () => toast.error('Failed to delete note'),
  });
}
