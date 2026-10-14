import { supabase } from '../auth';

export type Profile = { name: string; bio: string };

export async function loadProfile(userId: string): Promise<Profile> {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase.from('profiles')
    .select('display_name, bio').eq('id', userId).single();
  if (error) throw new Error('Could not load your profile. Check your connection and database setup, then retry.');
  return { name: data.display_name, bio: data.bio };
}

export async function saveProfile(userId: string, name: string, bio: string): Promise<Profile> {
  if (!supabase) throw new Error('Supabase is not configured.');
  const profile = { name: name.trim(), bio: bio.trim() };
  if (!profile.name || profile.name.length > 40 || profile.bio.length > 160) {
    throw new Error('Use a name of 1–40 characters and a bio of up to 160 characters.');
  }
  // RLS enforces ownership; selecting the result also detects an update of zero rows.
  const { data, error } = await supabase.from('profiles')
    .update({ display_name: profile.name, bio: profile.bio })
    .eq('id', userId).select('display_name, bio').single();
  if (error) throw new Error('Your profile was not saved. Check your connection and try again.');
  return { name: data.display_name, bio: data.bio };
}
