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
    // TODO: Implement actual food recognition using TensorFlow.js
    // For now, we'll create mock data
    const mockAnalysis: Omit<PhotoAnalysis, 'id'> = {
      photoPath: photoUri,
      analysisTimestamp: new Date().toISOString(),
      confidenceScore: 0.85,
      mealTimeEstimate: 'lunch',
      isConfirmed: false
    };

    const analysisId = await addPhotoAnalysis(mockAnalysis);

    const mockDetectedItems: Omit<DetectedFoodItem, 'id'>[] = [
      {
        photoId: analysisId,
        foodId: 1, // Assuming food ID 1 exists in the database
        confidenceScore: 0.9,
        estimatedAmount: 200,
        userCorrectedAmount: null,
        positionInPhoto: JSON.stringify({ x: 100, y: 100, width: 200, height: 200 })
      }
    ];

    const detectedItemIds = await Promise.all(
      mockDetectedItems.map(item => addDetectedFoodItem(item))
    );

    return {
      analysis: { ...mockAnalysis, id: analysisId },
      detectedItems: mockDetectedItems.map((item, index) => ({
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