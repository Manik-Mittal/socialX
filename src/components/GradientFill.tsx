import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';

const palettes = {
  brand: ['#245CDB', '#7146D8', '#A13CA8'],
  soft: ['#E5F2FF', '#EEE8FF', '#FBEAF3'],
  dark: ['#102C54', '#34245C', '#51294C'],
} as const;

export function GradientFill({ tone = 'brand', radius = 16 }: { tone?: keyof typeof palettes; radius?: number }) {
  return <LinearGradient pointerEvents="none" colors={palettes[tone]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: radius }]} />;
}
