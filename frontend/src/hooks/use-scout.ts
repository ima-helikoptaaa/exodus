import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '@/lib/api';
import type { ScoutRun, ScoutRunResult } from '@/types';

export interface ScoutPreview {
  runId: string;
  startedAt: string;
  jobsFound: number;
  companiesChecked: number;
  preview: Array<{
    companyName: string;
    role: string;
    location: string | null;
    matchScore: number | null;
    jobUrl: string | null;
  }>;
}

export function useScoutRuns() {
  return useQuery<ScoutRun[]>({
    queryKey: ['scout-runs'],
    queryFn: () => api.get('/scout/runs').then((r) => r.data),
    staleTime: 60_000,
  });
}

export function useLastScoutRun() {
  return useQuery<ScoutRun | null>({
    queryKey: ['scout-last-run'],
    queryFn: () => api.get('/scout/last-run').then((r) => r.data),
    staleTime: 30_000,
  });
}

export function usePendingPreview() {
  return useQuery<ScoutPreview | null>({
    queryKey: ['scout-pending-preview'],
    queryFn: () => api.get('/scout/pending-preview').then((r) => r.data),
    refetchInterval: 60_000,
  });
}

export function useRunScout() {
  const qc = useQueryClient();
  return useMutation<ScoutRunResult, Error, { useLlm?: boolean }>({
    mutationFn: (opts) =>
      api
        .post('/scout/run', null, {
          params: { useLlm: opts.useLlm ? 'true' : 'false' },
        })
        .then((r) => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['applications'] });
      qc.invalidateQueries({ queryKey: ['scout-runs'] });
      qc.invalidateQueries({ queryKey: ['scout-last-run'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success(
        `Scout complete: ${data.jobsAdded} added, ${data.jobsSkipped} skipped (${data.companiesChecked} companies)`,
      );
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message || 'Scout run failed';
      toast.error(msg);
    },
  });
}

export function usePreviewScout() {
  const qc = useQueryClient();
  return useMutation<ScoutRunResult, Error, { useLlm?: boolean }>({
    mutationFn: (opts) =>
      api
        .post('/scout/preview', null, {
          params: { useLlm: opts.useLlm ? 'true' : 'false' },
        })
        .then((r) => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['scout-pending-preview'] });
      toast.success(
        `Preview ready: ${data.jobsAdded} jobs found, ${data.jobsSkipped} skipped`,
      );
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message || 'Scout preview failed';
      toast.error(msg);
    },
  });
}

export function useConfirmPreview() {
  const qc = useQueryClient();
  return useMutation<{ runId: string; jobsAdded: number }, Error, string>({
    mutationFn: (runId) =>
      api.post(`/scout/runs/${runId}/confirm`).then((r) => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['applications'] });
      qc.invalidateQueries({ queryKey: ['scout-pending-preview'] });
      qc.invalidateQueries({ queryKey: ['scout-runs'] });
      qc.invalidateQueries({ queryKey: ['scout-last-run'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success(`${data.jobsAdded} jobs confirmed and added to wishlist`);
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.message || 'Confirm failed';
      toast.error(msg);
    },
  });
}
