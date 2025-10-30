import {
  addPhotoAnalysis,
  getAllPhotoAnalyses,
  getDetectedFoodItems,
  deletePhotoAnalysis,
  updatePhotoAnalysisConfirmation,
  getAnalysisCountByMealTime,
} from '../index';
import { PhotoAnalysis, DetectedFoodItem } from '../../types';

// Mock the SQLite database
jest.mock('expo-sqlite', () => ({
  openDatabase: jest.fn(() => ({
    transaction: jest.fn((callback) => {
      callback({
        executeSql: jest.fn((query, params, success) => {
          // Mock successful execution
          if (query.includes('INSERT')) {
            if (success) success(null, { insertId: 1 });
          } else if (query.includes('SELECT')) {
            if (success) success(null, { rows: { length: 0, item: () => null } });
          } else if (query.includes('DELETE') || query.includes('UPDATE')) {
            if (success) success(null, {});
          }
        }),
      });
    }),
  })),
}));

describe('Database Service', () => {
  describe('addPhotoAnalysis', () => {
    it('should add a photo analysis and return an ID', async () => {
      const analysis: Omit<PhotoAnalysis, 'id'> = {
        photoPath: '/path/to/photo.jpg',
        analysisTimestamp: new Date().toISOString(),
        confidenceScore: 0.85,
        mealTimeEstimate: 'lunch',
        isConfirmed: false,
      };

      const id = await addPhotoAnalysis(analysis);
      expect(id).toBe(1);
    });
  });

  describe('getAllPhotoAnalyses', () => {
    it('should return all photo analyses', async () => {
      const analyses = await getAllPhotoAnalyses();
      expect(Array.isArray(analyses)).toBe(true);
    });
  });

  describe('deletePhotoAnalysis', () => {
    it('should delete a photo analysis', async () => {
      await expect(deletePhotoAnalysis(1)).resolves.toBeUndefined();
    });
  });

  describe('updatePhotoAnalysisConfirmation', () => {
    it('should update confirmation status', async () => {
      await expect(
        updatePhotoAnalysisConfirmation(1, true)
      ).resolves.toBeUndefined();
    });
  });
});
