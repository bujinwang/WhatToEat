import * as tf from '@tensorflow/tfjs';
import * as mobilenet from '@tensorflow-models/mobilenet';
import { bundleResourceIO, decodeJpeg } from '@tensorflow/tfjs-react-native';
import * as FileSystem from 'expo-file-system';

let model: mobilenet.MobileNet | null = null;
let isTfjsReady = false;

/**
 * Initialize TensorFlow.js and load the MobileNet model
 */
export const initializeTensorFlow = async (): Promise<void> => {
  try {
    if (isTfjsReady && model) {
      console.log('TensorFlow.js already initialized');
      return;
    }

    console.log('Initializing TensorFlow.js...');

    // Wait for TensorFlow.js to be ready
    await tf.ready();
    isTfjsReady = true;
    console.log('TensorFlow.js backend:', tf.getBackend());

    // Load MobileNet model
    console.log('Loading MobileNet model...');
    model = await mobilenet.load({
      version: 2,
      alpha: 1.0, // Model accuracy (0.25, 0.50, 0.75, 1.0)
    });
    console.log('MobileNet model loaded successfully');
  } catch (error) {
    console.error('Error initializing TensorFlow:', error);
    throw error;
  }
};

/**
 * Classify an image and detect food items
 */
export const classifyImage = async (imageUri: string): Promise<{
  predictions: Array<{
    className: string;
    probability: number;
  }>;
  isFoodDetected: boolean;
  confidenceScore: number;
}> => {
  try {
    if (!model) {
      await initializeTensorFlow();
    }

    if (!model) {
      throw new Error('Model not loaded');
    }

    console.log('Processing image:', imageUri);

    // Read image file as base64
    const imageData = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Convert base64 to array buffer
    const rawImageData = tf.util.encodeString(imageData, 'base64').buffer;
    const imageTensor = decodeJpeg(new Uint8Array(rawImageData));

    // Get predictions
    const predictions = await model.classify(imageTensor);

    // Clean up tensor to prevent memory leaks
    imageTensor.dispose();

    console.log('Predictions:', predictions);

    // Food-related keywords to identify if the image contains food
    const foodKeywords = [
      'food', 'dish', 'meal', 'plate', 'bowl', 'pizza', 'burger', 'sandwich',
      'salad', 'soup', 'noodle', 'rice', 'bread', 'fruit', 'vegetable',
      'meat', 'chicken', 'beef', 'pork', 'fish', 'seafood', 'dessert',
      'cake', 'cookie', 'ice cream', 'pasta', 'sushi', 'taco', 'burrito',
      'breakfast', 'lunch', 'dinner', 'snack', 'beverage', 'drink',
      '包子', '饺子', '面条', '米饭', '炒饭', '炒面', '火锅', '烧烤'
    ];

    // Check if any prediction contains food-related keywords
    const isFoodDetected = predictions.some(pred =>
      foodKeywords.some(keyword =>
        pred.className.toLowerCase().includes(keyword.toLowerCase())
      )
    );

    // Get the highest confidence score
    const confidenceScore = predictions.length > 0 ? predictions[0].probability : 0;

    return {
      predictions: predictions.map(p => ({
        className: p.className,
        probability: p.probability,
      })),
      isFoodDetected,
      confidenceScore,
    };
  } catch (error) {
    console.error('Error classifying image:', error);
    throw error;
  }
};

/**
 * Estimate meal time based on current time and detection confidence
 */
export const estimateMealTime = (): 'breakfast' | 'lunch' | 'dinner' | 'snack' => {
  const hour = new Date().getHours();

  if (hour >= 6 && hour < 10) {
    return 'breakfast';
  } else if (hour >= 11 && hour < 14) {
    return 'lunch';
  } else if (hour >= 17 && hour < 21) {
    return 'dinner';
  } else {
    return 'snack';
  }
};

/**
 * Map food predictions to food items in database
 * This is a simplified version - in production, you'd want a more sophisticated mapping
 */
export const mapPredictionsToFoodItems = (predictions: Array<{ className: string; probability: number }>) => {
  // Map common food names to categories
  const categoryMapping: { [key: string]: string } = {
    'pizza': 'Italian',
    'sushi': 'Japanese',
    'burger': 'Fast Food',
    'sandwich': 'Western',
    'salad': 'Healthy',
    'noodle': 'Asian',
    'rice': 'Asian',
    'pasta': 'Italian',
    'soup': 'Soup',
    'taco': 'Mexican',
  };

  return predictions.map(pred => {
    const category = Object.keys(categoryMapping).find(key =>
      pred.className.toLowerCase().includes(key)
    );

    return {
      name: pred.className,
      category: category ? categoryMapping[category] : 'Other',
      confidence: pred.probability,
    };
  });
};

/**
 * Clean up TensorFlow resources
 */
export const cleanupTensorFlow = () => {
  if (model) {
    model.dispose();
    model = null;
  }
  // Dispose all tensors to prevent memory leaks
  tf.disposeVariables();
};
