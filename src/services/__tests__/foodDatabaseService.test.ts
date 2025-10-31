import {
  isFoodDatabaseInitialized,
  initializeFoodDatabase,
  getAllFoodItems,
  getFoodItemsByCategory,
  searchFoodItems,
  getFoodItemById,
  getFoodItemByName,
  getAllCategories,
  searchFoodItemsByTag,
  searchFoodItemsWithFilters,
  clearFoodDatabase,
  FoodItem,
} from '../foodDatabaseService';

// Mock the SQLite database
jest.mock('expo-sqlite', () => ({
  openDatabase: jest.fn(() => ({
    transaction: jest.fn((callback: any) => {
      const mockTx = {
        executeSql: jest.fn((sql: string, params: any[], success?: any, error?: any) => {
          // Mock responses based on SQL query
          if (sql.includes('SELECT COUNT(*) as count FROM FoodItems')) {
            if (success) success(null, { rows: { item: () => ({ count: 5 }), length: 1 } });
          } else if (sql.includes('ALTER TABLE')) {
            if (success) success(null, {});
          } else if (sql.includes('INSERT INTO FoodItems')) {
            if (success) success(null, { insertId: 1 });
          } else if (sql.includes('SELECT * FROM FoodItems WHERE id = ?')) {
            if (success) {
              success(null, {
                rows: {
                  item: () => ({
                    id: 1,
                    name: '米饭',
                    category: '主食',
                    calories: 116,
                    protein: 2.6,
                    carbs: 25.9,
                    fat: 0.3,
                    servingSize: 100,
                    servingUnit: '克',
                    tags: '["主食","碳水"]'
                  }),
                  length: 1
                }
              });
            }
          } else if (sql.includes('SELECT * FROM FoodItems WHERE name = ?')) {
            if (success) {
              success(null, {
                rows: {
                  item: () => ({
                    id: 1,
                    name: '米饭',
                    category: '主食',
                    calories: 116,
                    protein: 2.6,
                    carbs: 25.9,
                    fat: 0.3,
                    servingSize: 100,
                    servingUnit: '克',
                    tags: '["主食","碳水"]'
                  }),
                  length: 1
                }
              });
            }
          } else if (sql.includes('SELECT * FROM FoodItems WHERE name LIKE ?')) {
            if (success) {
              success(null, {
                rows: {
                  item: (i: number) => ({
                    id: 1,
                    name: '米饭',
                    category: '主食',
                    calories: 116,
                    protein: 2.6,
                    carbs: 25.9,
                    fat: 0.3,
                    servingSize: 100,
                    servingUnit: '克',
                    tags: '["主食","碳水"]'
                  }),
                  length: 1
                }
              });
            }
          } else if (sql.includes('SELECT * FROM FoodItems WHERE category = ?')) {
            if (success) {
              success(null, {
                rows: {
                  item: (i: number) => ({
                    id: 1,
                    name: '米饭',
                    category: '主食',
                    calories: 116,
                    protein: 2.6,
                    carbs: 25.9,
                    fat: 0.3,
                    servingSize: 100,
                    servingUnit: '克',
                    tags: '["主食","碳水"]'
                  }),
                  length: 2
                }
              });
            }
          } else if (sql.includes('SELECT DISTINCT category FROM FoodItems')) {
            if (success) {
              success(null, {
                rows: {
                  item: (i: number) => ({ category: ['主食', '川菜', '粤菜'][i] }),
                  length: 3
                }
              });
            }
          } else if (sql.includes('SELECT * FROM FoodItems WHERE tags LIKE ?')) {
            if (success) {
              success(null, {
                rows: {
                  item: (i: number) => ({
                    id: 1,
                    name: '米饭',
                    category: '主食',
                    calories: 116,
                    protein: 2.6,
                    carbs: 25.9,
                    fat: 0.3,
                    servingSize: 100,
                    servingUnit: '克',
                    tags: '["主食","碳水"]'
                  }),
                  length: 1
                }
              });
            }
          } else if (sql.includes('SELECT * FROM FoodItems') && sql.includes('ORDER BY name')) {
            if (success) {
              success(null, {
                rows: {
                  item: (i: number) => ({
                    id: i + 1,
                    name: ['米饭', '馒头'][i],
                    category: '主食',
                    calories: 116,
                    protein: 2.6,
                    carbs: 25.9,
                    fat: 0.3,
                    servingSize: 100,
                    servingUnit: '克',
                    tags: '["主食","碳水"]'
                  }),
                  length: 2
                }
              });
            }
          } else if (sql.includes('DELETE FROM FoodItems')) {
            if (success) success(null, {});
          }
        })
      };
      callback(mockTx);
    })
  }))
}));

