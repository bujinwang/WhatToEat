import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar as RNStatusBar, // Rename to avoid conflict with expo-status-bar
  ActivityIndicator, // Import ActivityIndicator for loading state
  Linking,
  Platform,
  Alert,
  Modal,
} from 'react-native';
import { Feather } from '@expo/vector-icons'; // Use Feather icons like in App.tsx
import { getFoodRecommendation } from '../services/recommendationService'; // Import the service
import * as Location from 'expo-location';
import { requestPermissions, takePhoto, pickFromGallery, analyzePhoto } from '../services/photoAnalysis';
import { getFoodItemById } from '../services/foodDatabaseService';

// Placeholder data - adjust image URLs for React Native
const foodRecommendations = [
  { id: 1, name: '麻辣小龙虾', likes: 3280, imageUrl: 'https://via.placeholder.com/120' },
  { id: 2, name: '烤冷面', likes: 2690, imageUrl: 'https://via.placeholder.com/120' },
  { id: 3, name: '爆汁小酥肉', likes: 2450, imageUrl: 'https://via.placeholder.com/120' },
];
const drinkRecommendations = [
  { id: 1, name: '蜜桃乌龙茶', likes: 2860, imageUrl: 'https://via.placeholder.com/120' },
  { id: 2, name: '椰云拿铁', likes: 2580, imageUrl: 'https://via.placeholder.com/120' },
  { id: 3, name: '杨枝甘露', likes: 2310, imageUrl: 'https://via.placeholder.com/120' },
];
const foodNews = [
  { id: 1, title: '中餐逐渐成为全球餐饮文化的重要组成部分', source: '联合利华饮食策划', time: '3天前', imageUrl: 'https://via.placeholder.com/80' },
  { id: 2, title: '麦当劳中国四大超值项目，大堡口福、随心配1+1等带来365天超值', source: '麦当劳官网', time: '4天前', imageUrl: 'https://via.placeholder.com/80' },
  { id: 3, title: '中国无糖饮料市场规模已达401.6亿元', source: '21经济网', time: '5天前', imageUrl: 'https://via.placeholder.com/80' },
];
const friendsSharing = [
  { id: 1, username: '小王同学', content: '发现了一家超级好吃的川菜馆！麻婆豆腐太绝了', likes: 28, comments: 6, time: '2小时前', imageUrl: 'https://via.placeholder.com/140' },
  { id: 2, username: '美食达人张三', content: '自制担担面，看着还行吧？求指点！', likes: 48, comments: 15, time: '4小时前', imageUrl: 'https://via.placeholder.com/140' },
  { id: 3, username: '李四的美食日记', content: '今日打卡：米其林三星法餐，值回票价！', likes: 93, comments: 32, time: '昨天', imageUrl: 'https://via.placeholder.com/140' },
];

// 新增一键导航函数
function openMapApp(lat: number, lng: number, name: string) {
  const url = Platform.select({
    ios: `http://maps.apple.com/?daddr=${lat},${lng}(${encodeURIComponent(name)})`,
    android: `geo:${lat},${lng}?q=${lat},${lng}(${encodeURIComponent(name)})`
  });
  Linking.openURL(url!);
}

// 生成外卖平台搜索URL（可根据餐厅名和菜品名）
function getWaimaiUrl(restaurantName: string, dishName?: string) {
  // DoorDash 示例（可根据需要切换到美团/饿了么等）
  return `https://www.doordash.com/search/store/${encodeURIComponent(restaurantName)}`;
}

function handleOrderFood(restaurantName: string, dishName?: string) {
  const url = getWaimaiUrl(restaurantName, dishName);
  Linking.openURL(url);
}

