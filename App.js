//TEMP
import { LogBox } from 'react-native';
LogBox.ignoreLogs(['Warning: Text strings must be rendered within a <Text> component']);

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SplashScreen from './src/screens/SplashScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';
import LoginScreen from './src/auth/LoginScreen';
import SignUpScreen from './src/auth/SignUpScreen';
import HomeScreen from './src/screens/HomeScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import MoodTrackerScreen from './src/screens/MoodTrackerScreen';
import TaskScreen from './src/screens/TaskScreen'
import TaskEditorScreen from './src/screens/TaskEditorScreen'
import EnhancedAnalyticsScreen from './src/screens/EnhancedAnalyticsScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import SelfCareScreen from './src/screens/SelfCareScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import TaskListScreen from './src/screens/TaskListScreen';
import SimpleMoodHistoryScreen from './src/screens/SimpleMoodHistoryScreen';
import SimpleTaskProgressScreen from './src/screens/SimpleTaskProgressScreen';
import AdminHome from './src/screens/admin/AdminHome';
import UserManagement from './src/screens/admin/UserManagement';
import TaskCategories from './src/screens/admin/TaskCategories';
import AnalyticsReports from './src/screens/admin/AnalyticsReports';
import SystemLogs from './src/screens/admin/SystemLogs';
import Documentation from './src/screens/admin/Documentation';
import DatabaseViewer from './src/screens/admin/DatabaseViewer';
import { AppProvider } from './src/contexts/AppContext';
import { ThemeProvider } from './src/contexts/ThemeContext';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <ThemeProvider>
      <AppProvider>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Splash" component={SplashScreen} />
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="SignUp" component={SignUpScreen} />
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="MoodTracker" component={MoodTrackerScreen} />
          <Stack.Screen name="TaskRecommendations" component={TaskScreen} />
          <Stack.Screen name="TaskEditor" component={TaskEditorScreen} />
          <Stack.Screen name="Analytics" component={EnhancedAnalyticsScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="SelfCare" component={SelfCareScreen} />
          <Stack.Screen name="TaskList" component={TaskListScreen} />
          <Stack.Screen name="SimpleMoodHistory" component={SimpleMoodHistoryScreen} />
          <Stack.Screen name="SimpleTaskProgress" component={SimpleTaskProgressScreen} />
          <Stack.Screen name="AdminHome" component={AdminHome} />
          <Stack.Screen name="UserManagement" component={UserManagement} />
          <Stack.Screen name="TaskCategories" component={TaskCategories} />
          <Stack.Screen name="AnalyticsReports" component={AnalyticsReports} />
          <Stack.Screen name="SystemLogs" component={SystemLogs} />
          <Stack.Screen name="Documentation" component={Documentation} />
          <Stack.Screen name="DatabaseViewer" component={DatabaseViewer} />
        </Stack.Navigator>
      </NavigationContainer>
    </AppProvider>
    </ThemeProvider>
  );
}
