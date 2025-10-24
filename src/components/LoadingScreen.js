import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';

export default function LoadingScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#007AFF" />
      <Text style={{ marginTop: 10 }}>Loading MoodMap...</Text>
    </View>
  );
}