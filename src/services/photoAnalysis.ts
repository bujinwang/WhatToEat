import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { addPhotoAnalysis, addDetectedFoodItem } from '../database';
import { PhotoAnalysis, DetectedFoodItem } from '../types';

export const requestPermissions = async () => {
  const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
  const { status: mediaStatus } = await MediaLibrary.requestPermissionsAsync();
  
  return {
    camera: cameraStatus === 'granted',
    media: mediaStatus === 'granted'
  };
};

export const takePhoto = async (): Promise<string | null> => {
  try {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      return result.assets[0].uri;
    }
    return null;
  } catch (error) {
    console.error('Error taking photo:', error);
    return null;
  }
};

export const pickFromGallery = async (): Promise<string | null> => {
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      return result.assets[0].uri;
    }
    return null;
  } catch (error) {
    console.error('Error picking from gallery:', error);
    return null;
  }
};

export const analyzePhoto = async (photoUri: string): Promise<{
  analysis: PhotoAnalysis;
  detectedItems: DetectedFoodItem[];
} | null> => {
  try {
    // Use TensorFlow.js for actual food recognition
    const { classifyImage, estimateMealTime, mapPredictionsToFoodItems } = await import('./foodRecognition');
    const { searchFoodItems, getFoodItemByName } = await import('./foodDatabaseService');

    console.log('Analyzing photo with TensorFlow.js...');
    const { predictions, isFoodDetected, confidenceScore } = await classifyImage(photoUri);

    if (!isFoodDetected) {
      console.warn('No food detected in the image');
      // Still save the analysis, but with low confidence
    }

    const mealTime = estimateMealTime();
    const foodItems = mapPredictionsToFoodItems(predictions);

    const analysis: Omit<PhotoAnalysis, 'id'> = {
      photoPath: photoUri,
      analysisTimestamp: new Date().toISOString(),
      confidenceScore: confidenceScore,
      mealTimeEstimate: mealTime,
      isConfirmed: false
    };

    const analysisId = await addPhotoAnalysis(analysis);

    // Create detected food items from predictions and map to actual food database
    const detectedItems: Omit<DetectedFoodItem, 'id'>[] = [];

    for (const item of foodItems.slice(0, 3)) {
      // Try to find exact match first
      let foodItem = await getFoodItemByName(item.name);

      // If no exact match, try searching for similar items
      if (!foodItem) {
        const searchResults = await searchFoodItems(item.name);
        if (searchResults.length > 0) {
          foodItem = searchResults[0]; // Use the first match
        }
      }

      // Only add if we found a matching food item in the database
      if (foodItem) {
        detectedItems.push({
          photoId: analysisId,
          foodId: foodItem.id,
          confidenceScore: item.confidence,
          estimatedAmount: foodItem.servingSize, // Use the standard serving size
          userCorrectedAmount: null,
          positionInPhoto: JSON.stringify({
            x: 0,
            y: 0,
            width: 100,
            height: 100,
            name: foodItem.name,
            category: foodItem.category
          })
        });
      } else {
        console.warn(`Food item not found in database: ${item.name}`);
      }
    }

    const detectedItemIds = await Promise.all(
      detectedItems.map(item => addDetectedFoodItem(item))
    );

    return {
      analysis: { ...analysis, id: analysisId },
      detectedItems: detectedItems.map((item, index) => ({
        ...item,
        id: detectedItemIds[index]
      }))
    };
  } catch (error) {
    console.error('Error analyzing photo:', error);
    return null;
  }
};

export const scanGalleryForFoodPhotos = async (): Promise<string[]> => {
  try {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Permission to access media library was denied');
    }

    const assets = await MediaLibrary.getAssetsAsync({
      mediaType: ['photo'],
      sortBy: ['creationTime'],
      first: 100 // Limit to last 100 photos for performance
    });

    // TODO: Implement actual food photo detection
    // For now, return all photos
    return assets.assets.map(asset => asset.uri);
  } catch (error) {
    console.error('Error scanning gallery:', error);
    return [];
  }
}; 