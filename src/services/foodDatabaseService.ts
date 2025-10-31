import * as SQLite from 'expo-sqlite';
import foodData from '../data/foodDatabase.json';

const db = SQLite.openDatabase('whattoeat.db');

export interface FoodItem {
  id: number;
  name: string;
  category: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize: number;
  servingUnit: string;
  tags?: string[];
}

// Check if food database is initialized
export const isFoodDatabaseInitialized = (): Promise<boolean> => {
  return new Promise((resolve) => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT COUNT(*) as count FROM FoodItems',
        [],
        (_, { rows }) => {
          const count = rows.item(0).count;
          resolve(count > 0);
        },
        () => {
          resolve(false);
          return false;
        }
      );
    });
  });
};

// Initialize food database with data from JSON
export const initializeFoodDatabase = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      // First, add tags column if it doesn't exist
      tx.executeSql(
        `ALTER TABLE FoodItems ADD COLUMN tags TEXT`,
        [],
        () => {
          console.log('Tags column added to FoodItems table');
        },
        () => {
          // Column might already exist, that's okay
          return false;
        }
      );

      // Check if data is already loaded
      tx.executeSql(
        'SELECT COUNT(*) as count FROM FoodItems',
        [],
        (_, { rows }) => {
          const count = rows.item(0).count;

          if (count > 0) {
            console.log('Food database already initialized');
            resolve();
            return;
          }

          // Insert all food items from JSON
          let insertedCount = 0;
          const totalItems = foodData.length;

          foodData.forEach((food, index) => {
            const tagsJson = food.tags ? JSON.stringify(food.tags) : '[]';

            tx.executeSql(
              `INSERT INTO FoodItems (name, category, calories, protein, carbs, fat, servingSize, servingUnit, tags)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                food.name,
                food.category,
                food.calories,
                food.protein,
                food.carbs,
                food.fat,
                food.servingSize,
                food.servingUnit,
                tagsJson
              ],
              () => {
                insertedCount++;
                if (insertedCount === totalItems) {
                  console.log(`Successfully initialized food database with ${totalItems} items`);
                  resolve();
                }
              },
              (_, error) => {
                console.error('Error inserting food item:', error);
                reject(error);
                return false;
              }
            );
          });
        },
        (_, error) => {
          reject(error);
          return false;
        }
      );
    });
  });
};

// Get all food items
export const getAllFoodItems = (): Promise<FoodItem[]> => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM FoodItems ORDER BY name',
        [],
        (_, { rows }) => {
          const items: FoodItem[] = [];
          for (let i = 0; i < rows.length; i++) {
            const row = rows.item(i);
            items.push({
              ...row,
              tags: row.tags ? JSON.parse(row.tags) : []
            });
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

// Get food items by category
export const getFoodItemsByCategory = (category: string): Promise<FoodItem[]> => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM FoodItems WHERE category = ? ORDER BY name',
        [category],
        (_, { rows }) => {
          const items: FoodItem[] = [];
          for (let i = 0; i < rows.length; i++) {
            const row = rows.item(i);
            items.push({
              ...row,
              tags: row.tags ? JSON.parse(row.tags) : []
            });
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

// Search food items by name
export const searchFoodItems = (searchTerm: string): Promise<FoodItem[]> => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM FoodItems WHERE name LIKE ? ORDER BY name',
        [`%${searchTerm}%`],
        (_, { rows }) => {
          const items: FoodItem[] = [];
          for (let i = 0; i < rows.length; i++) {
            const row = rows.item(i);
            items.push({
              ...row,
              tags: row.tags ? JSON.parse(row.tags) : []
            });
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

// Get food item by ID
export const getFoodItemById = (id: number): Promise<FoodItem | null> => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM FoodItems WHERE id = ?',
        [id],
        (_, { rows }) => {
          if (rows.length > 0) {
            const row = rows.item(0);
            resolve({
              ...row,
              tags: row.tags ? JSON.parse(row.tags) : []
            });
          } else {
            resolve(null);
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

// Get food item by name (exact match)
export const getFoodItemByName = (name: string): Promise<FoodItem | null> => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM FoodItems WHERE name = ?',
        [name],
        (_, { rows }) => {
          if (rows.length > 0) {
            const row = rows.item(0);
            resolve({
              ...row,
              tags: row.tags ? JSON.parse(row.tags) : []
            });
          } else {
            resolve(null);
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

// Get all categories
export const getAllCategories = (): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT DISTINCT category FROM FoodItems ORDER BY category',
        [],
        (_, { rows }) => {
          const categories: string[] = [];
          for (let i = 0; i < rows.length; i++) {
            categories.push(rows.item(i).category);
          }
          resolve(categories);
        },
        (_, error) => {
          reject(error);
          return false;
        }
      );
    });
  });
};

// Search food items by tags
export const searchFoodItemsByTag = (tag: string): Promise<FoodItem[]> => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM FoodItems WHERE tags LIKE ? ORDER BY name',
        [`%"${tag}"%`],
        (_, { rows }) => {
          const items: FoodItem[] = [];
          for (let i = 0; i < rows.length; i++) {
            const row = rows.item(i);
            items.push({
              ...row,
              tags: row.tags ? JSON.parse(row.tags) : []
            });
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

// Get food items by multiple filters
export interface FoodSearchFilters {
  searchTerm?: string;
  category?: string;
  tag?: string;
  maxCalories?: number;
  minProtein?: number;
}

export const searchFoodItemsWithFilters = (filters: FoodSearchFilters): Promise<FoodItem[]> => {
  return new Promise((resolve, reject) => {
    const conditions: string[] = [];
    const params: any[] = [];

    if (filters.searchTerm) {
      conditions.push('name LIKE ?');
      params.push(`%${filters.searchTerm}%`);
    }

    if (filters.category) {
      conditions.push('category = ?');
      params.push(filters.category);
    }

    if (filters.tag) {
      conditions.push('tags LIKE ?');
      params.push(`%"${filters.tag}"%`);
    }

    if (filters.maxCalories !== undefined) {
      conditions.push('calories <= ?');
      params.push(filters.maxCalories);
    }

    if (filters.minProtein !== undefined) {
      conditions.push('protein >= ?');
      params.push(filters.minProtein);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const query = `SELECT * FROM FoodItems ${whereClause} ORDER BY name`;

    db.transaction(tx => {
      tx.executeSql(
        query,
        params,
        (_, { rows }) => {
          const items: FoodItem[] = [];
          for (let i = 0; i < rows.length; i++) {
            const row = rows.item(i);
            items.push({
              ...row,
              tags: row.tags ? JSON.parse(row.tags) : []
            });
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

// Clear all food items (for re-initialization)
export const clearFoodDatabase = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'DELETE FROM FoodItems',
        [],
        () => {
          console.log('Food database cleared');
          resolve();
        },
        (_, error) => {
          reject(error);
          return false;
        }
      );
    });
  });
};

// Re-initialize food database (clear and reload)
export const reinitializeFoodDatabase = async (): Promise<void> => {
  await clearFoodDatabase();
  await initializeFoodDatabase();
};
