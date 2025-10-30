import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar as RNStatusBar,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  getAllPhotoAnalyses,
  getAnalysisCountByMealTime,
  getRecentAnalyses,
} from '../database';
import { PhotoAnalysis } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function StatsScreen() {
  const [totalAnalyses, setTotalAnalyses] = useState(0);
  const [mealTimeCounts, setMealTimeCounts] = useState<{ [key: string]: number }>({});
  const [recentAnalyses, setRecentAnalyses] = useState<PhotoAnalysis[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<7 | 30 | 90>(7);
  const [refreshing, setRefreshing] = useState(false);
  const [avgConfidence, setAvgConfidence] = useState(0);

  const loadStats = async () => {
    try {
      // Load all analyses
      const allAnalyses = await getAllPhotoAnalyses();
      setTotalAnalyses(allAnalyses.length);

      // Calculate average confidence
      if (allAnalyses.length > 0) {
        const totalConfidence = allAnalyses.reduce(
          (sum, analysis) => sum + analysis.confidenceScore,
          0
        );
        setAvgConfidence(totalConfidence / allAnalyses.length);
      }

      // Load meal time counts
      const counts = await getAnalysisCountByMealTime();
      setMealTimeCounts(counts);

      // Load recent analyses
      const recent = await getRecentAnalyses(selectedPeriod);
      setRecentAnalyses(recent);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, [selectedPeriod]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadStats();
  };

  const getMealTimeLabel = (mealTime: string) => {
    const labels: { [key: string]: string } = {
      breakfast: '早餐',
      lunch: '午餐',
      dinner: '晚餐',
      snack: '零食',
    };
    return labels[mealTime] || mealTime;
  };

  const getMealTimeIcon = (mealTime: string): keyof typeof Feather.glyphMap => {
    const icons: { [key: string]: keyof typeof Feather.glyphMap } = {
      breakfast: 'sunrise',
      lunch: 'sun',
      dinner: 'sunset',
      snack: 'coffee',
    };
    return icons[mealTime] || 'circle';
  };

  const getMealTimeColor = (mealTime: string) => {
    const colors: { [key: string]: string } = {
      breakfast: '#f59e0b',
      lunch: '#ef4444',
      dinner: '#8b5cf6',
      snack: '#10b981',
    };
    return colors[mealTime] || '#6b7280';
  };

  // Calculate percentage for meal time distribution
  const getMealTimePercentage = (count: number) => {
    if (totalAnalyses === 0) return 0;
    return Math.round((count / totalAnalyses) * 100);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>统计分析</Text>
          <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
            <Feather name="refresh-cw" size={20} color="white" />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          {/* Period Selector */}
          <View style={styles.periodSelector}>
            {[7, 30, 90].map((period) => (
              <TouchableOpacity
                key={period}
                style={[
                  styles.periodButton,
                  selectedPeriod === period && styles.periodButtonActive,
                ]}
                onPress={() => setSelectedPeriod(period as 7 | 30 | 90)}
              >
                <Text
                  style={[
                    styles.periodButtonText,
                    selectedPeriod === period && styles.periodButtonTextActive,
                  ]}
                >
                  {period}天
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Summary Cards */}
          <View style={styles.summaryContainer}>
            <View style={[styles.summaryCard, styles.summaryCardPrimary]}>
              <Feather name="camera" size={32} color="white" />
              <Text style={styles.summaryNumber}>{recentAnalyses.length}</Text>
              <Text style={styles.summaryLabel}>
                {selectedPeriod}天内分析次数
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <View style={[styles.summaryCard, styles.summaryCardSecondary]}>
                <Feather name="trending-up" size={24} color="#10b981" />
                <Text style={styles.summaryNumber}>
                  {(avgConfidence * 100).toFixed(0)}%
                </Text>
                <Text style={styles.summaryLabelSmall}>平均置信度</Text>
              </View>

              <View style={[styles.summaryCard, styles.summaryCardSecondary]}>
                <Feather name="archive" size={24} color="#3b82f6" />
                <Text style={styles.summaryNumber}>{totalAnalyses}</Text>
                <Text style={styles.summaryLabelSmall}>总记录数</Text>
              </View>
            </View>
          </View>

          {/* Meal Time Distribution */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Feather name="pie-chart" size={20} color="#1f2937" />
              <Text style={styles.sectionTitle}>餐次分布</Text>
            </View>

            {Object.keys(mealTimeCounts).length > 0 ? (
              <View style={styles.mealTimeList}>
                {Object.entries(mealTimeCounts).map(([mealTime, count]) => {
                  const percentage = getMealTimePercentage(count);
                  const color = getMealTimeColor(mealTime);

                  return (
                    <View key={mealTime} style={styles.mealTimeItem}>
                      <View style={styles.mealTimeHeader}>
                        <View style={styles.mealTimeLeft}>
                          <Feather
                            name={getMealTimeIcon(mealTime)}
                            size={20}
                            color={color}
                          />
                          <Text style={styles.mealTimeLabel}>
                            {getMealTimeLabel(mealTime)}
                          </Text>
                        </View>
                        <View style={styles.mealTimeRight}>
                          <Text style={styles.mealTimeCount}>{count}次</Text>
                          <Text style={styles.mealTimePercentage}>
                            {percentage}%
                          </Text>
                        </View>
                      </View>
                      <View style={styles.progressBarContainer}>
                        <View
                          style={[
                            styles.progressBar,
                            { width: `${percentage}%`, backgroundColor: color },
                          ]}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Feather name="info" size={48} color="#d1d5db" />
                <Text style={styles.emptyText}>暂无数据</Text>
              </View>
            )}
          </View>

          {/* Recent Activity */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Feather name="activity" size={20} color="#1f2937" />
              <Text style={styles.sectionTitle}>最近活动</Text>
            </View>

            {recentAnalyses.length > 0 ? (
              <View style={styles.activityList}>
                {recentAnalyses.slice(0, 5).map((analysis, index) => {
                  const date = new Date(analysis.analysisTimestamp);
                  const color = getMealTimeColor(analysis.mealTimeEstimate);

                  return (
                    <View key={analysis.id} style={styles.activityItem}>
                      <View
                        style={[styles.activityDot, { backgroundColor: color }]}
                      />
                      <View style={styles.activityContent}>
                        <Text style={styles.activityText}>
                          {getMealTimeLabel(analysis.mealTimeEstimate)} -{' '}
                          置信度 {(analysis.confidenceScore * 100).toFixed(0)}%
                        </Text>
                        <Text style={styles.activityTime}>
                          {date.toLocaleString('zh-CN', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                      </View>
                      {analysis.isConfirmed && (
                        <Feather name="check-circle" size={16} color="#10b981" />
                      )}
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Feather name="info" size={48} color="#d1d5db" />
                <Text style={styles.emptyText}>暂无最近活动</Text>
              </View>
            )}
          </View>

          {/* Insights */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Feather name="lightbulb" size={20} color="#1f2937" />
              <Text style={styles.sectionTitle}>洞察</Text>
            </View>

            <View style={styles.insightsList}>
              {totalAnalyses === 0 && (
                <View style={styles.insightCard}>
                  <Feather name="camera" size={24} color="#3b82f6" />
                  <Text style={styles.insightText}>
                    开始拍照分析食物，获取营养洞察
                  </Text>
                </View>
              )}

              {totalAnalyses > 0 && avgConfidence < 0.6 && (
                <View style={styles.insightCard}>
                  <Feather name="alert-circle" size={24} color="#f59e0b" />
                  <Text style={styles.insightText}>
                    平均识别置信度较低，尝试在光线充足的环境下拍摄
                  </Text>
                </View>
              )}

              {Object.keys(mealTimeCounts).length > 0 && (
                <View style={styles.insightCard}>
                  <Feather name="trending-up" size={24} color="#10b981" />
                  <Text style={styles.insightText}>
                    您最常记录的是
                    {getMealTimeLabel(
                      Object.entries(mealTimeCounts).sort(
                        ([, a], [, b]) => b - a
                      )[0][0]
                    )}
                  </Text>
                </View>
              )}
            </View>
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
    paddingTop: RNStatusBar.currentHeight || 0,
  },
  container: {
    flex: 1,
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
  refreshButton: {
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
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    gap: 4,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  periodButtonActive: {
    backgroundColor: '#ef4444',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  periodButtonTextActive: {
    color: 'white',
  },
  summaryContainer: {
    marginBottom: 16,
  },
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  summaryCardPrimary: {
    backgroundColor: '#ef4444',
    marginBottom: 12,
  },
  summaryCardSecondary: {
    flex: 1,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 4,
  },
  summaryLabelSmall: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  section: {
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  mealTimeList: {
    gap: 16,
  },
  mealTimeItem: {
    gap: 8,
  },
  mealTimeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mealTimeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mealTimeLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  mealTimeRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mealTimeCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  mealTimePercentage: {
    fontSize: 14,
    color: '#6b7280',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  activityList: {
    gap: 12,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  activityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  activityTime: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  insightsList: {
    gap: 12,
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  insightText: {
    flex: 1,
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 12,
  },
});
