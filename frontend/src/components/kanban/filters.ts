export interface BoardFilterState {
  minScore: number; // 0 | 50 | 70 | 85
  location: 'all' | 'india' | 'remote';
  source: string; // 'all' | <source>
  freshness: 'all' | '24h' | '7d' | '30d';
}

export const DEFAULT_FILTERS: BoardFilterState = {
  minScore: 0,
  location: 'all',
  source: 'all',
  freshness: 'all',
};
