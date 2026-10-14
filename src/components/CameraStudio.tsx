import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ImagePickerAsset } from 'expo-image-picker';

export type CameraStudioProps = {
  onCapture: (asset: ImagePickerAsset) => void;
  onClose: () => void;
  onSystemCamera: () => void;
};

// Metro selects CameraStudio.web.tsx for the browser camera implementation.
export function CameraStudio({ onClose, onSystemCamera }: CameraStudioProps) {
  return <View style={styles.page}>
    <Text style={styles.title}>Create a reel</Text>
    <Text style={styles.body}>Live filters and effects are currently available in the web app. On your phone app, you can record with the standard camera or import a video.</Text>
    <Pressable onPress={onSystemCamera} style={styles.button}><Text style={styles.label}>Open phone camera</Text></Pressable>
    <Pressable onPress={onClose} style={styles.button}><Text style={styles.label}>Back to composer</Text></Pressable>
  </View>;
}
const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: '#0C1628', padding: 28, justifyContent: 'center', gap: 20 }, title: { color: 'white', fontSize: 26, fontWeight: '800' }, body: { color: '#CBD5E1', lineHeight: 24 }, button: { padding: 16, borderRadius: 16, backgroundColor: '#245CDB' }, label: { color: 'white', textAlign: 'center', fontWeight: '700' } });
