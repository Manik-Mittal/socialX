// Column-major RGB affine matrices, shared by Android's GPU shader and iOS Core Image.
const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
export const reelFilters = [
  { id: 'original', name: 'Original', color: '#CDD6E5', matrix: identity },
  { id: 'warm', name: 'Warm', color: '#E9A86A', matrix: [1.07,0,0,0, 0,1,0,0, 0,0,.90,0, .025,.008,0,1] },
  { id: 'cool', name: 'Cool', color: '#7EA9DF', matrix: [.92,0,0,0, 0,1.01,0,0, 0,0,1.08,0, 0,.008,.02,1] },
  { id: 'vintage', name: 'Vintage', color: '#B99B71', matrix: [.50,.28,.20,0, .50,.65,.45,0, .15,.12,.26,0, .025,.015,.01,1] },
  { id: 'mono', name: 'Mono', color: '#8D9099', matrix: [.2126,.2126,.2126,0, .7152,.7152,.7152,0, .0722,.0722,.0722,0, 0,0,0,1] },
  { id: 'vibrant', name: 'Vibrant', color: '#D76FB3', matrix: [1.19685,-.05315,-.05315,0, -.1788,1.0712,-.1788,0, -.01805,-.01805,1.23195,0, 0,0,0,1] },
] as const;
export type ReelFilterId = typeof reelFilters[number]['id'];
export function filterMatrix(id: ReelFilterId, intensity: number): number[] {
  const filter = reelFilters.find(item => item.id === id) ?? reelFilters[0];
  const amount = Number.isFinite(intensity) ? Math.max(0, Math.min(1, intensity)) : 0;
  return identity.map((value, i) => value + (filter.matrix[i] - value) * amount);
}