describe('Food Database Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isFoodDatabaseInitialized', () => {
    it('should check if database is initialized', async () => {
      const isInitialized = await isFoodDatabaseInitialized();
      expect(isInitialized).toBe(true);
    });
  });

  describe('initializeFoodDatabase', () => {
    it('should initialize the food database', async () => {
      await expect(initializeFoodDatabase()).resolves.not.toThrow();
    });
  });

  describe('getAllFoodItems', () => {
    it('should get all food items', async () => {
      const items = await getAllFoodItems();
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBeGreaterThan(0);
      expect(items[0]).toHaveProperty('name');
      expect(items[0]).toHaveProperty('category');
      expect(items[0]).toHaveProperty('calories');
      expect(items[0]).toHaveProperty('tags');
    });
  });

  describe('getFoodItemsByCategory', () => {
    it('should get food items by category', async () => {
      const items = await getFoodItemsByCategory('主食');
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBeGreaterThan(0);
      expect(items[0].category).toBe('主食');
    });
  });

  describe('searchFoodItems', () => {
    it('should search food items by name', async () => {
      const items = await searchFoodItems('米饭');
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBeGreaterThan(0);
      expect(items[0].name).toContain('米饭');
    });
  });

  describe('getFoodItemById', () => {
    it('should get food item by ID', async () => {
      const item = await getFoodItemById(1);
      expect(item).not.toBeNull();
      expect(item?.id).toBe(1);
      expect(item?.name).toBe('米饭');
    });
  });

  describe('getFoodItemByName', () => {
    it('should get food item by exact name', async () => {
      const item = await getFoodItemByName('米饭');
      expect(item).not.toBeNull();
      expect(item?.name).toBe('米饭');
      expect(item?.tags).toEqual(['主食', '碳水']);
    });
  });

  describe('getAllCategories', () => {
    it('should get all unique categories', async () => {
      const categories = await getAllCategories();
      expect(Array.isArray(categories)).toBe(true);
      expect(categories.length).toBeGreaterThan(0);
      expect(categories).toContain('主食');
    });
  });

  describe('searchFoodItemsByTag', () => {
    it('should search food items by tag', async () => {
      const items = await searchFoodItemsByTag('主食');
      expect(Array.isArray(items)).toBe(true);
      expect(items.length).toBeGreaterThan(0);
    });
  });

  describe('searchFoodItemsWithFilters', () => {
    it('should search with multiple filters', async () => {
      const items = await searchFoodItemsWithFilters({
        searchTerm: '米',
        category: '主食',
        maxCalories: 200,
        minProtein: 2
      });
      expect(Array.isArray(items)).toBe(true);
    });

    it('should search with tag filter', async () => {
      const items = await searchFoodItemsWithFilters({
        tag: '主食'
      });
      expect(Array.isArray(items)).toBe(true);
    });

    it('should search without filters', async () => {
      const items = await searchFoodItemsWithFilters({});
      expect(Array.isArray(items)).toBe(true);
    });
  });

  describe('clearFoodDatabase', () => {
    it('should clear all food items', async () => {
      await expect(clearFoodDatabase()).resolves.not.toThrow();
    });
  });
});
