import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAddPrepTopic, useUpdatePrepTopic, useDeletePrepTopic } from '@/hooks/use-interviews';
import type { PrepTopic } from '@/types';
import { Plus, Trash2, ExternalLink, Link } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface Props {
  roundId: string;
  topics: PrepTopic[];
}

export default function PrepTopicChecklist({ roundId, topics }: Props) {
  const [newTitle, setNewTitle] = useState('');
  const [newResourceUrl, setNewResourceUrl] = useState('');
  const addTopic = useAddPrepTopic();
  const updateTopic = useUpdatePrepTopic();
  const deleteTopic = useDeletePrepTopic();
  const [editingUrlId, setEditingUrlId] = useState<string | null>(null);
  const [editingUrl, setEditingUrl] = useState('');

  function handleAdd() {
    if (!newTitle.trim()) return;
    addTopic.mutate({
      roundId,
      title: newTitle.trim(),
      ...(newResourceUrl.trim() ? { resourceUrl: newResourceUrl.trim() } : {}),
    } as { roundId: string; title: string });
    setNewTitle('');
    setNewResourceUrl('');
  }

  function saveResourceUrl(topicId: string) {
    updateTopic.mutate({ id: topicId, resourceUrl: editingUrl.trim() || null });
    setEditingUrlId(null);
    setEditingUrl('');
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Prep Topics</p>
      {topics.map((topic) => (
        <div key={topic.id} className="flex items-center gap-2 group">
          <Checkbox
            checked={topic.completed}
            onCheckedChange={(checked) =>
              updateTopic.mutate({ id: topic.id, completed: !!checked })
            }
            aria-label={`Mark "${topic.title}" as ${topic.completed ? 'incomplete' : 'complete'}`}
          />
          <span className={`text-sm flex-1 ${topic.completed ? 'line-through text-muted-foreground' : ''}`}>
            {topic.title}
          </span>
          {topic.resourceUrl && (
            <a href={topic.resourceUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground" aria-label="Open resource link">
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
          <Popover open={editingUrlId === topic.id} onOpenChange={(open) => {
            if (open) {
              setEditingUrlId(topic.id);
              setEditingUrl(topic.resourceUrl ?? '');
            } else {
              setEditingUrlId(null);
            }
          }}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100"
                aria-label="Edit resource URL"
              >
                <Link className="h-3 w-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2" align="end">
              <div className="flex gap-1">
                <Input
                  value={editingUrl}
                  onChange={(e) => setEditingUrl(e.target.value)}
                  placeholder="https://..."
                  className="h-7 text-xs"
                  onKeyDown={(e) => e.key === 'Enter' && saveResourceUrl(topic.id)}
                />
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => saveResourceUrl(topic.id)}>
                  Save
                </Button>
              </div>
            </PopoverContent>
          </Popover>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100"
            onClick={() => deleteTopic.mutate(topic.id)}
            aria-label={`Delete prep topic "${topic.title}"`}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ))}
      <div className="flex gap-2">
        <Input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Add prep topic..."
          className="h-8 text-sm"
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAdd())}
        />
        <Button size="sm" variant="ghost" onClick={handleAdd} disabled={!newTitle.trim()}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