// 修改extractJsonFromMarkdown，支持数组
function extractJsonFromMarkdown(markdown: string): any[] | null {
  const match = markdown.match(/```[a-zA-Z]*\s*([\s\S]*?)```/);
  if (match && match[1]) {
    try {
      const arr = JSON.parse(match[1]);
      return Array.isArray(arr) ? arr : [arr];
    } catch (e) {
      try {
        const arr = JSON.parse(match[1].replace(/'/g, '"'));
        return Array.isArray(arr) ? arr : [arr];
      } catch (e2) {
        return null;
      }
    }
  }
  return null;
}

// 计算两点间距离（Haversine公式，单位：公里）
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // 地球半径，单位km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function HomeScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('eat');
  const [recommendation, setRecommendation] = useState<string | null>(null);
  const [recommendationData, setRecommendationData] = useState<any[] | null>(null);
  const [isLoadingRecommendation, setIsLoadingRecommendation] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);

  // Photo analysis states
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [analyzingPhoto, setAnalyzingPhoto] = useState(false);
  const [photoAnalysisResult, setPhotoAnalysisResult] = useState<any | null>(null);
  const [capturedPhotoUri, setCapturedPhotoUri] = useState<string | null>(null);

  const handleGetRecommendation = async () => {
    setActiveTab('eat');
    setIsLoadingRecommendation(true);
    setRecommendation(null);
    setRecommendationData(null);
    try {
      const result = await getFoodRecommendation();
      setRecommendation(result);
      const data = extractJsonFromMarkdown(result);
      setRecommendationData(data);
      // 直接用expo-location获取一次用户定位
      if (data && data.length > 0 && data[0].restaurant && data[0].restaurant.lat && data[0].restaurant.lng) {
        Location.getCurrentPositionAsync({}).then(loc => {
          setUserLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        });
      }
    } catch (error) {
      setRecommendation('Failed to get recommendation.');
      setRecommendationData(null);
    } finally {
      setIsLoadingRecommendation(false);
    }
  };

  const getRecommendations = () => {
    return activeTab === 'eat' ? foodRecommendations : drinkRecommendations;
  };

  // Camera button handler
  const handleCameraPress = async () => {
    const permissions = await requestPermissions();
    if (!permissions.camera) {
      Alert.alert('权限不足', '需要相机权限才能拍照');
      return;
    }
    setShowPhotoModal(true);
  };

  // Take photo handler
  const handleTakePhoto = async () => {
    setShowPhotoModal(false);
    const photoUri = await takePhoto();
    if (photoUri) {
      setCapturedPhotoUri(photoUri);
      await handleAnalyzePhoto(photoUri);
    }
  };

  // Pick from gallery handler
  const handlePickFromGallery = async () => {
    setShowPhotoModal(false);
    const photoUri = await pickFromGallery();
    if (photoUri) {
      setCapturedPhotoUri(photoUri);
      await handleAnalyzePhoto(photoUri);
    }
  };

  // Analyze photo
  const handleAnalyzePhoto = async (photoUri: string) => {
    setAnalyzingPhoto(true);
    try {
      const result = await analyzePhoto(photoUri);
      if (result && result.detectedItems.length > 0) {
        // Fetch food details for each detected item
        const foodDetails = await Promise.all(
          result.detectedItems.map(async (item: any) => {
            const foodItem = await getFoodItemById(item.foodId);
            return {
              ...item,
              foodDetails: foodItem,
            };
          })
        );
        setPhotoAnalysisResult({
          ...result,
          detectedItems: foodDetails,
        });
        Alert.alert(
          '分析完成',
          `识别到 ${result.detectedItems.length} 种食物`,
          [
            { text: '查看详情', onPress: () => navigation.navigate('历史') },
            { text: '确定' },
          ]
        );
      } else {
        Alert.alert('未识别到食物', '请尝试拍摄更清晰的食物照片');
      }
    } catch (error) {
      console.error('Photo analysis error:', error);
      Alert.alert('分析失败', '请稍后重试');
    } finally {
      setAnalyzingPhoto(false);
      setCapturedPhotoUri(null);
    }
  };

  // Define styles using StyleSheet.create
  const styles = StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: '#f3f4f6', // bg-gray-100
      paddingTop: RNStatusBar.currentHeight || 0,
    },
    container: {
      flex: 1,
    },
    header: {
      backgroundColor: '#ef4444', // Simplified gradient to red-500
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
    headerIcons: {
      flexDirection: 'row',
      gap: 12, // space-x-3
    },
    iconButton: {
      padding: 8,
      borderRadius: 999, // rounded-full
      backgroundColor: 'rgba(255, 255, 255, 0.2)', // bg-white bg-opacity-20
    },
    mainScroll: {
      flex: 1,
    },
    mainContent: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 80, // Adjust paddingBottom to account for fixed footer
    },
    tabContainer: {
      flexDirection: 'row',
      gap: 12, // space-x-3
      marginBottom: 20,
    },
    tabButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 8, // rounded-lg
      alignItems: 'center',
      justifyContent: 'center',
    },
    tabButtonActive: {
      backgroundColor: '#ef4444', // bg-red-500
    },
    tabButtonInactive: {
      backgroundColor: 'white', // bg-white
    },
    tabText: {
      fontSize: 18, // text-lg
      fontWeight: '500', // font-medium
    },
    tabTextActive: {
      color: 'white', // text-white
    },
    tabTextInactive: {
      color: '#374151', // text-gray-700
    },
    recommendationContainer: { // New style for recommendation display area
      marginTop: 10,
      marginBottom: 10,
      padding: 16,
      backgroundColor: '#e5e7eb', // bg-gray-200
      borderRadius: 8,
      minHeight: 50, // Ensure it has some height
      justifyContent: 'center',
      alignItems: 'center',
    },
    recommendationText: {
      fontSize: 16,
      color: '#1f2937', // text-gray-800
      textAlign: 'center',
    },
    loadingIndicator: {
       marginTop: 10,
    },
    section: {
      backgroundColor: 'white',
      borderRadius: 8, // rounded-lg
      padding: 16,
      marginBottom: 16,
      shadowColor: '#000', // Basic shadow
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 1.41,
      elevation: 2,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    sectionTitle: {
      fontWeight: 'bold',
      fontSize: 18, // text-lg
      color: '#1f2937', // text-gray-800
    },
    moreButtonText: {
      fontSize: 14, // text-sm
      color: '#ef4444', // text-red-500
    },
    recommendationsGrid: {
      flexDirection: 'row',
      justifyContent: 'space-between', // Simulates grid gap
      // gap: 12, // gap-3 (use margins/padding for spacing if needed)
    },
    recommendationItem: {
      flex: 1, // Adjust based on gap/spacing needs
      alignItems: 'center',
      maxWidth: '31%', // Approximate grid-cols-3 with gap
    },
    recommendationImageContainer: {
      position: 'relative',
      width: '100%',
      aspectRatio: 1, // Maintain square aspect ratio for image container
    },
    recommendationImage: {
      width: '100%',
      height: '100%',
      borderRadius: 8, // rounded-lg
    },
    likesOverlay: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderBottomLeftRadius: 8, // rounded-b-lg
      borderBottomRightRadius: 8,
    },
    likesText: {
      color: 'white',
      fontSize: 12, // text-xs
      textAlign: 'center',
    },
    recommendationName: {
      marginTop: 4,
      textAlign: 'center',
      fontSize: 14, // text-sm
      fontWeight: '500', // font-medium
    },
    sharingContainer: {
      gap: 16, // space-y-4
    },
    sharingPost: {
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#f3f4f6', // border-gray-100
    },
    sharingPostInner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    sharingAvatar: {
      width: 40,
      height: 40,
      backgroundColor: '#e5e7eb', // bg-gray-200
      borderRadius: 20, // rounded-full
      marginRight: 12,
    },
    sharingContent: {
      flex: 1,
    },
    sharingHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    sharingUsername: {
      fontWeight: '500', // font-medium
      color: '#1f2937', // text-gray-800
    },
    sharingTime: {
      fontSize: 12, // text-xs
      color: '#6b7280', // text-gray-500
    },
    sharingText: {
      fontSize: 14, // text-sm
      color: '#4b5563', // text-gray-600
      marginTop: 4,
    },
    sharingImageContainer: {
      marginTop: 8,
    },
    sharingImage: {
      borderRadius: 8, // rounded-lg
      width: '100%',
      height: 144, // h-36
      resizeMode: 'cover',
    },
    sharingActions: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
    },
    sharingActionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: 16,
    },
    sharingActionText: {
      fontSize: 14, // text-sm
      color: '#4b5563', // text-gray-600
      marginLeft: 4,
    },
    newsContainer: {
      gap: 12, // space-y-3
    },
    newsItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: '#f3f4f6', // border-gray-100
    },
    newsTextContainer: {
      flex: 1,
      paddingRight: 12,
    },
    newsTitle: {
      fontWeight: '500', // font-medium
      fontSize: 14, // text-sm
      // line-clamp-2 is not directly supported, use numberOfLines
    },
    newsMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
    },
    newsSource: {
      fontSize: 12, // text-xs
      color: '#6b7280', // text-gray-500
      marginRight: 8,
    },
    newsTime: {
      fontSize: 12, // text-xs
      color: '#6b7280', // text-gray-500
    },
    newsImage: {
      width: 64, // w-16
      height: 64, // h-16
      borderRadius: 8, // rounded-lg
      resizeMode: 'cover',
    },
    recommendationCard: {
      marginTop: 10,
      marginBottom: 10,
      padding: 20,
      backgroundColor: '#fff7ed',
      borderRadius: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
      alignItems: 'flex-start',
    },
    dishTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: '#ef4444',
      marginBottom: 8,
    },
    dishName: {
      fontSize: 22,
      fontWeight: 'bold',
      color: '#b91c1c',
    },
    reason: {
      fontSize: 16,
      color: '#374151',
      marginBottom: 12,
    },
    restaurantInfo: {
      marginTop: 8,
      alignSelf: 'stretch',
    },
    restaurantName: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#1f2937',
    },
    restaurantRating: {
      fontSize: 16,
      color: '#f59e42',
    },
    restaurantAddress: {
      fontSize: 15,
      color: '#6b7280',
      marginBottom: 10,
    },
    restaurantDistance: {
      fontSize: 15,
      color: '#059669',
      marginBottom: 6,
    },
    navigateButton: {
      backgroundColor: '#ef4444',
      paddingVertical: 10,
      paddingHorizontal: 24,
      borderRadius: 8,
      alignItems: 'center',
      marginTop: 8,
    },
    navigateButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: 'bold',
    },
    orderButton: {
      backgroundColor: '#10b981',
      paddingVertical: 10,
      paddingHorizontal: 24,
      borderRadius: 8,
      alignItems: 'center',
      marginTop: 8,
    },
    orderButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: 'bold',
    },
    // Floating Action Button (FAB) styles
    fab: {
      position: 'absolute',
      right: 20,
      bottom: 20,
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: '#ef4444',
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 5,
      elevation: 8,
    },
    // Modal styles
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: 'white',
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      paddingBottom: 40,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: 20,
      textAlign: 'center',
    },
    modalButton: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderRadius: 12,
      backgroundColor: '#f3f4f6',
      marginBottom: 12,
    },
    modalButtonText: {
      fontSize: 18,
      fontWeight: '500',
      marginLeft: 12,
      color: '#1f2937',
    },
    modalCancelButton: {
      padding: 16,
      borderRadius: 12,
      backgroundColor: '#fee2e2',
      alignItems: 'center',
    },
    modalCancelButtonText: {
      fontSize: 18,
      fontWeight: '500',
      color: '#ef4444',
    },
    analyzingOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 9999,
    },
    analyzingText: {
      color: 'white',
      fontSize: 18,
      marginTop: 12,
    },
    // Footer styles are handled by Tab.Navigator in App.tsx
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* 顶部导航栏 */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>吃喝玩乐</Text>
          <View style={styles.headerIcons}>
            <TouchableOpacity style={styles.iconButton} accessibilityLabel="搜索">
              <Feather name="search" size={20} color="white" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} accessibilityLabel="通知">
              <Feather name="bell" size={20} color="white" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} accessibilityLabel="消息">
              <Feather name="message-square" size={20} color="white" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} accessibilityLabel="设置" onPress={() => navigation.navigate('SettingsScreen')}>
              <Feather name="settings" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {/* 主要内容区 */}
        <ScrollView style={styles.mainScroll}>
          <View style={styles.mainContent}>
            {/* 吃喝选择按钮 */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'eat' ? styles.tabButtonActive : styles.tabButtonInactive]}
                onPress={() => setActiveTab('eat')}
              >
                <Text style={[styles.tabText, activeTab === 'eat' ? styles.tabTextActive : styles.tabTextInactive]}>吃</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'drink' ? styles.tabButtonActive : styles.tabButtonInactive]}
                onPress={() => setActiveTab('drink')}
              >
                <Text style={[styles.tabText, activeTab === 'drink' ? styles.tabTextActive : styles.tabTextInactive]}>喝</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'play' ? styles.tabButtonActive : styles.tabButtonInactive]}
                onPress={() => setActiveTab('play')}
              >
                <Text style={[styles.tabText, activeTab === 'play' ? styles.tabTextActive : styles.tabTextInactive]}>玩</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabButton, activeTab === 'fun' ? styles.tabButtonActive : styles.tabButtonInactive]}
                onPress={() => setActiveTab('fun')}
              >
                <Text style={[styles.tabText, activeTab === 'fun' ? styles.tabTextActive : styles.tabTextInactive]}>乐</Text>
              </TouchableOpacity>
            </View>

            {/* Recommendation Display Area */}
            {isLoadingRecommendation && (
              <ActivityIndicator size="large" color="#ef4444" style={styles.loadingIndicator} />
            )}
            {recommendationData && !isLoadingRecommendation && (
              <>
                {recommendationData
                  .filter(item => item && item.restaurant && Number(item.restaurant.rating) >= 4.5)
                  .map((item, idx) => (
                    item && item.restaurant ? (
                      <View style={styles.recommendationCard} key={idx}>
                        <Text style={styles.dishTitle}>推荐菜品：</Text>
                        {/* 渲染菜名数组 */}
                        {Array.isArray(item.dishes) && item.dishes.map((dish, i) => (
                          <Text key={i} style={styles.dishName}>• {dish}</Text>
                        ))}
                        <Text style={styles.reason}>理由：{item.reason}</Text>
                        <View style={styles.restaurantInfo}>
                          <Text style={styles.restaurantName}>{item.restaurant.name}</Text>
                          <Text style={styles.restaurantRating}>评分：{item.restaurant.rating}</Text>
                          <Text style={styles.restaurantAddress}>{item.restaurant.address}</Text>
                          {userLocation && item.restaurant.lat && item.restaurant.lng && (
                            <Text style={styles.restaurantDistance}>
                              距离你约 {getDistanceFromLatLonInKm(userLocation.lat, userLocation.lng, item.restaurant.lat, item.restaurant.lng).toFixed(1)} 公里
                            </Text>
                          )}
                          <TouchableOpacity
                            style={styles.navigateButton}
                            onPress={() => openMapApp(
                              item.restaurant.lat,
                              item.restaurant.lng,
                              item.restaurant.name
                            )}
                          >
                            <Text style={styles.navigateButtonText}>一键导航到餐厅</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.orderButton}
                            onPress={() => handleOrderFood(
                              item.restaurant.name,
                              Array.isArray(item.dishes) ? item.dishes[0] : ''
                            )}
                          >
                            <Text style={styles.orderButtonText}>一键点外卖</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : null
                  ))}
              </>
            )}

            {/* 热门推荐 */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>大家都在{activeTab === 'eat' ? '吃' : '喝'}</Text>
                <TouchableOpacity>
                  <Text style={styles.moreButtonText}>更多</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.recommendationsGrid}>
                {getRecommendations().map((item) => (
                  <View key={item.id} style={styles.recommendationItem}>
                    <View style={styles.recommendationImageContainer}>
                      <Image source={{ uri: item.imageUrl }} style={styles.recommendationImage} resizeMode="cover" />
                      <View style={styles.likesOverlay}>
                        <Text style={styles.likesText}>{item.likes}人喜欢</Text>
                      </View>
                    </View>
                    <Text style={styles.recommendationName}>{item.name}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* 朋友圈分享 */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>朋友圈美食分享</Text>
                <TouchableOpacity>
                  <Text style={styles.moreButtonText}>查看全部</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.sharingContainer}>
                {friendsSharing.map((post, index) => (
                  <View key={post.id} style={[styles.sharingPost, index === friendsSharing.length - 1 && { borderBottomWidth: 0 }]}>
                    <View style={styles.sharingPostInner}>
                      <View style={styles.sharingAvatar} />
                      <View style={styles.sharingContent}>
                        <View style={styles.sharingHeader}>
                          <Text style={styles.sharingUsername}>{post.username}</Text>
                          <Text style={styles.sharingTime}>{post.time}</Text>
                        </View>
                        <Text style={styles.sharingText}>{post.content}</Text>
                        <View style={styles.sharingImageContainer}>
                          <Image source={{ uri: post.imageUrl }} style={styles.sharingImage} />
                        </View>
                        <View style={styles.sharingActions}>
                          <TouchableOpacity style={styles.sharingActionButton}>
                            <Feather name="heart" size={16} color="#4b5563" />
                            <Text style={styles.sharingActionText}>{post.likes}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.sharingActionButton}>
                            <Feather name="message-square" size={16} color="#4b5563" />
                            <Text style={styles.sharingActionText}>{post.comments}</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* 美食新闻 */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>美食新闻</Text>
                <TouchableOpacity>
                  <Text style={styles.moreButtonText}>更多资讯</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.newsContainer}>
                {foodNews.map((news, index) => (
                  <View key={news.id} style={[styles.newsItem, index === foodNews.length - 1 && { borderBottomWidth: 0 }]}>
                    <View style={styles.newsTextContainer}>
                      <Text style={styles.newsTitle} numberOfLines={2}>{news.title}</Text>
                      <View style={styles.newsMeta}>
                        <Text style={styles.newsSource}>{news.source}</Text>
                        <Text style={styles.newsTime}>{news.time}</Text>
                      </View>
                    </View>
                    <Image source={{ uri: news.imageUrl }} style={styles.newsImage} />
                  </View>
                ))}
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Floating Action Button for Camera */}
        <TouchableOpacity
          style={styles.fab}
          onPress={handleCameraPress}
          accessibilityLabel="拍照识别食物"
        >
          <Feather name="camera" size={28} color="white" />
        </TouchableOpacity>

        {/* Photo Options Modal */}
        <Modal
          visible={showPhotoModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowPhotoModal(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowPhotoModal(false)}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>选择照片来源</Text>

              <TouchableOpacity
                style={styles.modalButton}
                onPress={handleTakePhoto}
              >
                <Feather name="camera" size={24} color="#1f2937" />
                <Text style={styles.modalButtonText}>拍照</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalButton}
                onPress={handlePickFromGallery}
              >
                <Feather name="image" size={24} color="#1f2937" />
                <Text style={styles.modalButtonText}>从相册选择</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowPhotoModal(false)}
              >
                <Text style={styles.modalCancelButtonText}>取消</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Analyzing Overlay */}
        {analyzingPhoto && (
          <View style={styles.analyzingOverlay}>
            <ActivityIndicator size="large" color="white" />
            <Text style={styles.analyzingText}>正在分析照片...</Text>
            {capturedPhotoUri && (
              <Image
                source={{ uri: capturedPhotoUri }}
                style={{ width: 200, height: 200, marginTop: 20, borderRadius: 12 }}
              />
            )}
          </View>
        )}

        {/* 底部导航栏 - This is handled by App.tsx */}
      </View>
    </SafeAreaView>
  );
}
