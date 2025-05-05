export type MealTime = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface PhotoAnalysis {
  id: number;
  photoPath: string;
  analysisTimestamp: string;
  confidenceScore: number;
  mealTimeEstimate: MealTime;
  isConfirmed: boolean;
}

export interface DetectedFoodItem {
  id: number;
  photoId: number;
  foodId: number;
  confidenceScore: number;
  estimatedAmount: number;
  userCorrectedAmount: number | null;
  positionInPhoto: string; // JSON string of {x: number, y: number, width: number, height: number}
}

export interface FoodItem {
  id: number;
  name: string;
  category: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize: number;
  servingUnit: string;
}

export interface UserProfile {
  id: number;
  height: number;
  weight: number;
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  dietaryGoals: string[];
  createdAt: string;
  updatedAt: string;
}

export interface NutritionReport {
  id: number;
  userId: number;
  date: string;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  mealBreakdown: {
    [key in MealTime]: {
      calories: number;
      foods: number[];
    };
  };
} 