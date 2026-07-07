import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { HomeScreen } from '../screens/HomeScreen';
import { NewAnalysisScreen } from '../screens/NewAnalysisScreen';
import { AnalysisDetailScreen } from '../screens/AnalysisDetailScreen';
import { VideoPlayerScreen } from '../screens/VideoPlayerScreen';
import { ScoutScreen } from '../screens/ScoutScreen';
import { ReportScreen } from '../screens/ReportScreen';
import { PerformanceScreen } from '../screens/PerformanceScreen';
import { StudentsHomeScreen } from '../screens/students/StudentsHomeScreen';
import { StudentFormScreen } from '../screens/students/StudentFormScreen';
import { StudentDetailScreen } from '../screens/students/StudentDetailScreen';
import { GroupFormScreen } from '../screens/students/GroupFormScreen';
import { GroupDetailScreen } from '../screens/students/GroupDetailScreen';
import { QuickAssessScreen } from '../screens/students/QuickAssessScreen';
import { colors } from '../theme';

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    primary: colors.primary,
    notification: colors.primary,
  },
};

const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();
const PerfStack = createNativeStackNavigator();
const StudentsStack = createNativeStackNavigator();

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="HomeList" component={HomeScreen} />
      <HomeStack.Screen name="NewAnalysis" component={NewAnalysisScreen} />
      <HomeStack.Screen name="AnalysisDetail" component={AnalysisDetailScreen} />
      <HomeStack.Screen name="VideoPlayer" component={VideoPlayerScreen} />
      <HomeStack.Screen name="Scout" component={ScoutScreen} />
      <HomeStack.Screen name="Report" component={ReportScreen} />
    </HomeStack.Navigator>
  );
}

function StudentsStackNavigator() {
  return (
    <StudentsStack.Navigator screenOptions={{ headerShown: false }}>
      <StudentsStack.Screen name="StudentsHome" component={StudentsHomeScreen} />
      <StudentsStack.Screen name="StudentForm" component={StudentFormScreen} />
      <StudentsStack.Screen name="StudentDetail" component={StudentDetailScreen} />
      <StudentsStack.Screen name="GroupForm" component={GroupFormScreen} />
      <StudentsStack.Screen name="GroupDetail" component={GroupDetailScreen} />
      <StudentsStack.Screen name="QuickAssess" component={QuickAssessScreen} />
    </StudentsStack.Navigator>
  );
}

function PerformanceStackNavigator() {
  return (
    <PerfStack.Navigator screenOptions={{ headerShown: false }}>
      <PerfStack.Screen name="PerformanceMain" component={PerformanceScreen} />
      <PerfStack.Screen name="AnalysisDetail" component={AnalysisDetailScreen} />
      <PerfStack.Screen name="VideoPlayer" component={VideoPlayerScreen} />
      <PerfStack.Screen name="Scout" component={ScoutScreen} />
      <PerfStack.Screen name="Report" component={ReportScreen} />
    </PerfStack.Navigator>
  );
}

export function Navigation() {
  return (
    <NavigationContainer theme={navTheme}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            borderTopWidth: 1,
            height: 60,
            paddingBottom: 8,
          },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '600',
          },
          tabBarIcon: ({ focused, color, size }) => {
            let iconName: string;
            if (route.name === 'Home') {
              iconName = focused ? 'videocam' : 'videocam-outline';
            } else if (route.name === 'Students') {
              iconName = focused ? 'people' : 'people-outline';
            } else if (route.name === 'Performance') {
              iconName = focused ? 'bar-chart' : 'bar-chart-outline';
            } else {
              iconName = 'help-circle-outline';
            }
            return <Ionicons name={iconName as any} size={size} color={color} />;
          },
        })}
      >
        <Tab.Screen name="Home" component={HomeStackNavigator} options={{ title: 'Análises' }} />
        <Tab.Screen name="Students" component={StudentsStackNavigator} options={{ title: 'Alunos' }} />
        <Tab.Screen name="Performance" component={PerformanceStackNavigator} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
