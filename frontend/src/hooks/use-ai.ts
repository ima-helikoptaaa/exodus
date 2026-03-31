import { useMutation } from '@tanstack/react-query';
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

interface CustomizeResult {
  latexSource: string;
  reasoning: string;
}

export function useCustomizeResume() {
  return useMutation<CustomizeResult, unknown, { jobDescription: string; applicationId?: string; baseResumeId?: string }>({
    mutationFn: (data) => api.post('/ai/customize-resume', data).then((r) => r.data),
    onError: (error) => toast.error(getErrorMessage(error, 'Failed to generate resume')),
  });
}
