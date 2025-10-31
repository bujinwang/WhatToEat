import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  getNutritionReport,
  getAverageDailyNutrition,
  getMostConsumedFoods,
  compareWithGoals,
  DailyNutritionReport,
  NutritionSummary,
  FoodConsumptionStats,
  NutritionComparison,
} from '../services/nutritionReportService';
import { getSettings } from '../services/settingsService';

export default function NutritionReportScreen({ navigation }: any) {
  const [selectedPeriod, setSelectedPeriod] = useState<7 | 30 | 90>(7);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [reports, setReports] = useState<DailyNutritionReport[]>([]);
  const [averageNutrition, setAverageNutrition] = useState<NutritionSummary | null>(null);
  const [topFoods, setTopFoods] = useState<FoodConsumptionStats[]>([]);
  const [comparison, setComparison] = useState<NutritionComparison | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      // Load user settings for goals
      const settings = await getSettings();

      // Load nutrition data
      const [reportsData, avgData, topFoodsData, comparisonData] = await Promise.all([
        getNutritionReport(selectedPeriod),
        getAverageDailyNutrition(selectedPeriod),
        getMostConsumedFoods(selectedPeriod, 5),
        compareWithGoals(
          selectedPeriod,
          settings.goals.targetCalories,
          settings.goals.targetProtein,
          settings.goals.targetCarbs,
          settings.goals.targetFat
        ),
      ]);

      setReports(reportsData);
      setAverageNutrition(avgData);
      setTopFoods(topFoodsData);
      setComparison(comparisonData);
    } catch (error) {
      console.error('Error loading nutrition data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedPeriod]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const formatNumber = (num: number, decimals: number = 1): string => {
    return num.toFixed(decimals);
  };

  const getProgressColor = (percentage: number): string => {
    if (percentage < 80) return '#10b981'; // green
    if (percentage < 100) return '#f59e0b'; // yellow
    if (percentage < 120) return '#ef4444'; // red
    return '#dc2626'; // dark red
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ef4444" />
          <Text style={styles.loadingText}>加载中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>营养报告</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          <View style={styles.content}>
            {/* Period Selector */}
            <View style={styles.periodSelector}>
              <TouchableOpacity
                style={[
                  styles.periodButton,
                  selectedPeriod === 7 && styles.periodButtonActive,
                ]}
                onPress={() => setSelectedPeriod(7)}
              >
                <Text
                  style={[
                    styles.periodButtonText,
                    selectedPeriod === 7 && styles.periodButtonTextActive,
                  ]}
                >
                  7天
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.periodButton,
                  selectedPeriod === 30 && styles.periodButtonActive,
                ]}
                onPress={() => setSelectedPeriod(30)}
              >
                <Text
                  style={[
                    styles.periodButtonText,
                    selectedPeriod === 30 && styles.periodButtonTextActive,
                  ]}
                >
                  30天
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.periodButton,
                  selectedPeriod === 90 && styles.periodButtonActive,
                ]}
                onPress={() => setSelectedPeriod(90)}
              >
                <Text
                  style={[
                    styles.periodButtonText,
                    selectedPeriod === 90 && styles.periodButtonTextActive,
                  ]}
                >
                  90天
                </Text>
              </TouchableOpacity>
            </View>

            {/* Average Daily Nutrition */}
            {averageNutrition && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>平均每日摄入</Text>
                <View style={styles.nutritionGrid}>
                  <View style={styles.nutritionItem}>
                    <Text style={styles.nutritionValue}>
                      {formatNumber(averageNutrition.totalCalories, 0)}
                    </Text>
                    <Text style={styles.nutritionLabel}>卡路里</Text>
                  </View>
                  <View style={styles.nutritionItem}>
                    <Text style={styles.nutritionValue}>
                      {formatNumber(averageNutrition.totalProtein)}g
                    </Text>
                    <Text style={styles.nutritionLabel}>蛋白质</Text>
                  </View>
                  <View style={styles.nutritionItem}>
                    <Text style={styles.nutritionValue}>
                      {formatNumber(averageNutrition.totalCarbs)}g
                    </Text>
                    <Text style={styles.nutritionLabel}>碳水</Text>
                  </View>
                  <View style={styles.nutritionItem}>
                    <Text style={styles.nutritionValue}>
                      {formatNumber(averageNutrition.totalFat)}g
                    </Text>
                    <Text style={styles.nutritionLabel}>脂肪</Text>
                  </View>
                </View>
                <View style={styles.statsRow}>
                  <Text style={styles.statsText}>
                    平均 {formatNumber(averageNutrition.mealCount)} 餐/天
                  </Text>
                  <Text style={styles.statsText}>
                    共 {formatNumber(averageNutrition.foodCount, 0)} 种食物
                  </Text>
                </View>
              </View>
            )}

            {/* Goals Comparison */}
            {comparison && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>目标达成率</Text>
                <View style={styles.comparisonGrid}>
                  <View style={styles.comparisonItem}>
                    <Text style={styles.comparisonLabel}>卡路里</Text>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${Math.min(comparison.percentage.calories, 100)}%`,
                            backgroundColor: getProgressColor(comparison.percentage.calories),
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.comparisonPercentage}>
                      {formatNumber(comparison.percentage.calories, 0)}%
                    </Text>
                  </View>

                  <View style={styles.comparisonItem}>
                    <Text style={styles.comparisonLabel}>蛋白质</Text>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${Math.min(comparison.percentage.protein, 100)}%`,
                            backgroundColor: getProgressColor(comparison.percentage.protein),
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.comparisonPercentage}>
                      {formatNumber(comparison.percentage.protein, 0)}%
                    </Text>
                  </View>

                  <View style={styles.comparisonItem}>
                    <Text style={styles.comparisonLabel}>碳水化合物</Text>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${Math.min(comparison.percentage.carbs, 100)}%`,
                            backgroundColor: getProgressColor(comparison.percentage.carbs),
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.comparisonPercentage}>
                      {formatNumber(comparison.percentage.carbs, 0)}%
                    </Text>
                  </View>

                  <View style={styles.comparisonItem}>
                    <Text style={styles.comparisonLabel}>脂肪</Text>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${Math.min(comparison.percentage.fat, 100)}%`,
                            backgroundColor: getProgressColor(comparison.percentage.fat),
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.comparisonPercentage}>
                      {formatNumber(comparison.percentage.fat, 0)}%
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Top Foods */}
            {topFoods.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>最常食用</Text>
                {topFoods.map((food, index) => (
                  <View key={index} style={styles.foodItem}>
                    <View style={styles.foodRank}>
                      <Text style={styles.foodRankText}>{index + 1}</Text>
                    </View>
                    <View style={styles.foodInfo}>
                      <Text style={styles.foodName}>{food.name}</Text>
                      <Text style={styles.foodCategory}>{food.category}</Text>
                    </View>
                    <View style={styles.foodStats}>
                      <Text style={styles.foodCount}>{food.count}次</Text>
                      <Text style={styles.foodCalories}>
                        {formatNumber(food.totalCalories, 0)} 卡
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Daily Reports */}
            {reports.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>每日详情</Text>
                {reports.slice(0, 7).map((report, index) => (
                  <View key={index} style={styles.dailyReport}>
                    <View style={styles.dailyReportHeader}>
                      <Text style={styles.dailyReportDate}>{report.date}</Text>
                      <Text style={styles.dailyReportMeals}>
                        {report.summary.mealCount} 餐
                      </Text>
                    </View>
                    <View style={styles.dailyReportStats}>
                      <Text style={styles.dailyReportStat}>
                        {formatNumber(report.summary.totalCalories, 0)} 卡
                      </Text>
                      <Text style={styles.dailyReportStat}>
                        {formatNumber(report.summary.totalProtein)}g 蛋白质
                      </Text>
                      <Text style={styles.dailyReportStat}>
                        {formatNumber(report.summary.totalCarbs)}g 碳水
                      </Text>
                      <Text style={styles.dailyReportStat}>
                        {formatNumber(report.summary.totalFat)}g 脂肪
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {reports.length === 0 && (
              <View style={styles.emptyState}>
                <Feather name="pie-chart" size={64} color="#d1d5db" />
                <Text style={styles.emptyStateText}>暂无营养数据</Text>
                <Text style={styles.emptyStateSubtext}>开始拍摄食物照片来记录营养摄入</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  container: {
    flex: 1,
  },
  header: {
    backgroundColor: '#ef4444',
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  periodSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: 'white',
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#ef4444',
  },
  periodButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  periodButtonTextActive: {
    color: 'white',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#1f2937',
  },
  nutritionGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  nutritionItem: {
    alignItems: 'center',
  },
  nutritionValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ef4444',
    marginBottom: 4,
  },
  nutritionLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  statsText: {
    fontSize: 14,
    color: '#6b7280',
  },
  comparisonGrid: {
    gap: 16,
  },
  comparisonItem: {
    marginBottom: 8,
  },
  comparisonLabel: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  comparisonPercentage: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
    textAlign: 'right',
  },
  foodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  foodRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  foodRankText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  foodInfo: {
    flex: 1,
  },
  foodName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 2,
  },
  foodCategory: {
    fontSize: 12,
    color: '#6b7280',
  },
  foodStats: {
    alignItems: 'flex-end',
  },
  foodCount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ef4444',
    marginBottom: 2,
  },
  foodCalories: {
    fontSize: 12,
    color: '#6b7280',
  },
  dailyReport: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  dailyReportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dailyReportDate: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
  },
  dailyReportMeals: {
    fontSize: 14,
    color: '#6b7280',
  },
  dailyReportStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  dailyReportStat: {
    fontSize: 13,
    color: '#6b7280',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#9ca3af',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#d1d5db',
    marginTop: 8,
  },
});
