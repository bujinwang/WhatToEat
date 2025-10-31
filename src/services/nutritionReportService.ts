import { getRecentAnalyses } from '../database';
import { getFoodItemById } from './foodDatabaseService';

export interface NutritionSummary {
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  mealCount: number;
  foodCount: number;
}

export interface DailyNutritionReport {
  date: string;
  summary: NutritionSummary;
  meals: MealNutrition[];
}

export interface MealNutrition {
  mealTime: string;
  timestamp: string;
  foods: FoodNutritionDetail[];
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface FoodNutritionDetail {
  name: string;
  category: string;
  amount: number; // in grams
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize: number;
  servingUnit: string;
}

// Get nutrition report for the last N days
export const getNutritionReport = async (days: number): Promise<DailyNutritionReport[]> => {
  try {
    // Get recent analyses
    const analyses = await getRecentAnalyses(days);

    // Group by date
    const dateGroups: { [date: string]: any[] } = {};

    for (const analysis of analyses) {
      const date = analysis.analysisTimestamp.split('T')[0]; // Get YYYY-MM-DD
      if (!dateGroups[date]) {
        dateGroups[date] = [];
      }
      dateGroups[date].push(analysis);
    }

    // Generate reports for each date
    const reports: DailyNutritionReport[] = [];

    for (const [date, dayAnalyses] of Object.entries(dateGroups)) {
      const meals: MealNutrition[] = [];
      let totalCalories = 0;
      let totalProtein = 0;
      let totalCarbs = 0;
      let totalFat = 0;
      let foodCount = 0;

      for (const analysis of dayAnalyses) {
        // Get detected food items from database
        const { getDetectedFoodItems } = await import('../database');
        const detectedItems = await getDetectedFoodItems(analysis.id);

        const foods: FoodNutritionDetail[] = [];
        let mealCalories = 0;
        let mealProtein = 0;
        let mealCarbs = 0;
        let mealFat = 0;

        for (const item of detectedItems) {
          const foodItem = await getFoodItemById(item.foodId);
          if (foodItem) {
            const amount = item.userCorrectedAmount || item.estimatedAmount;
            const ratio = amount / foodItem.servingSize;

            const foodNutrition: FoodNutritionDetail = {
              name: foodItem.name,
              category: foodItem.category,
              amount: amount,
              calories: foodItem.calories * ratio,
              protein: foodItem.protein * ratio,
              carbs: foodItem.carbs * ratio,
              fat: foodItem.fat * ratio,
              servingSize: foodItem.servingSize,
              servingUnit: foodItem.servingUnit,
            };

            foods.push(foodNutrition);
            mealCalories += foodNutrition.calories;
            mealProtein += foodNutrition.protein;
            mealCarbs += foodNutrition.carbs;
            mealFat += foodNutrition.fat;
            foodCount++;
          }
        }

        if (foods.length > 0) {
          meals.push({
            mealTime: analysis.mealTimeEstimate,
            timestamp: analysis.analysisTimestamp,
            foods,
            calories: mealCalories,
            protein: mealProtein,
            carbs: mealCarbs,
            fat: mealFat,
          });

          totalCalories += mealCalories;
          totalProtein += mealProtein;
          totalCarbs += mealCarbs;
          totalFat += mealFat;
        }
      }

      reports.push({
        date,
        summary: {
          totalCalories,
          totalProtein,
          totalCarbs,
          totalFat,
          mealCount: meals.length,
          foodCount,
        },
        meals: meals.sort((a, b) => a.timestamp.localeCompare(b.timestamp)),
      });
    }

    // Sort by date descending
    return reports.sort((a, b) => b.date.localeCompare(a.date));
  } catch (error) {
    console.error('Error generating nutrition report:', error);
    return [];
  }
};

// Get weekly summary (7 days)
export const getWeeklySummary = async (): Promise<NutritionSummary> => {
  const reports = await getNutritionReport(7);
  return aggregateSummaries(reports);
};

// Get monthly summary (30 days)
export const getMonthlySummary = async (): Promise<NutritionSummary> => {
  const reports = await getNutritionReport(30);
  return aggregateSummaries(reports);
};

// Aggregate multiple daily reports into one summary
const aggregateSummaries = (reports: DailyNutritionReport[]): NutritionSummary => {
  let totalCalories = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;
  let mealCount = 0;
  let foodCount = 0;

  for (const report of reports) {
    totalCalories += report.summary.totalCalories;
    totalProtein += report.summary.totalProtein;
    totalCarbs += report.summary.totalCarbs;
    totalFat += report.summary.totalFat;
    mealCount += report.summary.mealCount;
    foodCount += report.summary.foodCount;
  }

  return {
    totalCalories,
    totalProtein,
    totalCarbs,
    totalFat,
    mealCount,
    foodCount,
  };
};

// Get average daily nutrition for a period
export const getAverageDailyNutrition = async (days: number): Promise<NutritionSummary> => {
  const reports = await getNutritionReport(days);
  const summary = aggregateSummaries(reports);

  const dayCount = reports.length || 1;

  return {
    totalCalories: summary.totalCalories / dayCount,
    totalProtein: summary.totalProtein / dayCount,
    totalCarbs: summary.totalCarbs / dayCount,
    totalFat: summary.totalFat / dayCount,
    mealCount: summary.mealCount / dayCount,
    foodCount: summary.foodCount / dayCount,
  };
};

// Get nutrition data for charting (daily totals)
export interface NutritionChartData {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export const getNutritionChartData = async (days: number): Promise<NutritionChartData[]> => {
  const reports = await getNutritionReport(days);

