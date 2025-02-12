// app/(host)/hostTabs/_layout.tsx
import React from "react";
import { Tabs } from "expo-router";
import { View, Text, Image, StyleSheet } from "react-native";
import icons from "@/constants/icons";

interface TabIconProps {
  focused: boolean;
  icon: any;
  title: string;
}

const TabIcon: React.FC<TabIconProps> = ({ focused, icon, title }) => (
  <View style={styles.tabIconContainer}>
    <Image
      source={icon}
      style={[styles.icon, { tintColor: focused ? "#0061FF" : "#666876" }]}
      resizeMode="contain"
    />
    <Text style={[styles.label, { color: focused ? "#0061FF" : "#666876" }]}>{title}</Text>
  </View>
);

const HostTabsLayout = () => {
  console.log("Rendering HostTabsLayout");
  return (
    <Tabs
      screenOptions={{
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: "white",
          position: "absolute",
          bottom: 0,
          width: "100%",
          borderTopColor: "#0061FF1A",
          borderTopWidth: 1,
          minHeight: 60,
          paddingTop: 20, // add some bottom padding
          paddingBottom: 10, // add some bottom padding
        },
      }}
    >
      <Tabs.Screen
        name="hostDashboard"
        options={{
          title: "Home",
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon={icons.home} title="Home" />
          ),
        }}
      />
      <Tabs.Screen
        name="hostCalendarPage"
        options={{
          title: "Calendar",
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon={icons.calendar} title="Calendar" />
          ),
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: "Bookings",
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon={icons.bell} title="Bookings" />
          ),
        }}
      />
      <Tabs.Screen
        name="listings"
        options={{
          title: "Listings",
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon={icons.listing} title="Listing" />
          ),
        }}
      />
      <Tabs.Screen
        name="menu"
        options={{
          title: "Menu",
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon={icons.chat} title="Menu" />
          ),
        }}
      />
    </Tabs>
  );
};

const styles = StyleSheet.create({
  tabIconContainer: {
    flex: 7,
    alignItems: "center",
    justifyContent: "center",
    // Shift the icon container downwards within the tab bar:
    transform: [{ translateY: 8 }],
  },
  icon: {
    width: 28,
    height: 28,
  },
  label: {
    fontSize: 10,
    marginTop: 4,
    textAlign: "center",
    flexWrap: "none",
  },
});

export default HostTabsLayout;
