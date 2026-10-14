import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../auth';
import { colors } from '../theme';
import { GradientFill } from './GradientFill';

export function AuthScreen({ signup = false }: { signup?: boolean }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const inFlight = useRef(false);

  async function submit() {
    if (inFlight.current || !supabase) return;
    setError('');
    if (signup && !name.trim()) return setError('Please enter your name.');
    const address = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) return setError('Enter a valid email address.');
    if (!password || (signup && password.length < 8)) return setError(signup ? 'Choose a password with at least 8 characters.' : 'Enter your password.');
    if (signup && password !== confirm) return setError('Your passwords do not match.');
    inFlight.current = true;
    setBusy(true);
    try {
      if (signup) {
        const redirect = process.env.EXPO_PUBLIC_AUTH_REDIRECT_URL || (Platform.OS === 'web' ? `${window.location.origin}/login` : undefined);
        const { data, error: authError } = await supabase.auth.signUp({ email: address, password, options: { data: { display_name: name.trim() }, ...(redirect ? { emailRedirectTo: redirect } : {}) } });
        if (authError) throw authError;
        if (!data.session) { setSent(true); setPassword(''); setConfirm(''); }
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({ email: address, password });
        if (authError) throw authError;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not connect. Please try again.');
    } finally { inFlight.current = false; setBusy(false); }
  }

  return <SafeAreaView style={styles.screen} edges={['top', 'bottom']}><KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <Text style={styles.logo}>social<Text style={styles.logoAccent}>x.</Text></Text>
    <View style={styles.hero}><GradientFill tone="soft" radius={26} /><View style={styles.heroIcon}><GradientFill radius={17} /><Ionicons name={signup ? 'sparkles' : 'play'} size={26} color={colors.white} /></View><Text style={styles.heroTitle}>{signup ? 'Your story starts here.' : 'Good to see you.'}</Text><Text style={styles.heroBody}>Discover your people. Share your perspective.</Text></View>
    <View style={styles.switcher}><Pressable disabled={busy} onPress={() => router.replace('/login')} style={[styles.switchButton, !signup && styles.switchActive]} accessibilityRole="button" accessibilityState={{ selected: !signup }}><Text style={[styles.switchText, !signup && styles.switchSelected]}>Log in</Text></Pressable><Pressable disabled={busy} onPress={() => router.replace('/signup')} style={[styles.switchButton, signup && styles.switchActive]} accessibilityRole="button" accessibilityState={{ selected: signup }}><Text style={[styles.switchText, signup && styles.switchSelected]}>Sign up</Text></Pressable></View>
    {!supabase ? <View style={styles.notice}><Ionicons name="information-circle-outline" size={20} color={colors.accent} /><Text style={styles.noticeText}>Accounts are not available in this preview yet. Please finish connecting Supabase to continue.</Text></View> : null}
    {sent ? <View style={styles.confirmation}><Ionicons name="mail-open-outline" size={35} color={colors.accent} /><Text style={styles.confirmTitle}>Check your inbox</Text><Text style={styles.heroBody}>If this address is eligible, a confirmation link has been sent to {email.trim()}. Confirm your email, then log in.</Text><Pressable style={styles.primary} onPress={() => router.replace('/login')} accessibilityRole="button"><GradientFill /><Text style={styles.primaryText}>Back to login</Text></Pressable></View> : <>
      {signup ? <><Text style={styles.label}>Your name</Text><TextInput style={styles.input} value={name} onChangeText={setName} placeholder="How should we call you?" placeholderTextColor={colors.muted} maxLength={40} autoComplete="name" editable={!busy} accessibilityLabel="Your name" /></> : null}
      <Text style={styles.label}>Email address</Text><TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="you@example.com" placeholderTextColor={colors.muted} autoCapitalize="none" autoCorrect={false} autoComplete="email" keyboardType="email-address" editable={!busy} accessibilityLabel="Email address" />
      <Text style={styles.label}>Password</Text><View style={styles.passwordRow}><TextInput style={styles.passwordInput} value={password} onChangeText={setPassword} placeholder={signup ? 'At least 8 characters' : 'Enter your password'} placeholderTextColor={colors.muted} secureTextEntry={!visible} autoCapitalize="none" autoCorrect={false} autoComplete={signup ? 'new-password' : 'current-password'} editable={!busy} accessibilityLabel="Password" onSubmitEditing={signup ? undefined : submit} /><Pressable onPress={() => setVisible(!visible)} style={styles.eye} accessibilityRole="button" accessibilityLabel={visible ? 'Hide password' : 'Show password'}><Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={21} color={colors.muted} /></Pressable></View>
      {signup ? <><Text style={styles.label}>Confirm password</Text><TextInput style={styles.input} value={confirm} onChangeText={setConfirm} placeholder="Enter your password again" placeholderTextColor={colors.muted} secureTextEntry={!visible} autoCapitalize="none" autoCorrect={false} autoComplete="new-password" editable={!busy} accessibilityLabel="Confirm password" onSubmitEditing={submit} /></> : null}
      {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
      <Pressable onPress={submit} style={[styles.primary, (!supabase || busy) && styles.disabled]} disabled={!supabase || busy} accessibilityRole="button" accessibilityLabel={signup ? 'Create account' : 'Log in to SocialX'}><GradientFill />{busy ? <ActivityIndicator color={colors.white} /> : <><Text style={styles.primaryText}>{signup ? 'Create account' : 'Log in'}</Text><Ionicons name="arrow-forward" size={19} color={colors.white} /></>}</Pressable>
    </>}

  </ScrollView></KeyboardAvoidingView></SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas }, content: { padding: 24, paddingBottom: 32 },
  logo: { fontSize: 31, fontWeight: '900', letterSpacing: -1.5, color: colors.ink, marginBottom: 21 }, logoAccent: { color: colors.accent },
  hero: { borderRadius: 26, padding: 24 }, heroIcon: { width: 54, height: 54, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }, heroTitle: { fontSize: 27, fontWeight: '800', letterSpacing: -0.7, color: colors.ink }, heroBody: { fontSize: 16, lineHeight: 24, color: colors.muted, marginTop: 7 },
  switcher: { flexDirection: 'row', backgroundColor: colors.search, padding: 4, borderRadius: 15, marginTop: 24, marginBottom: 8 }, switchButton: { flex: 1, padding: 12, borderRadius: 12, alignItems: 'center' }, switchActive: { backgroundColor: colors.white }, switchText: { color: colors.muted, fontWeight: '700', fontSize: 17 }, switchSelected: { color: colors.accent },
  notice: { flexDirection: 'row', gap: 8, backgroundColor: colors.accentSoft, borderRadius: 13, padding: 12, marginTop: 10 }, noticeText: { flex: 1, color: colors.ink, fontSize: 15, lineHeight: 22 },
  label: { color: colors.ink, fontSize: 15, fontWeight: '700', marginTop: 17, marginBottom: 8 }, input: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 13, paddingHorizontal: 14, paddingVertical: 14, fontSize: 17, color: colors.ink }, passwordRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 13, backgroundColor: colors.white }, passwordInput: { flex: 1, paddingHorizontal: 14, paddingVertical: 14, fontSize: 17, color: colors.ink }, eye: { padding: 12 },
  primary: { minHeight: 50, borderRadius: 16, padding: 15, marginTop: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 }, primaryText: { color: colors.white, fontWeight: '800', fontSize: 17 }, disabled: { opacity: 0.45 }, error: { color: '#AA2440', lineHeight: 23, marginTop: 12, fontSize: 16 },
  divider: { flexDirection: 'row', gap: 15, alignItems: 'center', marginVertical: 22 }, line: { flex: 1, height: 1, backgroundColor: colors.border }, or: { color: colors.muted, fontSize: 13, letterSpacing: 1 }, demo: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, padding: 13, borderWidth: 1, borderColor: colors.accentBorder, borderRadius: 14 }, demoText: { color: colors.accent, fontSize: 16, fontWeight: '700' }, footer: { textAlign: 'center', fontSize: 14, color: colors.muted, marginTop: 13, lineHeight: 21 },
  confirmation: { paddingVertical: 25 }, confirmTitle: { fontSize: 22, fontWeight: '800', color: colors.ink, marginTop: 15 },
});
