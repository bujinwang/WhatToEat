import * as SQLite from 'expo-sqlite';
import { PhotoAnalysis, DetectedFoodItem, FoodItem, UserProfile, NutritionReport } from '../types';

const db = SQLite.openDatabase('whattoeat.db');

export const initDatabase = () => {
  db.transaction(tx => {
    // Create PhotoAnalysis table
    tx.executeSql(
      `CREATE TABLE IF NOT EXISTS PhotoAnalysis (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        photoPath TEXT NOT NULL,
        analysisTimestamp TEXT NOT NULL,
        confidenceScore REAL NOT NULL,
        mealTimeEstimate TEXT NOT NULL,
        isConfirmed INTEGER DEFAULT 0
      )`
    );

    // Create DetectedFoodItems table
    tx.executeSql(
      `CREATE TABLE IF NOT EXISTS DetectedFoodItems (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        photoId INTEGER NOT NULL,
        foodId INTEGER NOT NULL,
        confidenceScore REAL NOT NULL,
        estimatedAmount REAL NOT NULL,
        userCorrectedAmount REAL,
        positionInPhoto TEXT NOT NULL,
        FOREIGN KEY (photoId) REFERENCES PhotoAnalysis(id),
        FOREIGN KEY (foodId) REFERENCES FoodItems(id)
      )`
    );

    // Create FoodItems table
    tx.executeSql(
      `CREATE TABLE IF NOT EXISTS FoodItems (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        calories REAL NOT NULL,
        protein REAL NOT NULL,
        carbs REAL NOT NULL,
        fat REAL NOT NULL,
        servingSize REAL NOT NULL,
        servingUnit TEXT NOT NULL
      )`
    );

    // Create UserProfile table
    tx.executeSql(
      `CREATE TABLE IF NOT EXISTS UserProfile (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        height REAL NOT NULL,
        weight REAL NOT NULL,
        activityLevel TEXT NOT NULL,
        dietaryGoals TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      )`
    );

    // Create NutritionReport table
    tx.executeSql(
      `CREATE TABLE IF NOT EXISTS NutritionReport (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        date TEXT NOT NULL,
        totalCalories REAL NOT NULL,
        totalProtein REAL NOT NULL,
        totalCarbs REAL NOT NULL,
        totalFat REAL NOT NULL,
        mealBreakdown TEXT NOT NULL,
        FOREIGN KEY (userId) REFERENCES UserProfile(id)
      )`
    );
  });
};

// Helper functions for database operations
export const addPhotoAnalysis = (analysis: Omit<PhotoAnalysis, 'id'>): Promise<number> => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        `INSERT INTO PhotoAnalysis (photoPath, analysisTimestamp, confidenceScore, mealTimeEstimate, isConfirmed)
         VALUES (?, ?, ?, ?, ?)`,
        [
          analysis.photoPath,
          analysis.analysisTimestamp,
          analysis.confidenceScore,
          analysis.mealTimeEstimate,
          analysis.isConfirmed ? 1 : 0
        ],
        (_, result) => resolve(result.insertId),
        (_, error) => {
          reject(error);
          return false;
        }
      );
    });
  });
};

