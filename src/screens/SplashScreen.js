import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useApp } from '../contexts/AppContext';

export default function SplashScreen({ navigation }) {
  const { state } = useApp();
  const { user, loading } = state;

  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => {
        if (user) {
          // Check if user is admin and redirect accordingly
          if (user.role === 'admin') {
            console.log('Admin user detected in SplashScreen, redirecting to AdminHome');
            navigation.replace('AdminHome');
          } else {
            navigation.replace('Home');
          }
        } else {
          navigation.replace('Welcome');
        }
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [user, loading, navigation]);

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Text style={styles.logo}>MoodMap</Text>
      </View>
      <ActivityIndicator size="large" color="#7B287D" style={styles.loader} />
      <Text style={styles.loadingText}>
        {loading ? 'Loading...' : 'Welcome!'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: 40,
  },
  logo: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#330C2F',
  },
  loader: {
    marginBottom: 20,
  },
  loadingText: {
    color: '#6B7280',
    fontSize: 14,
  },
});