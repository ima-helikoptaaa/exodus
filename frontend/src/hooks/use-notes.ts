import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '@/lib/api';
import axios from 'axios';

function getErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const msg = error.response?.data?.message;
    if (typeof msg === 'string') return msg;
    if (Array.isArray(msg)) return msg.join(', ');
  }
  return fallback;
}

export function useCreateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { applicationId?: string; interviewRoundId?: string; content: string }) =>
      api.post('/notes', data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['application'] });
      toast.success('Note added');
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Failed to add note')),
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
    onError: (error) => toast.error(getErrorMessage(error, 'Failed to update note')),
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
    onError: (error) => toast.error(getErrorMessage(error, 'Failed to delete note')),
  });
}
