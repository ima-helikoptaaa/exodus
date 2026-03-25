import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '@/lib/api';
import type { Contact } from '@/types';

export function useContacts(applicationId?: string) {
  return useQuery<Contact[]>({
    queryKey: ['contacts', applicationId],
    queryFn: () =>
      api.get('/contacts', { params: applicationId ? { applicationId } : undefined }).then((r) => r.data),
  });
}

export function useCreateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post('/contacts', data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contacts'] });
      qc.invalidateQueries({ queryKey: ['application'] });
      toast.success('Contact added');
    },
    onError: () => toast.error('Failed to add contact'),
  });
}

export function useUpdateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      api.patch(`/contacts/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contacts'] });
      qc.invalidateQueries({ queryKey: ['application'] });
      toast.success('Contact updated');
    },
    onError: () => toast.error('Failed to update contact'),
  });
}

export function useDeleteContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/contacts/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contacts'] });
      qc.invalidateQueries({ queryKey: ['application'] });
      toast.success('Contact deleted');
    },
    onError: () => toast.error('Failed to delete contact'),
  });
}
