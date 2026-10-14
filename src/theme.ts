export const colors = {
  ink: '#14243D',
  muted: '#66758A',
  canvas: '#F8FAFD',
  white: '#FFFFFF',
  accent: '#245CDB',
  accentSoft: '#EAF1FF',
  accentSelected: '#D7E5FF',
  accentBorder: '#A9C2EE',
  highlight: '#8FE0F1',
  border: '#E1E8F1',
  backdrop: '#EAF0F7',
  search: '#EDF2F8',
  dark: '#0C1628',
  darkSurface: '#172B45',
  darkBorder: '#355376',
  onDarkMuted: '#B5C6DC',
  onDarkAccent: '#C5DEFF',
  gold: '#F7BE55',
};

export const categories = ['All', 'Food', 'Places', 'Fashion', 'Beauty', 'Tech', 'Events', 'Skills'] as const;
export type Category = (typeof categories)[number];

export const categoryColors: Record<string, string> = {
  Food: '#FFD5BF',
  Places: '#CCDDF5',
  Fashion: '#F5CBE1',
  Beauty: '#F2D4C9',
  Tech: '#BEDAF4',
  Events: '#D0D8F5',
  Skills: '#F2E2AF',
};


