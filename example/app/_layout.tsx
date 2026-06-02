import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { CheckmateAuraProvider } from '../components/checkmate-aura';
import { theme } from '../components/theme';

// Root layout: a real native stack header (expo-router → react-navigation
// native-stack → UINavigationBar). The aura provider wraps the whole navigator
// so the checkmate haze covers the entire window — header included.
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <CheckmateAuraProvider>
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: theme.bg },
              headerTintColor: theme.accent,
              headerTitleStyle: { color: theme.text },
              contentStyle: { backgroundColor: theme.bg },
              headerShadowVisible: true,
            }}
          />
        </CheckmateAuraProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
