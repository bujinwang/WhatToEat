import AsyncStorage from '@react-native-async-storage/async-storage';

// User Profile Settings
export interface UserProfile {
  nickname: string;
  gender: 'male' | 'female' | 'other';
  age: number;
  height: number; // cm
  weight: number; // kg
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
}

// Dietary Preferences
export interface DietaryPreferences {
  // Food preferences
  vegetarian: boolean;
  vegan: boolean;
  likesSpicy: boolean;
  prefersNoodles: boolean;
  allergies: string[]; // e.g., ['peanuts', 'seafood']

  // Drink preferences
  likesMilkTea: boolean;
  likesCoffee: boolean;
  lowSugar: boolean;

  // Activity preferences
  likesOutdoor: boolean;
  likesBoardGames: boolean;
  likesSports: boolean;

  // Entertainment preferences
  likesKTV: boolean;
  likesMovie: boolean;
  likesScript: boolean;
}

// Dietary Goals
export interface DietaryGoals {
  goal: 'lose_weight' | 'gain_muscle' | 'maintain';
  targetCalories: number; // daily target
  targetProtein: number; // grams
  targetCarbs: number; // grams
  targetFat: number; // grams
}

// App Settings
export interface AppSettings {
  language: 'zh-CN' | 'en-US';
  theme: 'light' | 'dark' | 'auto';
  notifications: boolean;
  notificationTime: string; // e.g., '12:00'
}

// Complete Settings
export interface UserSettings {
  profile: UserProfile;
  preferences: DietaryPreferences;
  goals: DietaryGoals;
  app: AppSettings;
}

// Default settings
const DEFAULT_SETTINGS: UserSettings = {
  profile: {
    nickname: '美食爱好者',
    gender: 'other',
    age: 25,
    height: 170,
    weight: 65,
    activityLevel: 'moderate',
  },
  preferences: {
    vegetarian: false,
    vegan: false,
    likesSpicy: true,
    prefersNoodles: true,
    allergies: [],
    likesMilkTea: false,
    likesCoffee: false,
    lowSugar: false,
    likesOutdoor: false,
    likesBoardGames: false,
    likesSports: false,
    likesKTV: false,
    likesMovie: false,
    likesScript: false,
  },
  goals: {
    goal: 'maintain',
    targetCalories: 2000,
    targetProtein: 60,
    targetCarbs: 250,
    targetFat: 65,
  },
  app: {
    language: 'zh-CN',
    theme: 'light',
    notifications: true,
    notificationTime: '12:00',
  },
};

const SETTINGS_KEY = 'userSettings';

// Get all settings
export const getSettings = async (): Promise<UserSettings> => {
  try {
    const data = await AsyncStorage.getItem(SETTINGS_KEY);
    if (data) {
      const settings = JSON.parse(data);
      // Merge with defaults to ensure all fields exist
      return {
        profile: { ...DEFAULT_SETTINGS.profile, ...settings.profile },
        preferences: { ...DEFAULT_SETTINGS.preferences, ...settings.preferences },
        goals: { ...DEFAULT_SETTINGS.goals, ...settings.goals },
        app: { ...DEFAULT_SETTINGS.app, ...settings.app },
      };
    }
    return DEFAULT_SETTINGS;
  } catch (error) {
    console.error('Error loading settings:', error);
    return DEFAULT_SETTINGS;
  }
};

// Save all settings
export const saveSettings = async (settings: UserSettings): Promise<void> => {
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving settings:', error);
    throw error;
  }
};

// Update specific section
export const updateProfile = async (profile: Partial<UserProfile>): Promise<void> => {
  const settings = await getSettings();
  settings.profile = { ...settings.profile, ...profile };
  await saveSettings(settings);
};

export const updatePreferences = async (preferences: Partial<DietaryPreferences>): Promise<void> => {
  const settings = await getSettings();
  settings.preferences = { ...settings.preferences, ...preferences };
  await saveSettings(settings);
};

export const updateGoals = async (goals: Partial<DietaryGoals>): Promise<void> => {
  const settings = await getSettings();
  settings.goals = { ...settings.goals, ...goals };
  await saveSettings(settings);
};

export const updateAppSettings = async (app: Partial<AppSettings>): Promise<void> => {
  const settings = await getSettings();
  settings.app = { ...settings.app, ...app };
  await saveSettings(settings);
};

// Calculate BMI
export const calculateBMI = (height: number, weight: number): number => {
  const heightInMeters = height / 100;
  return weight / (heightInMeters * heightInMeters);
};

// Calculate BMR (Basal Metabolic Rate) using Mifflin-St Jeor Equation
export const calculateBMR = (
  gender: 'male' | 'female' | 'other',
  weight: number,
  height: number,
  age: number
): number => {
  if (gender === 'male') {
    return 10 * weight + 6.25 * height - 5 * age + 5;
  } else if (gender === 'female') {
    return 10 * weight + 6.25 * height - 5 * age - 161;
  } else {
    // Average for other
    return 10 * weight + 6.25 * height - 5 * age - 78;
  }
};

// Calculate TDEE (Total Daily Energy Expenditure)
export const calculateTDEE = (bmr: number, activityLevel: string): number => {
  const activityMultipliers: { [key: string]: number } = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  };
  return bmr * (activityMultipliers[activityLevel] || 1.55);
};

// Calculate recommended calories based on goal
export const calculateRecommendedCalories = (
  profile: UserProfile,
  goal: string
): number => {
  const bmr = calculateBMR(profile.gender, profile.weight, profile.height, profile.age);
  const tdee = calculateTDEE(bmr, profile.activityLevel);

  switch (goal) {
    case 'lose_weight':
      return Math.round(tdee - 500); // 500 calorie deficit
    case 'gain_muscle':
      return Math.round(tdee + 300); // 300 calorie surplus
    case 'maintain':
    default:
      return Math.round(tdee);
  }
};

// Clear all settings (reset to defaults)
export const clearSettings = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(SETTINGS_KEY);
  } catch (error) {
    console.error('Error clearing settings:', error);
    throw error;
  }
};

// Export settings as JSON
export const exportSettings = async (): Promise<string> => {
  const settings = await getSettings();
  return JSON.stringify(settings, null, 2);
};

// Import settings from JSON
export const importSettings = async (jsonString: string): Promise<void> => {
  try {
    const settings = JSON.parse(jsonString);
    await saveSettings(settings);
  } catch (error) {
    console.error('Error importing settings:', error);
    throw error;
  }
};
