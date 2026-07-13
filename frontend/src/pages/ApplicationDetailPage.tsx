import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApplication, useDeleteApplication } from '@/hooks/use-applications';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import InterviewTimeline from '@/components/interviews/InterviewTimeline';
import ContactList from '@/components/contacts/ContactList';
import NotesList from '@/components/notes/NotesList';
import TagPicker from '@/components/tags/TagPicker';
import ApplicationForm from '@/components/applications/ApplicationForm';
import ApplicationResumeLink from '@/components/resume/ApplicationResumeLink';
import { useUpdateStage } from '@/hooks/use-applications';
import { STAGE_ORDER, STAGE_LABELS, STAGE_DOT_COLORS } from '@/types';
import type { PipelineStage } from '@/types';
import { format } from 'date-fns';
import { ArrowLeft, ExternalLink, MapPin, Trash2, Pencil, DollarSign, CalendarDays, Clock, AlertTriangle, Star, Target } from 'lucide-react';

export default function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: app, isLoading } = useApplication(id);
  const updateStage = useUpdateStage();
  const deleteApp = useDeleteApplication();
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="h-8 w-20 bg-muted/50 animate-pulse rounded" />
        <div className="space-y-3">
          <div className="h-8 w-64 bg-muted/50 animate-pulse rounded" />
          <div className="h-5 w-48 bg-muted/50 animate-pulse rounded" />
        </div>
        <div className="h-10 w-full bg-muted/50 animate-pulse rounded" />
        <div className="h-64 w-full bg-muted/30 animate-pulse rounded" />
      </div>
    );
  }

  if (!app) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-[60vh] text-muted-foreground">
        <AlertTriangle className="h-12 w-12 mb-4 opacity-20" />
        <p className="text-lg font-heading font-medium">Application not found</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/pipeline')}>
          Back to Pipeline
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1.5 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </div>

      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className={`h-3 w-3 rounded-full ${STAGE_DOT_COLORS[app.stage]}`} />
              <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">{STAGE_LABELS[app.stage]}</span>
            </div>
            <h1 className="text-2xl font-heading font-bold tracking-tight">{app.company.name}</h1>
            <p className="text-lg text-muted-foreground">{app.role}</p>
            <div className="flex items-center gap-4 mt-3 flex-wrap">
              {(app.location || app.isRemote) && (
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  {app.isRemote ? 'Remote' : app.location}
                </span>
              )}
              {app.matchScore != null && app.matchScore > 0 && (
                <span className="flex items-center gap-1 text-sm">
                  <Target className="h-3.5 w-3.5 text-primary" />
                  <span className="font-mono font-bold text-primary">{app.matchScore}</span>
                  <span className="text-muted-foreground text-xs">match</span>
                </span>
              )}
              {app.priority > 0 && (
                <span className="flex items-center gap-1 text-sm">
                  <Star className="h-3.5 w-3.5 text-amber-400" fill="currentColor" />
                  <span className="text-muted-foreground text-xs">Priority {app.priority}</span>
                </span>
              )}
              {app.jobUrl && (
                <a href={app.jobUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-primary hover:underline">
                  <ExternalLink className="h-3.5 w-3.5" />
                  Job Posting
                </a>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <ApplicationForm
              application={app}
              trigger={<Button size="icon" variant="outline" aria-label="Edit application"><Pencil className="h-4 w-4" /></Button>}
            />
            <Button
              size="icon"
              variant="outline"
              className="text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
              onClick={() => setDeleteOpen(true)}
              aria-label="Delete application"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {app.matchReasons && (
          <div className="p-3 rounded-xl border border-primary/20 bg-primary/5">
            <p className="text-xs font-mono uppercase tracking-wider text-primary mb-1.5">Match Reasons</p>
            <p className="text-sm text-muted-foreground">{app.matchReasons.split(';').join(' · ')}</p>
          </div>
        )}

        <Select
          value={app.stage}
          onValueChange={(v) => updateStage.mutate({ id: app.id, stage: v as PipelineStage })}
        >
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STAGE_ORDER.map((s) => (
              <SelectItem key={s} value={s}>
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${STAGE_DOT_COLORS[s]}`} />
                  {STAGE_LABELS[s]}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {(app.salaryMin || app.appliedDate || app.followUpDate || app.deadlineDate) && (
        <Card className="p-4">
          <div className="flex items-center gap-6 text-sm flex-wrap">
            {app.salaryMin && app.salaryMax && (
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <DollarSign className="h-3.5 w-3.5 text-primary" />
                <span className="font-mono">{app.salaryCurrency ?? '$'} {(app.salaryMin / 1000).toFixed(0)}k - {(app.salaryMax / 1000).toFixed(0)}k</span>
              </span>
            )}
            {app.appliedDate && (
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5" />
                Applied: <span className="font-mono">{format(new Date(app.appliedDate), 'MMM d, yyyy')}</span>
              </span>
            )}
            {app.followUpDate && (
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                Follow up: <span className="font-mono">{format(new Date(app.followUpDate), 'MMM d, yyyy')}</span>
              </span>
            )}
            {app.deadlineDate && (
              <span className="flex items-center gap-1.5 text-destructive">
                <AlertTriangle className="h-3.5 w-3.5" />
                Deadline: <span className="font-mono">{format(new Date(app.deadlineDate), 'MMM d, yyyy')}</span>
              </span>
            )}
          </div>
        </Card>
      )}

      <TagPicker applicationId={app.id} assignedTags={app.tags} />

      {app.jobDescription && (
        <Card className="p-4">
          <h3 className="text-sm font-heading font-semibold mb-2">Job Description</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{app.jobDescription}</p>
        </Card>
      )}

      <Tabs defaultValue="interviews" className="w-full">
        <TabsList>
          <TabsTrigger value="interviews">Interviews ({app.interviewRounds.length})</TabsTrigger>
          <TabsTrigger value="contacts">Contacts ({app.contacts.length})</TabsTrigger>
          <TabsTrigger value="notes">Notes ({app.notes.length})</TabsTrigger>
          <TabsTrigger value="resume">Resume ({app.applicationResumes?.length ?? 0})</TabsTrigger>
        </TabsList>
        <TabsContent value="interviews" className="mt-4">
          <InterviewTimeline applicationId={app.id} rounds={app.interviewRounds} />
        </TabsContent>
        <TabsContent value="contacts" className="mt-4">
          <ContactList contacts={app.contacts} applicationId={app.id} />
        </TabsContent>
        <TabsContent value="notes" className="mt-4">
          <NotesList notes={app.notes} applicationId={app.id} />
        </TabsContent>
        <TabsContent value="resume" className="mt-4">
          <ApplicationResumeLink applicationId={app.id} jobDescription={app.jobDescription} />
        </TabsContent>
      </Tabs>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Application</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the application for <strong>{app.role}</strong> at{' '}
              <strong>{app.company.name}</strong>? This will also remove all associated interviews, contacts, and notes.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                deleteApp.mutate(app.id, { onSuccess: () => navigate('/pipeline') });
                setDeleteOpen(false);
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
