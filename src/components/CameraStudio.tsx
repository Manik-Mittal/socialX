import { useState } from 'react';
import { NativeModules, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { ImagePickerAsset } from 'expo-image-picker';
import { NativeEffectsStudio } from './NativeEffectsStudio';

export type CameraStudioProps = {
  onCapture: (asset: ImagePickerAsset) => void;
  onClose: () => void;
  onSystemCamera: () => void;
};

// Metro selects CameraStudio.web.tsx for the browser camera implementation.
export function CameraStudio(props: CameraStudioProps) {
  const { onClose, onSystemCamera } = props;
  const [enabled, setEnabled] = useState(false);
  const token = (Platform.OS === 'ios' ? process.env.EXPO_PUBLIC_CAMERA_KIT_IOS_TOKEN : process.env.EXPO_PUBLIC_CAMERA_KIT_ANDROID_TOKEN)?.trim();
  const configured = !!token && !!(process.env.EXPO_PUBLIC_CAMERA_KIT_COLOR_GROUP_ID || process.env.EXPO_PUBLIC_CAMERA_KIT_FACE_GROUP_ID);
  const nativeAvailable = !!NativeModules.CameraKitContext;
  if (enabled && configured && nativeAvailable) return <NativeEffectsStudio {...props} token={token!} />;
  return <View style={styles.page}>
    <Text style={styles.title}>Create a reel</Text>
    <Text style={styles.body}>Record with color filters and face effects.</Text>
    {configured && nativeAvailable ? <Pressable accessibilityRole="button" onPress={() => setEnabled(true)} style={styles.button}><Text style={styles.label}>Open effects camera</Text></Pressable> : <Text style={styles.body}>{!configured ? 'Effects are awaiting Camera Kit setup. You can still record an original reel below.' : 'Install the SocialX development build to use effects. They are unavailable in Expo Go.'}</Text>}
    <Pressable onPress={onSystemCamera} style={styles.button}><Text style={styles.label}>Open phone camera</Text></Pressable>
    <Pressable onPress={onClose} style={styles.button}><Text style={styles.label}>Back to composer</Text></Pressable>
  </View>;
}
const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: '#0C1628', padding: 28, justifyContent: 'center', gap: 20 }, title: { color: 'white', fontSize: 26, fontWeight: '800' }, body: { color: '#CBD5E1', lineHeight: 24 }, button: { padding: 16, borderRadius: 16, backgroundColor: '#245CDB' }, label: { color: 'white', textAlign: 'center', fontWeight: '700' } });
