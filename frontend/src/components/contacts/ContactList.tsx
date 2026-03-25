import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import ContactForm from './ContactForm';
import { useDeleteContact } from '@/hooks/use-contacts';
import type { Contact } from '@/types';
import { Mail, Phone, ExternalLink, Trash2, Pencil, Users } from 'lucide-react';

const ROLE_LABELS: Record<string, string> = {
  RECRUITER: 'Recruiter',
  HIRING_MANAGER: 'Hiring Manager',
  REFERRAL: 'Referral',
  INTERVIEWER: 'Interviewer',
  OTHER: 'Other',
};

const ROLE_COLORS: Record<string, string> = {
  RECRUITER: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  HIRING_MANAGER: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  REFERRAL: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  INTERVIEWER: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  OTHER: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
};

export default function ContactList({ contacts, applicationId, showAddButton }: { contacts: Contact[]; applicationId?: string; showAddButton?: boolean }) {
  const deleteContact = useDeleteContact();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const contactToDelete = contacts.find((c) => c.id === deleteId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Contacts ({contacts.length})</h3>
        {(applicationId || showAddButton) && <ContactForm applicationId={applicationId} />}
      </div>
      {contacts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
          <Users className="h-10 w-10 mb-3 opacity-40" />
          <p className="text-sm font-medium">No contacts yet</p>
          <p className="text-xs mt-1">Add recruiters, hiring managers, or referrals</p>
        </div>
      ) : (
        <div className="space-y-2">
          {contacts.map((contact) => (
            <Card key={contact.id} className="p-3 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{contact.name}</span>
                    <Badge variant="secondary" className={`text-xs ${ROLE_COLORS[contact.role]}`}>
                      {ROLE_LABELS[contact.role]}
                    </Badge>
                  </div>
                  {contact.company && <p className="text-xs text-muted-foreground mt-0.5">{contact.company}</p>}
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    {contact.email && (
                      <a href={`mailto:${contact.email}`} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                        <Mail className="h-3 w-3" />{contact.email}
                      </a>
                    )}
                    {contact.phone && (
                      <a href={`tel:${contact.phone}`} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                        <Phone className="h-3 w-3" />{contact.phone}
                      </a>
                    )}
                    {contact.linkedIn && (
                      <a href={contact.linkedIn} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                        <ExternalLink className="h-3 w-3" />LinkedIn
                      </a>
                    )}
                  </div>
                  {contact.notes && (
                    <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{contact.notes}</p>
                  )}
                </div>
                <div className="flex gap-1 shrink-0 ml-2">
                  <ContactForm
                    contact={contact}
                    applicationId={applicationId}
                    trigger={<Button size="icon" variant="ghost" className="h-7 w-7"><Pencil className="h-3.5 w-3.5" /></Button>}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => setDeleteId(contact.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Contact</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{contactToDelete?.name}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteId) deleteContact.mutate(deleteId);
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
