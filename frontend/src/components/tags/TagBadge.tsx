import { Badge } from '@/components/ui/badge';
import type { Tag } from '@/types';

export default function TagBadge({ tag }: { tag: Tag }) {
  return (
    <Badge
      variant="secondary"
      className="text-xs"
      style={tag.color ? { backgroundColor: tag.color + '20', color: tag.color, borderColor: tag.color + '40' } : undefined}
    >
      {tag.name}
    </Badge>
  );
}
