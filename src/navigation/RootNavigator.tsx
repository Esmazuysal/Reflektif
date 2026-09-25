import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { colors } from '../theme/colors';
import { HomeScreen } from '../screens/HomeScreen';
import { HealthScreen } from '../screens/HealthScreen';
import { LocationScreen } from '../screens/LocationScreen';
import { MedicationsScreen } from '../screens/MedicationsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { GamesScreen } from '../screens/GamesScreen';

const Tab = createBottomTabNavigator();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: colors.bg,
    card: colors.bgSoft,
    text: colors.text,
    border: colors.border,
    primary: colors.accent,
  },
};

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Ana: '◈',
    Sağlık: '♡',
    Konum: '◎',
    İlaçlar: '✚',
    Oyunlar: '◇',
    Profil: '○',
  };
  return (
    <Text style={[styles.icon, focused && styles.iconFocused]}>
      {icons[label] ?? '·'}
    </Text>
  );
}

export function RootNavigator() {
  return (
    <NavigationContainer theme={navTheme}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: styles.tabBar,
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarLabelStyle: styles.tabLabel,
          tabBarIcon: ({ focused }) => (
            <TabIcon label={route.name} focused={focused} />
          ),
        })}
      >
        <Tab.Screen name="Ana" component={HomeScreen} />
        <Tab.Screen name="Sağlık" component={HealthScreen} />
        <Tab.Screen name="Konum" component={LocationScreen} />
        <Tab.Screen name="İlaçlar" component={MedicationsScreen} />
        <Tab.Screen name="Oyunlar" component={GamesScreen} />
        <Tab.Screen name="Profil" component={ProfileScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#0C2424',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    height: 64,
    paddingBottom: 8,
    paddingTop: 6,
  },
  tabLabel: {
    fontFamily: 'DMSans_500Medium',
    fontSize: 11,
  },
  icon: {
    fontSize: 16,
    color: colors.textMuted,
  },
  iconFocused: {
    color: colors.accent,
  },
});
