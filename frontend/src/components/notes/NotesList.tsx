import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useCreateNote, useDeleteNote } from '@/hooks/use-notes';
import type { Note } from '@/types';
import { format } from 'date-fns';
import { Trash2, Plus, StickyNote } from 'lucide-react';

interface Props {
  notes: Note[];
  applicationId?: string;
  interviewRoundId?: string;
}

export default function NotesList({ notes, applicationId, interviewRoundId }: Props) {
  const [content, setContent] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const createNote = useCreateNote();
  const deleteNote = useDeleteNote();

  function handleAdd() {
    if (!content.trim()) return;
    createNote.mutate({ applicationId, interviewRoundId, content: content.trim() });
    setContent('');
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium">Notes ({notes.length})</h3>
      <div className="space-y-2">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add a note..."
          rows={3}
          className="text-sm"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              handleAdd();
            }
          }}
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {/Mac|iPhone|iPad/.test(navigator.userAgent) ? 'Cmd' : 'Ctrl'}+Enter to submit
          </span>
          <Button size="sm" onClick={handleAdd} disabled={!content.trim() || createNote.isPending}>
            <Plus className="h-4 w-4 mr-1" />
            Add Note
          </Button>
        </div>
      </div>
      {notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <StickyNote className="h-8 w-8 mb-2 opacity-40" />
          <p className="text-sm">No notes yet</p>
        </div>
      ) : (
        notes.map((note) => (
          <Card key={note.id} className="p-3 group hover:shadow-sm transition-shadow">
            <div className="flex justify-between items-start">
              <div className="flex-1 min-w-0">
                <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                <p className="text-xs text-muted-foreground mt-1.5">{format(new Date(note.createdAt), 'MMM d, yyyy h:mm a')}</p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive shrink-0 ml-2 transition-opacity"
                onClick={() => setDeleteId(note.id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </Card>
        ))
      )}

      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Note</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this note? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteId) deleteNote.mutate(deleteId);
                setDeleteId(null);
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
