import { useState } from 'react';
import { useContacts } from '@/hooks/use-contacts';
import ContactList from '@/components/contacts/ContactList';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';

export default function ContactsPage() {
  const { data: contacts = [] } = useContacts();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);

  const filtered = debouncedSearch
    ? contacts.filter(
        (c) =>
          c.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          c.email?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          c.company?.toLowerCase().includes(debouncedSearch.toLowerCase()),
      )
    : contacts;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-4">
      <h1 className="text-xl font-semibold">All Contacts</h1>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search contacts..."
          className="pl-9 max-w-sm"
        />
      </div>
      <ContactList contacts={filtered} showAddButton />
    </div>
  );
}
