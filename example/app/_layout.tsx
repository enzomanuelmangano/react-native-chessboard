import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RippleProvider } from './ripple';

// Root layout: a real native stack header (expo-router → react-navigation
// native-stack → UINavigationBar). The RippleProvider wraps the whole
// navigator so the glass wave covers the entire window — header included.
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <RippleProvider>
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: '#0b0b0f' },
              headerTintColor: '#0a84ff',
              headerTitleStyle: { color: '#f5f5f7' },
              contentStyle: { backgroundColor: '#0b0b0f' },
              headerShadowVisible: true,
            }}
          />
        </RippleProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
