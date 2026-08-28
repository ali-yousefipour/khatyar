import React from 'react';
import { View } from 'react-native';
import { RadioProvider } from './src/radio/RadioContext';

export default function App() {
  return (
    <View style={{ flex: 1 }}>
      <RadioProvider>
        <View style={{ flex: 1 }} />
      </RadioProvider>
    </View>
  );
}
