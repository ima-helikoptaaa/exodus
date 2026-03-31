import { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';
import { useResume, useSaveVersion, useRestoreVersion, useResumeVersions } from '@/hooks/use-resumes';
import LatexEditor from '@/components/resume/LatexEditor';
import LatexPreview from '@/components/resume/LatexPreview';
import VersionHistory from '@/components/resume/VersionHistory';
import CustomizeDialog from '@/components/resume/CustomizeDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save, History, Eye, Code, GripVertical } from 'lucide-react';

export default function ResumeEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: resume, isLoading } = useResume(id);
  const { data: versions = [] } = useResumeVersions(id);
  const saveVersion = useSaveVersion();
  const restoreVersion = useRestoreVersion();

  const [latex, setLatex] = useState('');
  const [dirty, setDirty] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [mobileView, setMobileView] = useState<'editor' | 'preview'>('editor');
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [changeNote, setChangeNote] = useState('');
  const [renderKey, setRenderKey] = useState(0);

  useEffect(() => {
    if (resume?.currentVersion?.latexSource && !dirty) {
      setLatex(resume.currentVersion.latexSource);
    }
  }, [resume?.currentVersion?.latexSource, dirty]);

  const handleChange = useCallback((value: string) => {
    setLatex(value);
    setDirty(true);
  }, []);

  const handleSave = useCallback(() => {
    if (!id) return;
    saveVersion.mutate(
      { resumeId: id, latexSource: latex, changeNote: changeNote || undefined },
      {
        onSuccess: () => {
          setDirty(false);
          setSaveDialogOpen(false);
          setChangeNote('');
        },
      },
    );
  }, [id, latex, changeNote, saveVersion]);

  const handleRestore = useCallback(
    (versionId: string) => {
      if (!id) return;
      restoreVersion.mutate(
        { resumeId: id, versionId },
        { onSuccess: () => setDirty(false) },
      );
    },
    [id, restoreVersion],
  );

  const handleCustomizeApply = useCallback((source: string) => {
    setLatex(source);
    setDirty(true);
    setRenderKey((k) => k + 1);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-muted-foreground">Loading editor...</div>
      </div>
    );
  }

  if (!resume) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Resume not found.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 border-b bg-card shrink-0">
        <Button size="sm" variant="ghost" onClick={() => navigate('/resumes')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="font-semibold truncate">{resume.name}</h2>
        {resume.currentVersion && (
          <span className="text-xs text-muted-foreground">v{resume.currentVersion.versionNumber}</span>
        )}
        {dirty && <span className="text-xs text-amber-500 font-medium">unsaved</span>}
        <div className="ml-auto flex items-center gap-2">
          <CustomizeDialog resumeId={resume.id} onApply={handleCustomizeApply} />
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowHistory((h) => !h)}
          >
            <History className="h-4 w-4 mr-1" />
            History
          </Button>
          <Button
            size="sm"
            onClick={() => setSaveDialogOpen(true)}
            disabled={!dirty || saveVersion.isPending}
          >
            <Save className="h-4 w-4 mr-1" />
            Save
          </Button>
        </div>
      </div>

      {/* Mobile view toggle */}
      <div className="flex md:hidden border-b">
        <button
          className={`flex-1 py-2 text-sm font-medium text-center border-b-2 ${
            mobileView === 'editor' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
          }`}
          onClick={() => setMobileView('editor')}
        >
          <Code className="h-4 w-4 inline mr-1" />
          Editor
        </button>
        <button
          className={`flex-1 py-2 text-sm font-medium text-center border-b-2 ${
            mobileView === 'preview' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
          }`}
          onClick={() => setMobileView('preview')}
        >
          <Eye className="h-4 w-4 inline mr-1" />
          Preview
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex min-h-0">
        {/* Desktop split pane */}
        <div className="hidden md:flex flex-1 min-h-0">
          <PanelGroup direction="horizontal">
            <Panel defaultSize={50} minSize={30}>
              <LatexEditor value={latex} onChange={handleChange} />
            </Panel>
            <PanelResizeHandle className="w-2 bg-border hover:bg-primary/20 transition-colors flex items-center justify-center">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </PanelResizeHandle>
            <Panel defaultSize={50} minSize={30}>
              <LatexPreview latexSource={latex} renderKey={renderKey} />
            </Panel>
          </PanelGroup>
        </div>

        {/* Mobile single pane */}
        <div className="flex md:hidden flex-1 min-h-0">
          {mobileView === 'editor' ? (
            <div className="flex-1">
              <LatexEditor value={latex} onChange={handleChange} />
            </div>
          ) : (
            <div className="flex-1">
              <LatexPreview latexSource={latex} renderKey={renderKey} />
            </div>
          )}
        </div>

        {/* Version History Sidebar */}
        {showHistory && (
          <div className="w-64 border-l bg-card shrink-0 overflow-hidden">
            <div className="p-2 border-b">
              <h3 className="text-sm font-semibold">Version History</h3>
            </div>
            <VersionHistory
              versions={versions}
              currentVersionId={resume.currentVersionId ?? undefined}
              onRestore={handleRestore}
              onSelect={(v) => {
                setLatex(v.latexSource);
                setDirty(v.id !== resume.currentVersionId);
              }}
              restoring={restoreVersion.isPending}
            />
          </div>
        )}
      </div>

      {/* Save Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Save Version</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="changeNote">Change note (optional)</Label>
            <Input
              id="changeNote"
              value={changeNote}
              onChange={(e) => setChangeNote(e.target.value)}
              placeholder="What changed?"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saveVersion.isPending}>
              {saveVersion.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
