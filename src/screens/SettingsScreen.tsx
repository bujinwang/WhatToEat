import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  SafeAreaView,
  StatusBar as RNStatusBar,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  getSettings,
  saveSettings,
  UserSettings,
  calculateBMI,
  calculateRecommendedCalories,
  clearSettings,
  exportSettings,
} from '../services/settingsService';
import { deletePhotoAnalysis, getAllPhotoAnalyses } from '../database';
import { useTheme } from '../contexts/ThemeContext';

export default function SettingsScreen() {
  const { themeMode, setThemeMode } = useTheme();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const loadedSettings = await getSettings();
      setSettings(loadedSettings);
    } catch (error) {
      console.error('Error loading settings:', error);
      Alert.alert('错误', '加载设置失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!settings) return;

    try {
      await saveSettings(settings);
      setIsEditing(false);
      Alert.alert('成功', '设置已保存');
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('错误', '保存设置失败');
    }
  };

  const handleClearCache = () => {
    Alert.alert(
      '清除缓存',
      '确定要清除所有缓存吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确定',
          style: 'destructive',
          onPress: () => Alert.alert('成功', '缓存已清除'),
        },
      ]
    );
  };

  const handleDeleteAllData = () => {
    Alert.alert(
      '删除所有数据',
      '⚠️ 此操作将删除所有历史记录和设置，且无法恢复！确定要继续吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              const analyses = await getAllPhotoAnalyses();
              await Promise.all(analyses.map(a => deletePhotoAnalysis(a.id)));
              await clearSettings();
              await loadSettings();
              Alert.alert('成功', '所有数据已删除');
            } catch (error) {
              console.error('Error deleting data:', error);
              Alert.alert('错误', '删除数据失败');
            }
          },
        },
      ]
    );
  };

  const handleExportData = async () => {
    try {
      const data = await exportSettings();
      Alert.alert('导出成功', `数据已准备好：\n\n${data.substring(0, 200)}...`);
    } catch (error) {
      console.error('Error exporting data:', error);
      Alert.alert('错误', '导出数据失败');
    }
  };

  const getBMI = () => {
    if (!settings) return 0;
    return calculateBMI(settings.profile.height, settings.profile.weight);
  };

  const getRecommendedCalories = () => {
    if (!settings) return 0;
    return calculateRecommendedCalories(settings.profile, settings.goals.goal);
  };

  if (isLoading || !settings) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <Text>加载中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>设置</Text>
          {isEditing ? (
            <TouchableOpacity onPress={handleSaveSettings} style={styles.saveButton}>
              <Feather name="check" size={24} color="white" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.saveButton}>
              <Feather name="edit-2" size={20} color="white" />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* Profile Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>个人信息</Text>

            <View style={styles.card}>
              <View style={styles.profileHeader}>
                <View style={styles.avatar}>
                  <Feather name="user" size={32} color="#ef4444" />
                </View>
                <View style={styles.profileInfo}>
                  <Text style={styles.profileName}>{settings.profile.nickname}</Text>
                  <Text style={styles.profileBMI}>BMI: {getBMI().toFixed(1)}</Text>
                </View>
              </View>

              {isEditing && (
                <>
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>昵称</Text>
                    <TextInput
                      style={styles.formInput}
                      value={settings.profile.nickname}
                      onChangeText={(text) => setSettings({
                        ...settings,
                        profile: { ...settings.profile, nickname: text }
                      })}
                      placeholder="请输入昵称"
                    />
                  </View>

                  <View style={styles.formRow}>
                    <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                      <Text style={styles.formLabel}>年龄</Text>
                      <TextInput
                        style={styles.formInput}
                        value={String(settings.profile.age)}
                        onChangeText={(text) => setSettings({
                          ...settings,
                          profile: { ...settings.profile, age: parseInt(text) || 0 }
                        })}
                        keyboardType="numeric"
                      />
                    </View>

                    <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                      <Text style={styles.formLabel}>性别</Text>
                      <TouchableOpacity
                        style={styles.formInput}
                        onPress={() => {
                          const genders: Array<'male' | 'female' | 'other'> = ['male', 'female', 'other'];
                          const currentIndex = genders.indexOf(settings.profile.gender);
                          const nextGender = genders[(currentIndex + 1) % genders.length];
                          setSettings({
                            ...settings,
                            profile: { ...settings.profile, gender: nextGender }
                          });
                        }}
                      >
                        <Text style={styles.formInputText}>
                          {settings.profile.gender === 'male' ? '男' :
                           settings.profile.gender === 'female' ? '女' : '其他'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.formRow}>
                    <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                      <Text style={styles.formLabel}>身高 (cm)</Text>
                      <TextInput
                        style={styles.formInput}
                        value={String(settings.profile.height)}
                        onChangeText={(text) => setSettings({
                          ...settings,
                          profile: { ...settings.profile, height: parseInt(text) || 0 }
                        })}
                        keyboardType="numeric"
                      />
                    </View>

                    <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                      <Text style={styles.formLabel}>体重 (kg)</Text>
                      <TextInput
                        style={styles.formInput}
                        value={String(settings.profile.weight)}
                        onChangeText={(text) => setSettings({
                          ...settings,
                          profile: { ...settings.profile, weight: parseInt(text) || 0 }
                        })}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>
                </>
              )}
            </View>
          </View>

          {/* Dietary Preferences */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>饮食偏好</Text>

            <View style={styles.card}>
              <SettingSwitch
                label="素食"
                value={settings.preferences.vegetarian}
                onValueChange={(value) => setSettings({
                  ...settings,
                  preferences: { ...settings.preferences, vegetarian: value }
                })}
              />
              <SettingSwitch
                label="纯素食"
                value={settings.preferences.vegan}
                onValueChange={(value) => setSettings({
                  ...settings,
                  preferences: { ...settings.preferences, vegan: value }
                })}
              />
              <SettingSwitch
                label="喜欢辣"
                value={settings.preferences.likesSpicy}
                onValueChange={(value) => setSettings({
                  ...settings,
                  preferences: { ...settings.preferences, likesSpicy: value }
                })}
              />
              <SettingSwitch
                label="偏爱面食"
                value={settings.preferences.prefersNoodles}
                onValueChange={(value) => setSettings({
                  ...settings,
                  preferences: { ...settings.preferences, prefersNoodles: value }
                })}
                isLast
              />
            </View>
          </View>

          {/* Dietary Goals */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>饮食目标</Text>

            <View style={styles.card}>
              <View style={styles.goalItem}>
                <Text style={styles.goalLabel}>目标</Text>
                <Text style={styles.goalValue}>
                  {settings.goals.goal === 'lose_weight' ? '减脂' :
                   settings.goals.goal === 'gain_muscle' ? '增肌' : '维持'}
                </Text>
              </View>

              <View style={styles.goalStats}>
                <View style={styles.goalStat}>
                  <Text style={styles.goalStatLabel}>推荐热量</Text>
                  <Text style={styles.goalStatValue}>{getRecommendedCalories()} kcal</Text>
                </View>
                <View style={styles.goalStat}>
                  <Text style={styles.goalStatLabel}>蛋白质</Text>
                  <Text style={styles.goalStatValue}>{settings.goals.targetProtein}g</Text>
                </View>
                <View style={styles.goalStat}>
                  <Text style={styles.goalStatLabel}>碳水</Text>
                  <Text style={styles.goalStatValue}>{settings.goals.targetCarbs}g</Text>
                </View>
                <View style={styles.goalStat}>
                  <Text style={styles.goalStatLabel}>脂肪</Text>
                  <Text style={styles.goalStatValue}>{settings.goals.targetFat}g</Text>
                </View>
              </View>

              {isEditing && (
                <View style={styles.goalButtons}>
                  {[
                    { value: 'lose_weight', label: '减脂', icon: 'trending-down' },
                    { value: 'maintain', label: '维持', icon: 'minus' },
                    { value: 'gain_muscle', label: '增肌', icon: 'trending-up' },
                  ].map((goal) => (
                    <TouchableOpacity
                      key={goal.value}
                      style={[
                        styles.goalButton,
                        settings.goals.goal === goal.value && styles.goalButtonActive,
                      ]}
                      onPress={() => {
                        const recommended = calculateRecommendedCalories(settings.profile, goal.value as any);
                        setSettings({
                          ...settings,
                          goals: {
                            ...settings.goals,
                            goal: goal.value as any,
                            targetCalories: recommended,
                          }
                        });
                      }}
                    >
                      <Feather
                        name={goal.icon as any}
                        size={20}
                        color={settings.goals.goal === goal.value ? '#ef4444' : '#6b7280'}
                      />
                      <Text
                        style={[
                          styles.goalButtonText,
                          settings.goals.goal === goal.value && styles.goalButtonTextActive,
                        ]}
                      >
                        {goal.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>

          {/* App Settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>应用设置</Text>

            <View style={styles.card}>
              <SettingItem
                label="主题"
                value={themeMode === 'light' ? '浅色' : themeMode === 'dark' ? '深色' : '跟随系统'}
                onPress={() => {
                  const themeOptions = [
                    { label: '浅色', value: 'light' as const },
                    { label: '深色', value: 'dark' as const },
                    { label: '跟随系统', value: 'auto' as const },
                  ];
                  const currentIndex = themeOptions.findIndex(opt => opt.value === themeMode);
                  const nextIndex = (currentIndex + 1) % themeOptions.length;
                  setThemeMode(themeOptions[nextIndex].value);
                }}
              />
              <SettingSwitch
                label="通知提醒"
                value={settings.app.notifications}
                onValueChange={(value) => setSettings({
                  ...settings,
                  app: { ...settings.app, notifications: value }
                })}
              />
              <SettingItem
                label="语言"
                value={settings.app.language === 'zh-CN' ? '中文' : 'English'}
                onPress={() => {
                  const newLang = settings.app.language === 'zh-CN' ? 'en-US' : 'zh-CN';
                  setSettings({
                    ...settings,
                    app: { ...settings.app, language: newLang }
                  });
                }}
                isLast
              />
            </View>
          </View>

          {/* Data Management */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>数据管理</Text>

            <View style={styles.card}>
              <SettingItem
                label="导出数据"
                icon="download"
                onPress={handleExportData}
              />
              <SettingItem
                label="清除缓存"
                icon="trash-2"
                onPress={handleClearCache}
              />
              <SettingItem
                label="删除所有数据"
                icon="alert-triangle"
                onPress={handleDeleteAllData}
                danger
                isLast
              />
            </View>
          </View>

          {/* About */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>关于</Text>

            <View style={styles.card}>
              <SettingItem
                label="版本"
                value="1.0.0"
              />
              <SettingItem
                label="隐私政策"
                onPress={() => Alert.alert('隐私政策', '隐私政策内容...')}
              />
              <SettingItem
                label="用户协议"
                onPress={() => Alert.alert('用户协议', '用户协议内容...')}
                isLast
              />
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>WhatToEat © 2025</Text>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

// Setting Switch Component
function SettingSwitch({ label, value, onValueChange, isLast = false }: {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  isLast?: boolean;
}) {
  return (
    <View style={[styles.settingItem, isLast && styles.settingItemLast]}>
      <Text style={styles.settingLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#d1d5db', true: '#fca5a5' }}
        thumbColor={value ? '#ef4444' : '#f3f4f6'}
      />
    </View>
  );
}

// Setting Item Component
function SettingItem({ label, value, icon, onPress, danger, isLast = false }: {
  label: string;
  value?: string;
  icon?: keyof typeof Feather.glyphMap;
  onPress?: () => void;
  danger?: boolean;
  isLast?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.settingItem, isLast && styles.settingItemLast]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.settingLeft}>
        {icon && <Feather name={icon} size={20} color={danger ? '#ef4444' : '#6b7280'} style={{ marginRight: 12 }} />}
        <Text style={[styles.settingLabel, danger && styles.settingLabelDanger]}>
          {label}
        </Text>
      </View>
      <View style={styles.settingRight}>
        {value && <Text style={styles.settingValue}>{value}</Text>}
        {onPress && <Feather name="chevron-right" size={20} color="#9ca3af" />}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    paddingTop: RNStatusBar.currentHeight || 0,
  },
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#ef4444',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  saveButton: {
    padding: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
    marginLeft: 4,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  profileBMI: {
    fontSize: 14,
    color: '#10b981',
    fontWeight: '500',
  },
  formGroup: {
    padding: 16,
  },
  formRow: {
    flexDirection: 'row',
    paddingHorizontal: 8,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#1f2937',
    backgroundColor: 'white',
  },
  formInputText: {
    fontSize: 16,
    color: '#1f2937',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  settingItemLast: {
    borderBottomWidth: 0,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    color: '#374151',
  },
  settingLabelDanger: {
    color: '#ef4444',
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingValue: {
    fontSize: 14,
    color: '#6b7280',
  },
  goalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  goalLabel: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '600',
  },
  goalValue: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  goalStats: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  goalStat: {
    flex: 1,
    alignItems: 'center',
  },
  goalStatLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 4,
  },
  goalStatValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  goalButtons: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  goalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    gap: 4,
  },
  goalButtonActive: {
    backgroundColor: '#fee2e2',
    borderColor: '#ef4444',
  },
  goalButtonText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  goalButtonTextActive: {
    color: '#ef4444',
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  footerText: {
    fontSize: 12,
    color: '#9ca3af',
  },
});
