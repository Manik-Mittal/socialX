import { useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { reelFilters, type ReelFilterId } from '../camera/filters';

type Props = {
  selected: ReelFilterId;
  intensity: number;
  disabled: boolean;
  onSelect: (id: ReelFilterId) => void;
  onIntensity: (amount: number) => void;
};
export function ReelFilterPicker({ selected, intensity, disabled, onSelect, onIntensity }: Props) {
  const trackWidth = useRef(1);
  const adjust = (x: number) => {
    if (!disabled) onIntensity(Math.round(Math.max(0, Math.min(1, x / trackWidth.current)) * 100) / 100);
  };
  return <View style={s.container}>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.list}>
      {reelFilters.map(filter => <Pressable key={filter.id} accessibilityRole="button" accessibilityLabel={`${filter.name} filter`} accessibilityState={{ selected: selected === filter.id, disabled }} disabled={disabled} onPress={() => onSelect(filter.id)} style={s.item}>
        <View style={[s.ring, selected === filter.id && s.selected]}>
          <LinearGradient colors={[filter.color, '#24283D']} style={s.swatch}><Text style={s.symbol}>{filter.id === 'original' ? '○' : '✦'}</Text></LinearGradient>
        </View><Text style={[s.label, selected === filter.id && s.selectedLabel]}>{filter.name}</Text>
      </Pressable>)}
    </ScrollView>
    {selected !== 'original' && <View style={s.intensity}>
      <Text style={s.label}>Strength</Text>
      <View accessible accessibilityRole="adjustable" accessibilityLabel="Filter strength" accessibilityValue={{ min: 0, max: 100, now: Math.round(intensity * 100) }} accessibilityState={{ disabled }} accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]} onAccessibilityAction={event => { if (!disabled) onIntensity(Math.max(0, Math.min(1, intensity + (event.nativeEvent.actionName === 'increment' ? .1 : -.1)))); }}
        style={s.slider} onLayout={event => { trackWidth.current = event.nativeEvent.layout.width; }}
        onStartShouldSetResponder={() => !disabled} onMoveShouldSetResponder={() => !disabled}
        onResponderGrant={event => adjust(event.nativeEvent.locationX)} onResponderMove={event => adjust(event.nativeEvent.locationX)}>
        <View pointerEvents="none" style={s.track}><View style={[s.fill, { width: `${intensity * 100}%` }]} /></View>
        <View pointerEvents="none" style={[s.thumb, { left: `${intensity * 100}%` }]} />
      </View><Text style={s.percent}>{Math.round(intensity * 100)}%</Text>
    </View>}
  </View>;
}
const s = StyleSheet.create({
  container: { paddingTop: 10 }, list: { gap: 12, paddingHorizontal: 2 }, item: { width: 72, alignItems: 'center', gap: 6 },
  ring: { width: 64, height: 64, borderRadius: 32, padding: 4, borderWidth: 2, borderColor: 'transparent' },
  selected: { borderColor: '#D5AAFF' }, swatch: { flex: 1, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  symbol: { color: 'white', fontSize: 26 }, label: { color: '#BFC8DF', fontSize: 15 }, selectedLabel: { color: 'white', fontWeight: '700' },
  intensity: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 4 },
  slider: { flex: 1, height: 44, justifyContent: 'center' }, track: { height: 4, borderRadius: 2, backgroundColor: '#3A4058' },
  fill: { height: 4, borderRadius: 2, backgroundColor: '#D5AAFF' }, thumb: { position: 'absolute', top: 13, marginLeft: -9, width: 18, height: 18, borderRadius: 9, backgroundColor: 'white' },
  percent: { color: 'white', fontSize: 15, minWidth: 40, textAlign: 'right' },
});