  return reports.map(report => ({
    date: report.date,
    calories: report.summary.totalCalories,
    protein: report.summary.totalProtein,
    carbs: report.summary.totalCarbs,
    fat: report.summary.totalFat,
  }));
};

// Get most consumed foods
export interface FoodConsumptionStats {
  name: string;
  category: string;
  count: number;
  totalAmount: number;
  totalCalories: number;
}

export const getMostConsumedFoods = async (days: number, limit: number = 10): Promise<FoodConsumptionStats[]> => {
  const reports = await getNutritionReport(days);
  const foodStats: { [name: string]: FoodConsumptionStats } = {};

  for (const report of reports) {
    for (const meal of report.meals) {
      for (const food of meal.foods) {
        if (!foodStats[food.name]) {
          foodStats[food.name] = {
            name: food.name,
            category: food.category,
            count: 0,
            totalAmount: 0,
            totalCalories: 0,
          };
        }

        foodStats[food.name].count++;
        foodStats[food.name].totalAmount += food.amount;
        foodStats[food.name].totalCalories += food.calories;
      }
    }
  }

  return Object.values(foodStats)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
};

// Compare nutrition with goals
export interface NutritionComparison {
  period: 'daily' | 'weekly' | 'monthly';
  actual: NutritionSummary;
  target: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  percentage: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

export const compareWithGoals = async (
  days: number,
  targetCalories: number,
  targetProtein: number,
  targetCarbs: number,
  targetFat: number
): Promise<NutritionComparison> => {
  const actual = await getAverageDailyNutrition(days);

  let period: 'daily' | 'weekly' | 'monthly' = 'daily';
  if (days === 7) period = 'weekly';
  else if (days === 30) period = 'monthly';

  return {
    period,
    actual,
    target: {
      calories: targetCalories,
      protein: targetProtein,
      carbs: targetCarbs,
      fat: targetFat,
    },
    percentage: {
      calories: (actual.totalCalories / targetCalories) * 100,
      protein: (actual.totalProtein / targetProtein) * 100,
      carbs: (actual.totalCarbs / targetCarbs) * 100,
      fat: (actual.totalFat / targetFat) * 100,
    },
  };
};
