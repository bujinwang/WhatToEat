import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Camera } from 'expo-camera';
import { takePhoto, pickFromGallery, analyzePhoto } from '../services/photoAnalysis';
import { PhotoAnalysis, DetectedFoodItem } from '../types';

export const CameraScreen: React.FC = () => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<{
    analysis: PhotoAnalysis;
    detectedItems: DetectedFoodItem[];
  } | null>(null);

  useEffect(() => {
    (async () => {
      const { camera, media } = await requestPermissions();
      setHasPermission(camera && media);
    })();
  }, []);

  const handleTakePhoto = async () => {
    const uri = await takePhoto();
    if (uri) {
      setPhotoUri(uri);
      const result = await analyzePhoto(uri);
      setAnalysis(result);
    }
  };

  const handlePickFromGallery = async () => {
    const uri = await pickFromGallery();
    if (uri) {
      setPhotoUri(uri);
      const result = await analyzePhoto(uri);
      setAnalysis(result);
    }
  };

  if (hasPermission === null) {
    return <View style={styles.container}><Text>Requesting permissions...</Text></View>;
  }

  if (hasPermission === false) {
    return <View style={styles.container}><Text>No access to camera</Text></View>;
  }

  return (
    <View style={styles.container}>
      {photoUri ? (
        <View style={styles.previewContainer}>
          <Image source={{ uri: photoUri }} style={styles.preview} />
          {analysis && (
            <View style={styles.analysisContainer}>
              <Text style={styles.analysisText}>
                Confidence: {(analysis.analysis.confidenceScore * 100).toFixed(1)}%
              </Text>
              <Text style={styles.analysisText}>
                Meal Time: {analysis.analysis.mealTimeEstimate}
              </Text>
              {analysis.detectedItems.map(item => (
                <Text key={item.id} style={styles.analysisText}>
                  Detected: Food ID {item.foodId} ({(item.confidenceScore * 100).toFixed(1)}%)
                </Text>
              ))}
            </View>
          )}
          <TouchableOpacity
            style={styles.button}
            onPress={() => setPhotoUri(null)}
          >
            <Text style={styles.buttonText}>Take Another Photo</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.cameraContainer}>
          <Camera style={styles.camera} type={Camera.Constants.Type.back}>
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.button}
                onPress={handleTakePhoto}
              >
                <Text style={styles.buttonText}>Take Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.button}
                onPress={handlePickFromGallery}
              >
                <Text style={styles.buttonText}>Choose from Gallery</Text>
              </TouchableOpacity>
            </View>
          </Camera>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  buttonContainer: {
    flex: 1,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  button: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 15,
    borderRadius: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  previewContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  preview: {
    width: '100%',
    height: '60%',
    resizeMode: 'contain',
  },
  analysisContainer: {
    marginTop: 20,
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 10,
    width: '90%',
  },
  analysisText: {
    fontSize: 16,
    marginVertical: 5,
  },
}); 