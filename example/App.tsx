import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import Chessboard from 'react-native-chessboard';

export default function App() {
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Chessboard />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
