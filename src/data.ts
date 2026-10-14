import type { Category } from './theme';

export type Reel = {
  id: string;
  authorId?: string;
  mimeType?: string;
  mediaMissing?: boolean;
  creator: string;
  handle: string;
  title: string;
  description: string;
  category: Exclude<Category, 'All'>;
  city: string;
  emoji: string;
  action: string;
  sponsored?: boolean;
  mediaUri?: string;
  mediaType?: 'image' | 'video';
};

