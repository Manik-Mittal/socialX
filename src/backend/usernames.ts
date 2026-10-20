import { supabase } from '../auth';
export const normalizeUsername = (value: string) => value.trim().replace(/^@/, '').toLowerCase();
export const validUsername = (value: string) => /^[a-z0-9_]{3,24}$/.test(value);
export const usernameHint = 'Use 3–24 letters, numbers or underscores.';
export const displayUsername = (value?: string | null) => value ? `@${value}` : 'Username not set';
export async function usernameAvailable(value: string): Promise<boolean> {
  if (!supabase) throw new Error('Connect Supabase first.');
  const { data, error } = await supabase.rpc('username_available', { candidate: normalizeUsername(value) });
  if (error) throw new Error('Could not check username. Check your connection and that the usernames migration is applied.');
  return data === true;
}
