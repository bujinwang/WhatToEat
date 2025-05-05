import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import HomeScreen from './src/screens/HomeScreen';
import { View, Text } from 'react-native';

const Tab = createBottomTabNavigator();

function HistoryScreen() {
  return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Text>历史记录</Text></View>;
}
function StatsScreen() {
  return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Text>统计分析</Text></View>;
}
function SettingsScreen() {
  return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Text>设置</Text></View>;
}

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarIcon: ({ color, size }) => {
            let iconName: keyof typeof Feather.glyphMap = 'home';
            if (route.name === '记录') iconName = 'camera';
            else if (route.name === '历史') iconName = 'clock';
            else if (route.name === '统计') iconName = 'bar-chart-2';
            else if (route.name === '设置') iconName = 'settings';
            return <Feather name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#ef4444',
          tabBarInactiveTintColor: '#888',
        })}
      >
        <Tab.Screen name="记录" component={HomeScreen} />
        <Tab.Screen name="历史" component={HistoryScreen} />
        <Tab.Screen name="统计" component={StatsScreen} />
        <Tab.Screen name="设置" component={SettingsScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
