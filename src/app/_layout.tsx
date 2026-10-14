import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppStateProvider } from '../state';
import { colors } from '../theme';
import { ActivityIndicator, View } from 'react-native';
import { AuthProvider, useAuth } from '../auth';
import { EngagementProvider } from '../engagement';

export default function RootLayout() {
  return <AuthProvider><AppNavigation /></AuthProvider>;
}

function AppNavigation() {
  const { session, loading } = useAuth();
  if (loading) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.canvas }}><ActivityIndicator color={colors.accent} accessibilityLabel="Restoring your session" /></View>;
  return (
    <AppStateProvider key={session?.user.id ?? 'signed-out'}>
      <EngagementProvider>
      <View style={{ flex: 1, backgroundColor: colors.backdrop, alignItems: 'center' }}><View style={{ flex: 1, width: '100%', maxWidth: 600 }}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.canvas } }}>
        <Stack.Protected guard={!session}>
          <Stack.Screen name="login" />
          <Stack.Screen name="signup" />
        </Stack.Protected>
        <Stack.Protected guard={!!session}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="create" options={{ presentation: 'modal' }} />
          <Stack.Screen name="chat/[userId]" />
          <Stack.Screen name="post/[id]" />
          <Stack.Screen name="comments/[id]" options={{ presentation: 'modal' }} />
        </Stack.Protected>
      </Stack>
      </View></View>
      </EngagementProvider>
    </AppStateProvider>
  );
}

