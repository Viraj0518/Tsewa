import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Tabs } from 'expo-router';
import { colors } from '../../../src/theme/colors';
import { fontSize } from '../../../src/theme/typography';

// Unicode-based tab icons
const TAB_ICONS: Record<string, { default: string; active: string }> = {
  discover: { default: '♡', active: '♥' },
  matches: { default: '◇', active: '◆' },
  rooms: { default: '♪', active: '♫' },
  community: { default: '⊙', active: '⊛' },
  profile: { default: '○', active: '●' },
};

interface TabIconProps {
  name: string;
  focused: boolean;
}

function TabIcon({ name, focused }: TabIconProps) {
  const icons = TAB_ICONS[name] || { default: '○', active: '●' };

  return (
    <View style={styles.tabIconContainer}>
      <Text
        style={[
          styles.tabIcon,
          { color: focused ? colors.lavender : colors.gray400 },
        ]}
      >
        {focused ? icons.active : icons.default}
      </Text>
      {focused && <View style={styles.activeDot} />}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.lavender,
        tabBarInactiveTintColor: colors.gray400,
        tabBarLabelStyle: styles.tabBarLabel,
      }}
    >
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Discover',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="discover" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          title: 'Matches',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="matches" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="rooms"
        options={{
          title: 'Rooms',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="rooms" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: 'Community',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="community" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="profile" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.softWhite,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
    height: 85,
    paddingTop: 8,
    paddingBottom: 24,
    elevation: 0,
    shadowOpacity: 0,
  },
  tabBarLabel: {
    fontSize: fontSize.xs,
    fontWeight: '500',
    marginTop: 2,
  },
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 28,
  },
  tabIcon: {
    fontSize: 22,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.peach,
    marginTop: 2,
  },
});
