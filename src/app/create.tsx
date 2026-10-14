import { GradientFill } from '../components/GradientFill';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useAppState } from '../state';
import { categories, categoryColors, colors, type Category } from '../theme';
import { CameraStudio } from '../components/CameraStudio';

function isVideoAsset(asset: ImagePicker.ImagePickerAsset) {
  return asset.type === 'video' || asset.mimeType?.startsWith('video/') === true;
}

function VideoPreview({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri);
  return <VideoView player={player} style={styles.preview} nativeControls contentFit="cover" />;
}

function MediaPreview({ asset }: { asset: ImagePicker.ImagePickerAsset | null }) {
  if (!asset) return <View style={styles.placeholder}><Ionicons name="videocam-outline" size={43} color={colors.accent} /><Text style={styles.placeholderText}>Your reel preview appears here</Text></View>;
  if (isVideoAsset(asset)) return <VideoPreview key={asset.uri} uri={asset.uri} />;
  return <Image source={{ uri: asset.uri }} style={styles.preview} resizeMode="cover" />;
}

export default function CreateScreen() {
  const { addReel, profile } = useAppState();
  const [asset, setAsset] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('');
  const [category, setCategory] = useState<Exclude<Category, 'All'>>('Food');

  function acceptVideo(selected: ImagePicker.ImagePickerAsset) {
    if (!isVideoAsset(selected)) {
      Alert.alert('Choose a video', 'Reels need a video recording.');
      return;
    }
    if (selected.duration != null && selected.duration > 60_000) {
      Alert.alert('Video is too long', 'Choose a reel that is 60 seconds or shorter.');
      return;
    }
    setAsset(selected);
  }

  async function importReel() {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) return Alert.alert('Access needed', 'Allow photo library access to choose a reel.');
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'] });
      if (!result.canceled) acceptVideo(result.assets[0]);
    } catch { Alert.alert('Could not open your library', 'Please try again.'); }
  }

  async function recordReel() {
    setCameraOpen(false);
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) return Alert.alert('Camera access needed', 'Allow camera access to record a reel.');
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['videos'], videoMaxDuration: 60 });
      if (!result.canceled) acceptVideo(result.assets[0]);
    } catch { Alert.alert('Could not open your camera', 'Please try recording your reel again.'); }
  }

  async function choosePhoto() {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) return Alert.alert('Access needed', 'Allow photo library access to choose a photo.');
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
      if (!result.canceled) setAsset(result.assets[0]);
    } catch { Alert.alert('Could not open your library', 'Please try again.'); }
  }

  async function publish() {
    if (publishing) return;
    setPublishError('');
    if (!asset || !title.trim() || !city.trim()) return Alert.alert('Almost there', 'Add a reel or photo, a title and a city.');
    const video = isVideoAsset(asset);
    setPublishing(true);
    try {
    await addReel({ id: Date.now().toString(), creator: profile.name, handle: '@you', title: title.trim(), description: description.trim(), category, city: city.trim(), emoji: '✨', action: 'Save story', mediaUri: asset.uri, mediaType: video ? 'video' : 'image', mimeType: asset.mimeType });
    if (video) router.replace('/reels');
    else router.replace('/profile');
    } catch (error) { setPublishError(error instanceof Error ? error.message : 'Could not publish. Please retry.'); }
    finally { setPublishing(false); }
  }

  if (cameraOpen) return <CameraStudio onClose={() => setCameraOpen(false)} onSystemCamera={recordReel} onCapture={selected => { acceptVideo(selected); setCameraOpen(false); }} />;

  return <SafeAreaView style={styles.screen} edges={['top']}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <View style={styles.header}><Pressable onPress={() => router.back()} style={styles.close} accessibilityRole="button" accessibilityLabel="Close"><Ionicons name="close" size={23} color={colors.ink} /></Pressable><Text style={styles.headerTitle}>Create</Text><View style={styles.close} /></View>
    <Text style={styles.heading}>Create your next reel.</Text><Text style={styles.subheading}>Record up to 60 seconds, or import a video from your phone.</Text>
    <View style={styles.mediaBox}><MediaPreview asset={asset} /></View>
    {asset ? <Text style={styles.mediaDetail}>{isVideoAsset(asset) ? `Video reel${asset.duration != null ? ` · ${Math.ceil(asset.duration / 1000)} sec` : ''}` : 'Photo post'} selected</Text> : null}
    <View style={styles.mediaActions}>
      <Pressable onPress={() => setCameraOpen(true)} style={styles.recordButton} accessibilityRole="button"><GradientFill radius={13} /><Ionicons name="videocam-outline" size={19} color={colors.white} /><Text style={styles.recordText}>Record reel</Text></Pressable>
      <Pressable onPress={importReel} style={styles.importButton} accessibilityRole="button"><Ionicons name="cloud-upload-outline" size={19} color={colors.accent} /><Text style={styles.importText}>Import video</Text></Pressable>
    </View>
    <Pressable onPress={choosePhoto} style={styles.photoButton} accessibilityRole="button"><Ionicons name="image-outline" size={17} color={colors.muted} /><Text style={styles.photoText}>Or share a photo post</Text></Pressable>
    <Text style={styles.label}>TITLE *</Text><TextInput value={title} onChangeText={setTitle} placeholder="What is the story?" placeholderTextColor={colors.muted} style={styles.input} maxLength={70} />
    <Text style={styles.label}>DESCRIPTION</Text><TextInput value={description} onChangeText={setDescription} placeholder="Tell people why it matters" placeholderTextColor={colors.muted} style={[styles.input, styles.multiline]} multiline maxLength={240} />
    <Text style={styles.label}>CITY *</Text><TextInput value={city} onChangeText={setCity} placeholder="Where is this?" placeholderTextColor={colors.muted} style={styles.input} maxLength={40} />
    <Text style={styles.label}>CATEGORY</Text><View style={styles.categoryGrid}>{categories.filter(item => item !== 'All').map(item => <Pressable key={item} onPress={() => setCategory(item as Exclude<Category, 'All'>)} style={[styles.categoryChip, { backgroundColor: categoryColors[item] }, category === item && styles.categorySelected]}><Text style={styles.categoryText}>{item}</Text></Pressable>)}</View>
    <Pressable onPress={publish} disabled={publishing} style={[styles.publish, publishing && { opacity: .6 }]}><GradientFill /><Text style={styles.publishText}>{publishing ? 'Uploading and publishing…' : asset && isVideoAsset(asset) ? 'Post reel' : 'Post story'}</Text><Ionicons name="arrow-forward" size={19} color={colors.white} /></Pressable>
    {publishError ? <Text accessibilityRole="alert" style={styles.disclaimer}>{publishError}</Text> : null}
    <Text style={styles.disclaimer}>Up to 25 MB · Your post will be visible to signed-in members.</Text>
  </ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas }, content: { padding: 18, paddingBottom: 36 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, close: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' }, headerTitle: { fontSize: 17, fontWeight: '800', color: colors.ink },
  heading: { fontSize: 27, fontWeight: '800', color: colors.ink, lineHeight: 33, marginTop: 25 }, subheading: { fontSize: 16, color: colors.muted, marginTop: 6 },
  mediaBox: { borderRadius: 22, overflow: 'hidden', marginTop: 22, backgroundColor: colors.accentSoft }, placeholder: { height: 235, justifyContent: 'center', alignItems: 'center', gap: 12 }, placeholderText: { color: colors.accent, fontWeight: '700', fontSize: 16 }, preview: { width: '100%', height: 235 },
  mediaDetail: { color: colors.muted, textAlign: 'center', fontSize: 15, marginTop: 9 },
  mediaActions: { flexDirection: 'row', gap: 9, marginTop: 16 }, recordButton: { flex: 1, minHeight: 47, borderRadius: 13, backgroundColor: colors.accent, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7 }, recordText: { color: colors.white, fontWeight: '800', fontSize: 15 },
  importButton: { flex: 1, minHeight: 47, borderRadius: 13, backgroundColor: colors.accentSoft, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7 }, importText: { color: colors.accent, fontWeight: '800', fontSize: 15 },
  photoButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingTop: 14 }, photoText: { fontSize: 15, fontWeight: '700', color: colors.muted },
  label: { color: colors.ink, fontSize: 13, fontWeight: '800', letterSpacing: 1.2, marginTop: 16, marginBottom: 8 }, input: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, fontSize: 17, color: colors.ink }, multiline: { minHeight: 80, textAlignVertical: 'top' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, categoryChip: { borderRadius: 11, paddingHorizontal: 13, paddingVertical: 10, borderWidth: 2, borderColor: 'transparent' }, categorySelected: { borderColor: colors.accent }, categoryText: { color: colors.ink, fontSize: 15, fontWeight: '800' },
  publish: { backgroundColor: colors.accent, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16, marginTop: 28 }, publishText: { color: colors.white, fontWeight: '800', fontSize: 17 }, disclaimer: { fontSize: 14, color: colors.muted, textAlign: 'center', marginTop: 12 },
});


