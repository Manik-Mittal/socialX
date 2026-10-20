import { useEffect, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { normalizeUsername, usernameAvailable, usernameHint, validUsername } from '../backend/usernames';
import { colors } from '../theme';
export function UsernameField({ value, onChange, disabled = false }: { value: string; onChange: (value: string) => void; disabled?: boolean }) {
  const [result, setResult] = useState({ value: '', text: '' });
  useEffect(() => {
    let live = true;
    if (!validUsername(value)) return;
    const timer = setTimeout(() => {
      void usernameAvailable(value).then(available => { if (live) setResult({ value, text: available ? 'Username available' : 'Username already taken. Choose another.' }); }).catch(e => { if (live) setResult({ value, text: (e as Error).message }); });
    }, 400);
    return () => { live = false; clearTimeout(timer); };
  }, [value]);
  return <View style={{ gap: 8, marginVertical: 12 }}><Text style={{ fontSize: 16, color: colors.ink, fontWeight: '700' }}>Username</Text><TextInput accessibilityLabel="Username" value={value} onChangeText={text => onChange(normalizeUsername(text))} editable={!disabled} autoCapitalize="none" autoCorrect={false} maxLength={25} placeholder="e.g. manik_mittal" style={{ fontSize: 17, padding: 14, borderWidth: 1, borderColor: colors.border, borderRadius: 13, color: colors.ink, backgroundColor: colors.white }} /><Text accessibilityLiveRegion="polite" style={{ fontSize: 14, color: colors.muted }}>{validUsername(value) ? result.value === value ? result.text : 'Checking availability…' : usernameHint}</Text></View>;
}
