export const musicTracks = [
  { id: 'daylight', title: 'Daylight', mood: 'Bright · 100 BPM', asset: require('../../assets/music/daylight.wav') },
  { id: 'nightwalk', title: 'Nightwalk', mood: 'Chill · 80 BPM', asset: require('../../assets/music/nightwalk.wav') },
  { id: 'spark', title: 'Spark', mood: 'Upbeat · 120 BPM', asset: require('../../assets/music/spark.wav') },
] as const;
export type MusicTrack = typeof musicTracks[number];
