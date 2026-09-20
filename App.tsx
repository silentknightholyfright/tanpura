import 'react-native-url-polyfill/auto';
import React from 'react';
import { registerRootComponent } from 'expo';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';

import { AuthProvider } from '@/lib/auth';
import { RootNavigator } from '@/navigation/RootNavigator';

function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}

// registerRootComponent handles mounting on both native (AppRegistry) and
// web (ReactDOM.createRoot). Required when `main` in package.json points
// directly to App.tsx rather than going through expo/AppEntry.
registerRootComponent(App);

export default App;
