import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../theme';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: colors.accent,
      tabBarInactiveTintColor: colors.muted,
      tabBarLabelStyle: { fontSize: 14, fontWeight: '700', color: colors.muted },
      // Keep the tab controls above system navigation buttons and home indicators.
      tabBarStyle: { height: 72 + insets.bottom, paddingTop: 8, paddingBottom: 8 + insets.bottom, backgroundColor: colors.white, borderTopColor: colors.border },
    }}>
      <Tabs.Screen name="index" options={{ title: 'Discover', tabBarIcon: ({ color }) => <Ionicons name="compass-outline" size={23} color={color} /> }} />
      <Tabs.Screen name="reels" options={{ title: 'Reels', tabBarIcon: ({ color }) => <Ionicons name="play-circle-outline" size={23} color={color} /> }} />
      <Tabs.Screen name="saved" options={{ title: 'Saved', tabBarIcon: ({ color }) => <Ionicons name="bookmark-outline" size={23} color={color} /> }} />
      <Tabs.Screen name="messages" options={{ title: 'Chats', tabBarIcon: ({ color }) => <Ionicons name="chatbubbles-outline" size={23} color={color} /> }} />
      <Tabs.Screen name="creator" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color }) => <Ionicons name="person-circle-outline" size={23} color={color} /> }} />
    </Tabs>
  );
}