export const addDetectedFoodItem = (item: Omit<DetectedFoodItem, 'id'>): Promise<number> => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        `INSERT INTO DetectedFoodItems (photoId, foodId, confidenceScore, estimatedAmount, userCorrectedAmount, positionInPhoto)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          item.photoId,
          item.foodId,
          item.confidenceScore,
          item.estimatedAmount,
          item.userCorrectedAmount,
          item.positionInPhoto
        ],
        (_, result) => resolve(result.insertId),
        (_, error) => {
          reject(error);
          return false;
        }
      );
    });
  });
};

export const getPhotoAnalysis = (id: number): Promise<PhotoAnalysis> => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM PhotoAnalysis WHERE id = ?',
        [id],
        (_, { rows }) => {
          if (rows.length > 0) {
            resolve(rows.item(0));
          } else {
            reject(new Error('Photo analysis not found'));
          }
        },
        (_, error) => {
          reject(error);
          return false;
        }
      );
    });
  });
};

export const getDetectedFoodItems = (photoId: number): Promise<DetectedFoodItem[]> => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM DetectedFoodItems WHERE photoId = ?',
        [photoId],
        (_, { rows }) => {
          const items: DetectedFoodItem[] = [];
          for (let i = 0; i < rows.length; i++) {
            items.push(rows.item(i));
          }
          resolve(items);
        },
        (_, error) => {
          reject(error);
          return false;
        }
      );
    });
  });
};

// Get all photo analyses (for history screen)
export const getAllPhotoAnalyses = (): Promise<PhotoAnalysis[]> => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM PhotoAnalysis ORDER BY analysisTimestamp DESC',
        [],
        (_, { rows }) => {
          const analyses: PhotoAnalysis[] = [];
          for (let i = 0; i < rows.length; i++) {
            const row = rows.item(i);
            analyses.push({
              ...row,
              isConfirmed: Boolean(row.isConfirmed)
            });
          }
          resolve(analyses);
        },
        (_, error) => {
          reject(error);
          return false;
        }
      );
    });
  });
};

// Get photo analyses with pagination
export const getPhotoAnalysesPaginated = (limit: number, offset: number): Promise<PhotoAnalysis[]> => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM PhotoAnalysis ORDER BY analysisTimestamp DESC LIMIT ? OFFSET ?',
        [limit, offset],
        (_, { rows }) => {
          const analyses: PhotoAnalysis[] = [];
          for (let i = 0; i < rows.length; i++) {
            const row = rows.item(i);
            analyses.push({
              ...row,
              isConfirmed: Boolean(row.isConfirmed)
            });
          }
          resolve(analyses);
        },
        (_, error) => {
          reject(error);
          return false;
        }
      );
    });
  });
};

// Get recent analyses (for stats)
export const getRecentAnalyses = (days: number): Promise<PhotoAnalysis[]> => {
  return new Promise((resolve, reject) => {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM PhotoAnalysis WHERE analysisTimestamp >= ? ORDER BY analysisTimestamp DESC',
        [startDate.toISOString()],
        (_, { rows }) => {
          const analyses: PhotoAnalysis[] = [];
          for (let i = 0; i < rows.length; i++) {
            const row = rows.item(i);
            analyses.push({
              ...row,
              isConfirmed: Boolean(row.isConfirmed)
            });
          }
          resolve(analyses);
        },
        (_, error) => {
          reject(error);
          return false;
        }
      );
    });
  });
};

// Get analysis count by meal time
export const getAnalysisCountByMealTime = (): Promise<{ [key: string]: number }> => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT mealTimeEstimate, COUNT(*) as count FROM PhotoAnalysis GROUP BY mealTimeEstimate',
        [],
        (_, { rows }) => {
          const counts: { [key: string]: number } = {};
          for (let i = 0; i < rows.length; i++) {
            const row = rows.item(i);
            counts[row.mealTimeEstimate] = row.count;
          }
          resolve(counts);
        },
        (_, error) => {
          reject(error);
          return false;
        }
      );
    });
  });
};

// Delete a photo analysis
export const deletePhotoAnalysis = (id: number): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      // First delete related detected items
      tx.executeSql(
        'DELETE FROM DetectedFoodItems WHERE photoId = ?',
        [id],
        () => {
          // Then delete the analysis
          tx.executeSql(
            'DELETE FROM PhotoAnalysis WHERE id = ?',
            [id],
            () => resolve(),
            (_, error) => {
              reject(error);
              return false;
            }
          );
        },
        (_, error) => {
          reject(error);
          return false;
        }
      );
    });
  });
};

// Update confirmation status
export const updatePhotoAnalysisConfirmation = (id: number, isConfirmed: boolean): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'UPDATE PhotoAnalysis SET isConfirmed = ? WHERE id = ?',
        [isConfirmed ? 1 : 0, id],
        () => resolve(),
        (_, error) => {
          reject(error);
          return false;
        }
      );
    });
  });
};

// Initialize the database when the module is imported
initDatabase(); 