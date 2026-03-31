import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useCustomizeResume } from '@/hooks/use-ai';
import { Sparkles, Loader2 } from 'lucide-react';

interface Props {
  resumeId: string;
  onApply: (latexSource: string) => void;
  defaultJobDescription?: string;
}

export default function CustomizeDialog({ resumeId, onApply, defaultJobDescription }: Props) {
  const [open, setOpen] = useState(false);
  const [jd, setJd] = useState(defaultJobDescription ?? '');
  const [result, setResult] = useState<{ latexSource: string; reasoning: string } | null>(null);
  const customize = useCustomizeResume();

  function handleGenerate() {
    customize.mutate(
      { jobDescription: jd, baseResumeId: resumeId },
      {
        onSuccess: (data) => setResult(data),
      },
    );
  }

  function handleApply() {
    if (result) {
      onApply(result.latexSource);
      setOpen(false);
      setResult(null);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setResult(null);
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Sparkles className="h-4 w-4 mr-1" />
          Customize with AI
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>AI Resume Customization</DialogTitle>
        </DialogHeader>

        {!result ? (
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Job Description</Label>
              <Textarea
                value={jd}
                onChange={(e) => setJd(e.target.value)}
                placeholder="Paste the job description here..."
                rows={10}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              The AI will analyze this job description against your master profile and generate a tailored LaTeX resume.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleGenerate} disabled={!jd.trim() || customize.isPending}>
                {customize.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-1" />
                    Generate
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label>AI Reasoning</Label>
              <p className="text-sm text-muted-foreground mt-1 bg-muted p-3 rounded-md">{result.reasoning}</p>
            </div>
            <div>
              <Label>Generated LaTeX Preview</Label>
              <pre className="text-xs font-mono bg-muted p-3 rounded-md max-h-64 overflow-y-auto mt-1">
                {result.latexSource.slice(0, 2000)}
                {result.latexSource.length > 2000 && '\n... (truncated)'}
              </pre>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setResult(null)}>
                Regenerate
              </Button>
              <Button onClick={handleApply}>Apply to Editor</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
