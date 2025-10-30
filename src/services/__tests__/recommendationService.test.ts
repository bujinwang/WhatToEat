import { getFoodRecommendation, getUserHabits } from '../recommendationService';
import * as Location from 'expo-location';
import { Pedometer } from 'expo-sensors';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock the config module
jest.mock('../../config', () => ({
  GOOGLE_CLOUD_API_KEY: 'test-api-key',
}));

describe('Recommendation Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserHabits', () => {
    it('should return default habits when no settings are saved', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const habits = await getUserHabits();

      expect(habits).toContain('喜欢辣');
      expect(habits).toContain('偏爱面食');
      expect(habits).toContain('非素食');
    });

    it('should return vegetarian habit when user is vegetarian', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({ vegetarian: true, likesSpicy: false, prefersNoodles: false })
      );

      const habits = await getUserHabits();

      expect(habits).toContain('素食');
      expect(habits).not.toContain('非素食');
    });

    it('should return custom habits based on user settings', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({ vegetarian: false, likesSpicy: true, prefersNoodles: true })
      );

      const habits = await getUserHabits();

      expect(habits).toContain('喜欢辣');
      expect(habits).toContain('偏爱面食');
      expect(habits).toContain('非素食');
    });
  });

  describe('getFoodRecommendation', () => {
    beforeEach(() => {
      // Mock location permissions and data
      (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });

      (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
        coords: {
          latitude: 40.7128,
          longitude: -74.006,
        },
      });

      // Mock pedometer
      (Pedometer.isAvailableAsync as jest.Mock).mockResolvedValue(true);
      (Pedometer.requestPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
      });
      (Pedometer.getStepCountAsync as jest.Mock).mockResolvedValue({
        steps: 5000,
      });

      // Mock AsyncStorage
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      // Mock fetch for weather and places APIs
      global.fetch = jest.fn((url) => {
        if (url.includes('routes.googleapis.com')) {
          // Weather API mock
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                routes: [
                  {
                    legs: [
                      {
                        steps: [
                          {
                            weather: {
                              description: 'Sunny',
                              temperature: { value: 25 },
                            },
                          },
                        ],
                      },
                    ],
                  },
                ],
              }),
          });
        } else if (url.includes('place/nearbysearch')) {
          // Places API mock
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                status: 'OK',
                results: [
                  {
                    name: '测试中餐厅',
                    vicinity: '测试地址',
                    rating: 4.5,
                    user_ratings_total: 100,
                  },
                ],
              }),
          });
        }
        return Promise.reject(new Error('Unknown URL'));
      }) as jest.Mock;
    });

    it('should return a recommendation string', async () => {
      // Mock Gemini AI response
      const mockGemini = {
        generateContent: jest.fn().mockResolvedValue({
          response: {
            text: () => '```json\n[{"dishes": ["宫保鸡丁", "麻婆豆腐"], "reason": "适合午餐", "restaurant": {"name": "测试中餐厅", "rating": 4.5, "address": "测试地址", "lat": 40.7128, "lng": -74.006}}]\n```',
          },
        }),
      };

      // Mock GoogleGenerativeAI
      jest.doMock('@google/generative-ai', () => ({
        GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
          getGenerativeModel: jest.fn().mockReturnValue(mockGemini),
        })),
      }));

      const recommendation = await getFoodRecommendation();

      expect(typeof recommendation).toBe('string');
      expect(recommendation.length).toBeGreaterThan(0);
    });

    it('should handle location permission denial gracefully', async () => {
      (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
      });

      const recommendation = await getFoodRecommendation();

      expect(typeof recommendation).toBe('string');
    });

    it('should handle pedometer unavailability', async () => {
      (Pedometer.isAvailableAsync as jest.Mock).mockResolvedValue(false);

      const recommendation = await getFoodRecommendation();

      expect(typeof recommendation).toBe('string');
    });
  });
});
