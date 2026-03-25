import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCreateContact, useUpdateContact } from '@/hooks/use-contacts';
import type { Contact } from '@/types';
import { Plus } from 'lucide-react';

interface Props {
  applicationId?: string;
  contact?: Contact;
  trigger?: React.ReactNode;
}

export default function ContactForm({ applicationId, contact, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const create = useCreateContact();
  const update = useUpdateContact();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data: Record<string, unknown> = {
      name: fd.get('name'),
      email: fd.get('email') || undefined,
      phone: fd.get('phone') || undefined,
      linkedIn: fd.get('linkedIn') || undefined,
      role: fd.get('role'),
      company: fd.get('company') || undefined,
      notes: fd.get('notes') || undefined,
      applicationId: applicationId || undefined,
    };

    const promise = contact
      ? update.mutateAsync({ id: contact.id, ...data })
      : create.mutateAsync(data);

    promise.then(() => setOpen(false));
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="outline">
            <Plus className="h-4 w-4 mr-1" />
            Add Contact
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{contact ? 'Edit Contact' : 'New Contact'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" defaultValue={contact?.name} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="role">Role</Label>
              <Select name="role" defaultValue={contact?.role ?? 'RECRUITER'}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="RECRUITER">Recruiter</SelectItem>
                  <SelectItem value="HIRING_MANAGER">Hiring Manager</SelectItem>
                  <SelectItem value="REFERRAL">Referral</SelectItem>
                  <SelectItem value="INTERVIEWER">Interviewer</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" defaultValue={contact?.email ?? ''} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" defaultValue={contact?.phone ?? ''} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="linkedIn">LinkedIn</Label>
              <Input id="linkedIn" name="linkedIn" defaultValue={contact?.linkedIn ?? ''} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="company">Company</Label>
              <Input id="company" name="company" defaultValue={contact?.company ?? ''} />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={2} defaultValue={contact?.notes ?? ''} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit">{contact ? 'Save' : 'Create'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
