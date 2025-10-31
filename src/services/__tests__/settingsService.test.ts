import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getSettings,
  saveSettings,
  updateProfile,
  updatePreferences,
  updateGoals,
  updateAppSettings,
  calculateBMI,
  calculateBMR,
  calculateTDEE,
  calculateRecommendedCalories,
  clearSettings,
  exportSettings,
  importSettings,
  UserSettings,
} from '../settingsService';

describe('SettingsService', () => {
  beforeEach(() => {
    AsyncStorage.clear();
  });

  describe('getSettings', () => {
    it('should return default settings when no data exists', async () => {
      const settings = await getSettings();

      expect(settings).toBeDefined();
      expect(settings.profile).toBeDefined();
      expect(settings.preferences).toBeDefined();
      expect(settings.goals).toBeDefined();
      expect(settings.app).toBeDefined();
    });

    it('should return saved settings when data exists', async () => {
      const testSettings: UserSettings = {
        profile: {
          nickname: '测试用户',
          gender: 'male',
          age: 30,
          height: 175,
          weight: 70,
          activityLevel: 'moderate',
        },
        preferences: {
          vegetarian: true,
          vegan: false,
          likesSpicy: false,
          prefersNoodles: true,
          allergies: ['peanuts'],
          likesMilkTea: true,
          likesCoffee: false,
          lowSugar: true,
          likesOutdoor: true,
          likesBoardGames: false,
          likesSports: true,
          likesKTV: false,
          likesMovie: true,
          likesScript: false,
        },
        goals: {
          goal: 'lose_weight',
          targetCalories: 1800,
          targetProtein: 80,
          targetCarbs: 200,
          targetFat: 50,
        },
        app: {
          language: 'en-US',
          theme: 'dark',
          notifications: false,
          notificationTime: '13:00',
        },
      };

      await saveSettings(testSettings);
      const settings = await getSettings();

      expect(settings.profile.nickname).toBe('测试用户');
      expect(settings.profile.age).toBe(30);
      expect(settings.preferences.vegetarian).toBe(true);
      expect(settings.goals.goal).toBe('lose_weight');
      expect(settings.app.language).toBe('en-US');
    });
  });

  describe('saveSettings', () => {
    it('should save settings to AsyncStorage', async () => {
      const settings = await getSettings();
      settings.profile.nickname = '新昵称';

      await saveSettings(settings);

      const savedData = await AsyncStorage.getItem('userSettings');
      expect(savedData).toBeDefined();

      const parsedData = JSON.parse(savedData!);
      expect(parsedData.profile.nickname).toBe('新昵称');
    });
  });

  describe('updateProfile', () => {
    it('should update only profile data', async () => {
      await updateProfile({ nickname: '更新的昵称', age: 35 });

      const settings = await getSettings();
      expect(settings.profile.nickname).toBe('更新的昵称');
      expect(settings.profile.age).toBe(35);
    });
  });

  describe('updatePreferences', () => {
    it('should update only preferences data', async () => {
      await updatePreferences({ vegetarian: true, likesSpicy: false });

      const settings = await getSettings();
      expect(settings.preferences.vegetarian).toBe(true);
      expect(settings.preferences.likesSpicy).toBe(false);
    });
  });

  describe('updateGoals', () => {
    it('should update only goals data', async () => {
      await updateGoals({ goal: 'gain_muscle', targetCalories: 2500 });

      const settings = await getSettings();
      expect(settings.goals.goal).toBe('gain_muscle');
      expect(settings.goals.targetCalories).toBe(2500);
    });
  });

  describe('updateAppSettings', () => {
    it('should update only app settings data', async () => {
      await updateAppSettings({ language: 'en-US', notifications: false });

      const settings = await getSettings();
      expect(settings.app.language).toBe('en-US');
      expect(settings.app.notifications).toBe(false);
    });
  });

  describe('calculateBMI', () => {
    it('should calculate BMI correctly', () => {
      const bmi = calculateBMI(175, 70);
      expect(bmi).toBeCloseTo(22.86, 1);
    });

    it('should handle edge cases', () => {
      const bmi1 = calculateBMI(200, 100);
      expect(bmi1).toBe(25);

      const bmi2 = calculateBMI(150, 45);
      expect(bmi2).toBe(20);
    });
  });

  describe('calculateBMR', () => {
    it('should calculate BMR for male', () => {
      const bmr = calculateBMR('male', 70, 175, 30);
      // 10 * 70 + 6.25 * 175 - 5 * 30 + 5 = 700 + 1093.75 - 150 + 5 = 1648.75
      expect(bmr).toBeCloseTo(1648.75, 0);
    });

    it('should calculate BMR for female', () => {
      const bmr = calculateBMR('female', 60, 165, 25);
      // 10 * 60 + 6.25 * 165 - 5 * 25 - 161 = 600 + 1031.25 - 125 - 161 = 1345.25
      expect(bmr).toBeCloseTo(1345.25, 0);
    });

    it('should calculate BMR for other gender', () => {
      const bmr = calculateBMR('other', 65, 170, 28);
      expect(bmr).toBeGreaterThan(0);
    });
  });

  describe('calculateTDEE', () => {
    it('should calculate TDEE correctly for sedentary', () => {
      const bmr = 1600;
      const tdee = calculateTDEE(bmr, 'sedentary');
      expect(tdee).toBe(1920);
    });

    it('should calculate TDEE correctly for active', () => {
      const bmr = 1600;
      const tdee = calculateTDEE(bmr, 'active');
      expect(tdee).toBe(2760);
    });
  });

  describe('calculateRecommendedCalories', () => {
    it('should calculate calories for weight loss', () => {
      const profile = {
        nickname: '测试',
        gender: 'male' as const,
        age: 30,
        height: 175,
        weight: 80,
        activityLevel: 'moderate' as const,
      };

      const calories = calculateRecommendedCalories(profile, 'lose_weight');
      expect(calories).toBeGreaterThan(0);
      expect(calories).toBeLessThan(3000);
    });

    it('should calculate calories for muscle gain', () => {
      const profile = {
        nickname: '测试',
        gender: 'female' as const,
        age: 25,
        height: 165,
        weight: 55,
        activityLevel: 'light' as const,
      };

      const calories = calculateRecommendedCalories(profile, 'gain_muscle');
      expect(calories).toBeGreaterThan(0);
    });

    it('should calculate calories for maintenance', () => {
      const profile = {
        nickname: '测试',
        gender: 'other' as const,
        age: 35,
        height: 170,
        weight: 65,
        activityLevel: 'moderate' as const,
      };

      const calories = calculateRecommendedCalories(profile, 'maintain');
      expect(calories).toBeGreaterThan(0);
    });
  });

  describe('clearSettings', () => {
    it('should clear all settings', async () => {
      await saveSettings(await getSettings());

      await clearSettings();

      const data = await AsyncStorage.getItem('userSettings');
      expect(data).toBeNull();
    });
  });

  describe('exportSettings', () => {
    it('should export settings as JSON string', async () => {
      const settings = await getSettings();
      settings.profile.nickname = '导出测试';
      await saveSettings(settings);

      const exported = await exportSettings();

      expect(exported).toBeDefined();
      expect(typeof exported).toBe('string');
      expect(exported).toContain('导出测试');

      const parsed = JSON.parse(exported);
      expect(parsed.profile.nickname).toBe('导出测试');
    });
  });

  describe('importSettings', () => {
    it('should import settings from JSON string', async () => {
      const testSettings = await getSettings();
      testSettings.profile.nickname = '导入测试';

      const jsonString = JSON.stringify(testSettings);
      await importSettings(jsonString);

      const settings = await getSettings();
      expect(settings.profile.nickname).toBe('导入测试');
    });

    it('should handle invalid JSON', async () => {
      await expect(importSettings('invalid json')).rejects.toThrow();
    });
  });
});
