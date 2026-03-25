import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAddPrepTopic, useUpdatePrepTopic, useDeletePrepTopic } from '@/hooks/use-interviews';
import type { PrepTopic } from '@/types';
import { Plus, Trash2, ExternalLink } from 'lucide-react';

interface Props {
  roundId: string;
  topics: PrepTopic[];
}

export default function PrepTopicChecklist({ roundId, topics }: Props) {
  const [newTitle, setNewTitle] = useState('');
  const addTopic = useAddPrepTopic();
  const updateTopic = useUpdatePrepTopic();
  const deleteTopic = useDeletePrepTopic();

  function handleAdd() {
    if (!newTitle.trim()) return;
    addTopic.mutate({ roundId, title: newTitle.trim() });
    setNewTitle('');
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
          />
          <span className={`text-sm flex-1 ${topic.completed ? 'line-through text-muted-foreground' : ''}`}>
            {topic.title}
          </span>
          {topic.resourceUrl && (
            <a href={topic.resourceUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100"
            onClick={() => deleteTopic.mutate(topic.id)}
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
