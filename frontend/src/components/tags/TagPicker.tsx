import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useTags, useCreateTag, useAssignTag, useUnassignTag } from '@/hooks/use-tags';
import type { Tag } from '@/types';
import { Plus, X, Tags } from 'lucide-react';

interface Props {
  applicationId: string;
  assignedTags: { tag: Tag }[];
}

export default function TagPicker({ applicationId, assignedTags }: Props) {
  const { data: allTags = [] } = useTags();
  const createTag = useCreateTag();
  const assignTag = useAssignTag();
  const unassignTag = useUnassignTag();
  const [newTagName, setNewTagName] = useState('');

  const assignedIds = new Set(assignedTags.map((t) => t.tag.id));
  const available = allTags.filter((t) => !assignedIds.has(t.id));

  function handleCreateAndAssign() {
    if (!newTagName.trim()) return;
    createTag.mutateAsync({ name: newTagName.trim() }).then((tag: Tag) => {
      assignTag.mutate({ applicationId, tagId: tag.id });
      setNewTagName('');
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {assignedTags.map(({ tag }) => (
          <Badge
            key={tag.id}
            variant="secondary"
            className="text-xs cursor-pointer group"
            style={tag.color ? { backgroundColor: tag.color + '20', color: tag.color } : undefined}
            onClick={() => unassignTag.mutate({ applicationId, tagId: tag.id })}
          >
            {tag.name}
            <X className="h-3 w-3 ml-1 opacity-0 group-hover:opacity-100" />
          </Badge>
        ))}
        <Popover>
          <PopoverTrigger asChild>
            <Button size="sm" variant="ghost" className="h-6 px-2 text-xs">
              <Tags className="h-3 w-3 mr-1" />
              Add
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2" align="start">
            <div className="space-y-2">
              {available.map((tag) => (
                <button
                  key={tag.id}
                  className="flex items-center gap-2 w-full text-left text-sm px-2 py-1 rounded hover:bg-accent"
                  onClick={() => assignTag.mutate({ applicationId, tagId: tag.id })}
                >
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: tag.color ?? '#6366f1' }} />
                  {tag.name}
                </button>
              ))}
              <div className="flex gap-1 border-t pt-2">
                <Input
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="New tag..."
                  className="h-7 text-xs"
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleCreateAndAssign())}
                />
                <Button size="sm" variant="ghost" className="h-7" onClick={handleCreateAndAssign}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
