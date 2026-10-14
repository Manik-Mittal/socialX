import { GradientFill } from '../../components/GradientFill';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ReelCard } from '../../components/ReelCard';
import { useAppState } from '../../state';
import { colors } from '../../theme';
import { useAuth } from '../../auth';

type Section = 'posts' | 'followers' | 'following';

export default function ProfileScreen() {
  const { session, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [authError, setAuthError] = useState('');
  const { reels, following, followers, socialLoading, socialError, refresh, pending, profile, profileLoading, profileError, retryProfile, toggleFollowing, updateProfile } = useAppState();
  const [savingProfile, setSavingProfile] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [section, setSection] = useState<Section>('posts');
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(profile.name);
  const [draftBio, setDraftBio] = useState(profile.bio);
  const myPosts = reels.filter(reel => reel.handle === '@you');

  function beginEdit() {
    if (profileLoading || profileError || savingProfile) return;
    setSaveError('');
    setDraftName(profile.name);
    setDraftBio(profile.bio);
    setEditing(true);
  }

  async function saveProfile() {
    if (!draftName.trim() || savingProfile) return;
    setSavingProfile(true);
    setSaveError('');
    try {
      await updateProfile(draftName, draftBio);
      setEditing(false);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Could not save your profile.');
    } finally { setSavingProfile(false); }
  }

  async function leave() {
    setSigningOut(true);
    setAuthError('');
    try { await signOut(); }
    catch { setAuthError('Could not log out. Please try again.'); setSigningOut(false); }
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.topBar}><Text style={styles.pageTitle}>Your corner.</Text><Ionicons name="sparkles-outline" size={23} color={colors.accent} /></View>
        <View style={styles.hero}><GradientFill tone="soft" radius={28} />
          <View style={styles.avatar}><GradientFill radius={30} /><Text style={styles.avatarText}>{profile.name.charAt(0).toUpperCase()}</Text></View>
          <Text style={styles.name}>{profile.name}</Text>
          <Text style={styles.handle}>{session ? `@creator_${session.user.id.slice(0, 8)}` : ''}</Text>
          <Text style={styles.bio}>{profile.bio || 'Add a bio to tell people about yourself.'}</Text>
          <Pressable onPress={beginEdit} disabled={profileLoading || !!profileError || savingProfile} style={styles.editButton} accessibilityRole="button" accessibilityLabel="Edit profile"><Ionicons name="create-outline" size={17} color={colors.accent} /><Text style={styles.editText}>{profileLoading ? 'Loading profile…' : 'Edit profile'}</Text></Pressable>
          {profileError ? <><Text accessibilityRole="alert" style={styles.note}>{profileError}</Text><Pressable onPress={retryProfile} accessibilityRole="button" style={styles.editButton}><Text style={styles.editText}>Retry loading profile</Text></Pressable></> : null}
        </View>

        <View style={styles.shortcuts}><Pressable style={styles.shortcut} onPress={() => router.navigate('/saved')} accessibilityRole="button"><Ionicons name="bookmark-outline" size={20} color={colors.accent} /><Text style={styles.shortcutText}>Saved collection</Text><Ionicons name="chevron-forward" size={15} color={colors.muted} /></Pressable><Pressable style={styles.shortcut} onPress={() => router.navigate('/creator')} accessibilityRole="button"><Ionicons name="analytics-outline" size={20} color={colors.accent} /><Text style={styles.shortcutText}>Creator studio</Text><Ionicons name="chevron-forward" size={15} color={colors.muted} /></Pressable></View>
        {editing ? <View style={styles.editCard}>
          <Text style={styles.fieldLabel}>NAME</Text>
          <TextInput value={draftName} onChangeText={setDraftName} style={styles.input} maxLength={40} accessibilityLabel="Profile name" />
          <Text style={styles.fieldLabel}>BIO</Text>
          <TextInput value={draftBio} onChangeText={setDraftBio} style={[styles.input, styles.bioInput]} multiline maxLength={160} accessibilityLabel="Profile bio" />
          <View style={styles.editActions}>
            <Pressable onPress={() => setEditing(false)} disabled={savingProfile} style={styles.cancelButton} accessibilityRole="button"><Text style={styles.cancelText}>Cancel</Text></Pressable>
            <Pressable onPress={saveProfile} disabled={!draftName.trim() || savingProfile} style={[styles.saveButton, (!draftName.trim() || savingProfile) && styles.disabledButton]} accessibilityRole="button"><GradientFill radius={11} /><Text style={styles.saveText}>{savingProfile ? 'Saving…' : 'Save changes'}</Text></Pressable>
          </View>
          {saveError ? <Text accessibilityRole="alert" style={styles.note}>{saveError}</Text> : null}
        </View> : null}

        <View style={styles.stats}>
          <Pressable onPress={() => setSection('posts')} style={[styles.stat, section === 'posts' && styles.activeStat]} accessibilityRole="button" accessibilityLabel={`${myPosts.length} posts`}><Text style={styles.statNumber}>{socialLoading || socialError ? '—' : myPosts.length}</Text><Text style={styles.statLabel}>Posts</Text></Pressable>
          <Pressable onPress={() => setSection('followers')} style={[styles.stat, section === 'followers' && styles.activeStat]} accessibilityRole="button" accessibilityLabel={`${followers.length} followers`}><Text style={styles.statNumber}>{socialLoading || socialError ? '—' : followers.length}</Text><Text style={styles.statLabel}>Followers</Text></Pressable>
          <Pressable onPress={() => setSection('following')} style={[styles.stat, section === 'following' && styles.activeStat]} accessibilityRole="button" accessibilityLabel={`${following.length} following`}><Text style={styles.statNumber}>{socialLoading || socialError ? '—' : following.length}</Text><Text style={styles.statLabel}>Following</Text></Pressable>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{section === 'posts' ? 'Your posts' : section === 'followers' ? 'Followers' : 'Following'}</Text>
          {section === 'posts' ? <Pressable onPress={() => router.push('/create')} style={styles.addButton} accessibilityRole="button" accessibilityLabel="Create a post"><Ionicons name="add" size={19} color={colors.accent} /><Text style={styles.addText}>Create</Text></Pressable> : null}
        </View>

        {section === 'posts' ? myPosts.length ? myPosts.map(reel => <ReelCard key={reel.id} reel={reel} />) : <View style={styles.empty}><Ionicons name="grid-outline" size={34} color={colors.accent} /><Text style={styles.emptyTitle}>No posts yet</Text><Text style={styles.emptyText}>Your reels and photo posts will appear here.</Text><Pressable onPress={() => router.push('/create')} style={styles.emptyAction} accessibilityRole="button"><Text style={styles.emptyActionText}>Create your first post</Text></Pressable></View> : null}
        {section === 'followers' ? followers.length ? followers.map(person => <View key={person.id} style={styles.personRow}><View style={styles.personAvatar}><Text style={styles.personInitial}>{person.name.charAt(0)}</Text></View><View style={styles.personDetails}><Text style={styles.personName}>{person.name}</Text><Text numberOfLines={1} style={styles.personHandle}>{person.handle}</Text></View></View>) : <View style={styles.empty}><Ionicons name="people-outline" size={34} color={colors.accent} /><Text style={styles.emptyTitle}>No followers yet</Text><Text style={styles.emptyText}>When people follow you, they will appear here.</Text></View> : null}
        {section === 'following' ? following.length ? following.map(person => <View key={person.handle} style={styles.personRow}><View style={styles.personAvatar}><Text style={styles.personInitial}>{person.name.charAt(0).toUpperCase()}</Text></View><View style={styles.personDetails}><Text style={styles.personName}>{person.name}</Text><Text numberOfLines={1} style={styles.personHandle}>{person.handle}</Text></View><Pressable disabled={pending.length > 0 || socialLoading} onPress={() => toggleFollowing(person.handle)} style={styles.unfollowButton} accessibilityRole="button" accessibilityLabel={`Unfollow ${person.name}`}><Text style={styles.unfollowText}>Following</Text></Pressable></View>) : <View style={styles.empty}><Ionicons name="person-add-outline" size={34} color={colors.accent} /><Text style={styles.emptyTitle}>Not following anyone yet</Text><Text style={styles.emptyText}>Follow creators in Discover to see them here.</Text><Pressable onPress={() => router.navigate('/')} style={styles.emptyAction} accessibilityRole="button"><Text style={styles.emptyActionText}>Explore creators</Text></Pressable></View> : null}
        <Pressable onPress={leave} disabled={signingOut} style={styles.editButton} accessibilityRole="button"><Ionicons name="log-out-outline" size={18} color={colors.accent} /><Text style={styles.editText}>{signingOut ? 'Logging out…' : 'Log out'}</Text></Pressable>
        {authError ? <Text accessibilityRole="alert" style={styles.note}>{authError}</Text> : null}
<Pressable onPress={refresh} disabled={socialLoading || pending.length > 0} style={styles.editButton} accessibilityRole="button"><Text style={styles.editText}>Refresh account</Text></Pressable>
        <Text style={styles.note}>Your posts, saves, follows and profile are stored in your account.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas }, content: { paddingHorizontal: 18, paddingTop: 22, paddingBottom: 38 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, pageTitle: { fontSize: 27, fontWeight: '800', color: colors.ink }, preview: { fontSize: 12, fontWeight: '800', letterSpacing: 1.1, color: colors.muted },
  hero: { alignItems: 'center', marginTop: 22, backgroundColor: colors.accentSoft, borderRadius: 28, padding: 25 }, avatar: { width: 84, height: 84, borderRadius: 30, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: colors.white }, avatarText: { fontSize: 36, fontWeight: '800', color: colors.highlight },
  shortcuts: { gap: 8, marginTop: 15 }, shortcut: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, backgroundColor: colors.white, borderRadius: 14, borderWidth: 1, borderColor: colors.border }, shortcutText: { flex: 1, color: colors.ink, fontSize: 15, fontWeight: '700' },
  name: { color: colors.ink, fontSize: 23, fontWeight: '800', marginTop: 12 }, handle: { color: colors.accent, fontSize: 16, fontWeight: '700', marginTop: 2 }, bio: { color: colors.muted, fontSize: 16, lineHeight: 23, textAlign: 'center', marginTop: 10, maxWidth: 310 },
  editButton: { flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, paddingHorizontal: 17, paddingVertical: 10, borderRadius: 13, marginTop: 17 }, editText: { color: colors.accent, fontSize: 15, fontWeight: '800' },
  editCard: { backgroundColor: colors.white, borderRadius: 18, borderWidth: 1, borderColor: colors.border, padding: 16, marginTop: 18 }, fieldLabel: { color: colors.ink, fontSize: 13, fontWeight: '800', letterSpacing: 1.1, marginBottom: 7 }, input: { borderWidth: 1, borderColor: colors.border, borderRadius: 11, paddingHorizontal: 12, paddingVertical: 10, color: colors.ink, fontSize: 17, marginBottom: 15 }, bioInput: { minHeight: 75, textAlignVertical: 'top' }, editActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }, cancelButton: { paddingHorizontal: 15, paddingVertical: 11 }, cancelText: { fontSize: 16, color: colors.muted, fontWeight: '700' }, saveButton: { backgroundColor: colors.accent, borderRadius: 11, paddingHorizontal: 15, paddingVertical: 11 }, disabledButton: { opacity: 0.5 }, saveText: { fontSize: 16, color: colors.white, fontWeight: '800' },
  stats: { flexDirection: 'row', backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 18, marginTop: 25, overflow: 'hidden' }, stat: { flex: 1, alignItems: 'center', paddingVertical: 17 }, activeStat: { backgroundColor: colors.accentSoft }, statNumber: { color: colors.ink, fontSize: 21, fontWeight: '800' }, statLabel: { color: colors.muted, fontSize: 14, marginTop: 3 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 30, marginBottom: 13 }, sectionTitle: { color: colors.ink, fontSize: 19, fontWeight: '800' }, addButton: { flexDirection: 'row', alignItems: 'center', gap: 2 }, addText: { color: colors.accent, fontSize: 15, fontWeight: '800' },
  empty: { alignItems: 'center', backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 19, paddingHorizontal: 20, paddingVertical: 32 }, emptyTitle: { color: colors.ink, fontSize: 18, fontWeight: '800', marginTop: 12 }, emptyText: { color: colors.muted, fontSize: 15, lineHeight: 22, textAlign: 'center', marginTop: 5 }, emptyAction: { backgroundColor: colors.accent, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 11, marginTop: 16 }, emptyActionText: { color: colors.white, fontSize: 15, fontWeight: '800' },
  personRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 15, padding: 12, marginBottom: 9 }, personAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }, personInitial: { color: colors.accent, fontSize: 19, fontWeight: '800' }, personDetails: { flex: 1, marginLeft: 10 }, personName: { color: colors.ink, fontSize: 16, fontWeight: '800' }, personHandle: { color: colors.muted, fontSize: 14, marginTop: 2 }, unfollowButton: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 8 }, unfollowText: { color: colors.accent, fontSize: 14, fontWeight: '800' },
  note: { color: colors.muted, fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 24 },
});



