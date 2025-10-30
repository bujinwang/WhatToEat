import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  SafeAreaView,
  StatusBar as RNStatusBar,
  RefreshControl,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  getAllPhotoAnalyses,
  getDetectedFoodItems,
  deletePhotoAnalysis,
  updatePhotoAnalysisConfirmation,
} from '../database';
import { PhotoAnalysis, DetectedFoodItem } from '../types';

interface AnalysisWithItems extends PhotoAnalysis {
  detectedItems?: DetectedFoodItem[];
}

export default function HistoryScreen() {
  const [analyses, setAnalyses] = useState<AnalysisWithItems[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAnalyses = useCallback(async () => {
    try {
      const data = await getAllPhotoAnalyses();

      // Load detected items for each analysis
      const analysesWithItems = await Promise.all(
        data.map(async (analysis) => {
          const items = await getDetectedFoodItems(analysis.id);
          return { ...analysis, detectedItems: items };
        })
      );

      setAnalyses(analysesWithItems);
    } catch (error) {
      console.error('Error loading analyses:', error);
      Alert.alert('错误', '加载历史记录失败');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAnalyses();
  }, [loadAnalyses]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadAnalyses();
  };

  const handleDelete = (id: number) => {
    Alert.alert(
      '确认删除',
      '确定要删除这条记录吗？',
      [
        {
          text: '取消',
          style: 'cancel',
        },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePhotoAnalysis(id);
              setAnalyses(prev => prev.filter(item => item.id !== id));
            } catch (error) {
              console.error('Error deleting analysis:', error);
              Alert.alert('错误', '删除失败');
            }
          },
        },
      ]
    );
  };

  const handleToggleConfirm = async (id: number, currentStatus: boolean) => {
    try {
      await updatePhotoAnalysisConfirmation(id, !currentStatus);
      setAnalyses(prev =>
        prev.map(item =>
          item.id === id ? { ...item, isConfirmed: !currentStatus } : item
        )
      );
    } catch (error) {
      console.error('Error updating confirmation:', error);
      Alert.alert('错误', '更新失败');
    }
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return '今天 ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return '昨天 ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays < 7) {
      return `${diffDays}天前`;
    } else {
      return date.toLocaleDateString('zh-CN');
    }
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

  const renderItem = ({ item }: { item: AnalysisWithItems }) => {
    const itemCount = item.detectedItems?.length || 0;

    // Parse position data to get food names
    const foodNames = item.detectedItems?.map(detectedItem => {
      try {
        const position = JSON.parse(detectedItem.positionInPhoto);
        return position.name || '未知食物';
      } catch {
        return '未知食物';
      }
    }) || [];

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <Feather
              name="camera"
              size={20}
              color={item.isConfirmed ? '#10b981' : '#6b7280'}
            />
            <Text style={styles.dateText}>{formatDate(item.analysisTimestamp)}</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => handleToggleConfirm(item.id, item.isConfirmed)}
            >
              <Feather
                name={item.isConfirmed ? 'check-circle' : 'circle'}
                size={20}
                color={item.isConfirmed ? '#10b981' : '#6b7280'}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => handleDelete(item.id)}
            >
              <Feather name="trash-2" size={20} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.cardBody}>
          {item.photoPath && (
            <Image
              source={{ uri: item.photoPath }}
              style={styles.foodImage}
              resizeMode="cover"
            />
          )}

          <View style={styles.infoContainer}>
            <View style={styles.infoRow}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {getMealTimeLabel(item.mealTimeEstimate)}
                </Text>
              </View>
              <View style={[styles.badge, styles.confidenceBadge]}>
                <Text style={styles.badgeText}>
                  置信度 {(item.confidenceScore * 100).toFixed(0)}%
                </Text>
              </View>
            </View>

            {foodNames.length > 0 && (
              <View style={styles.foodList}>
                <Text style={styles.foodListTitle}>检测到的食物：</Text>
                {foodNames.map((name, index) => (
                  <View key={index} style={styles.foodItem}>
                    <Feather name="check" size={14} color="#10b981" />
                    <Text style={styles.foodName}>{name}</Text>
                    {item.detectedItems && (
                      <Text style={styles.confidence}>
                        ({(item.detectedItems[index].confidenceScore * 100).toFixed(0)}%)
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            )}

            {itemCount === 0 && (
              <Text style={styles.noItemsText}>未检测到食物项目</Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Feather name="camera" size={64} color="#d1d5db" />
      <Text style={styles.emptyTitle}>暂无历史记录</Text>
      <Text style={styles.emptySubtitle}>开始拍照分析食物吧！</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>历史记录</Text>
          <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
            <Feather name="refresh-cw" size={20} color="white" />
          </TouchableOpacity>
        </View>

        <FlatList
          data={analyses}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={[
            styles.listContent,
            analyses.length === 0 && styles.listContentEmpty,
          ]}
          ListEmptyComponent={!isLoading ? renderEmpty : null}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        />
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
  listContent: {
    padding: 16,
  },
  listContentEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    padding: 4,
  },
  dateText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  cardBody: {
    padding: 12,
  },
  foodImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
  },
  infoContainer: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  badge: {
    backgroundColor: '#dbeafe',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  confidenceBadge: {
    backgroundColor: '#dcfce7',
  },
  badgeText: {
    fontSize: 12,
    color: '#1f2937',
    fontWeight: '500',
  },
  foodList: {
    marginTop: 8,
  },
  foodListTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  foodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  foodName: {
    fontSize: 14,
    color: '#4b5563',
    flex: 1,
  },
  confidence: {
    fontSize: 12,
    color: '#9ca3af',
  },
  noItemsText: {
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
  },
});
