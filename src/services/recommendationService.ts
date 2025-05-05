import * as Location from 'expo-location';
import { Pedometer } from 'expo-sensors';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GOOGLE_CLOUD_API_KEY } from '../config'; // Only import Google API key
import AsyncStorage from '@react-native-async-storage/async-storage';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(GOOGLE_CLOUD_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' }); // Use the latest stable model

// --- Interfaces ---
interface WeatherData {
  description: string;
  temperature: number; // Assuming Celsius
}

interface PlaceSearchResult {
  name: string;
  vicinity?: string; // Address or neighborhood
  rating?: number;
  user_ratings_total?: number;
}

interface RecommendationParams {
  location: Location.LocationObject | null;
  weather: WeatherData | null;
  habits: string[]; // Placeholder type (e.g., ['likes spicy', 'dislikes seafood'])
  timeOfDay: string; // e.g., 'morning', 'afternoon', 'evening'
  stepCount: number | null;
  nearbyRestaurants: PlaceSearchResult[];
}

// --- Constants ---
const PLACES_API_ENDPOINT = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';
const WEATHER_API_ENDPOINT = 'https://routes.googleapis.com/directions/v2:computeRoutes'; // Google Maps Routes API endpoint
const RESTAURANT_SEARCH_RADIUS = 5000; // 5km radius for nearby search

// --- Data Fetching Functions ---

async function getLocation(): Promise<Location.LocationObject | null> {
  try {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.error('Location permission denied');
      // Handle permission denial (e.g., show a message to the user)
      return null;
    }

    let location = await Location.getCurrentPositionAsync({});
    console.log('Location fetched:', location);
    return location;
  } catch (error) {
    console.error('Error fetching location:', error);
    return null;
  }
}

async function getStepCount(): Promise<number | null> {
  try {
    const isAvailable = await Pedometer.isAvailableAsync();
    if (!isAvailable) {
      console.log('Pedometer not available on this device.');
      return null;
    }

    let { status } = await Pedometer.requestPermissionsAsync();
    if (status !== 'granted') {
      console.error('Pedometer permission denied');
      // Handle permission denial
      return null;
    }

    const end = new Date();
    const start = new Date();
    start.setHours(0, 0, 0, 0); // Start of the current day

    const pastStepCountResult = await Pedometer.getStepCountAsync(start, end);
    console.log('Step count fetched:', pastStepCountResult.steps);
    return pastStepCountResult.steps;
  } catch (error) {
    console.error('Error fetching step count:', error);
    return null;
  }
}

// Fetch weather data from Google Maps Routes API (Weather add-on)
async function getWeather(latitude: number, longitude: number): Promise<WeatherData | null> {
  console.log('Fetching weather for:', latitude, longitude);
  const url = `${WEATHER_API_ENDPOINT}?key=${GOOGLE_CLOUD_API_KEY}`;
  const body = JSON.stringify({
    origin: {
      location: {
        latLng: { latitude, longitude }
      }
    },
    destination: {
      location: {
        latLng: { latitude, longitude }
      }
    },
    travelMode: 'DRIVE',
    extraComputations: ['WEATHER']
  });

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body,
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Weather API error ${response.status}: ${errorText}`);
      return null;
    }
    const data = await response.json();
    console.log('Weather API response:', data);

    // Extract weather data from the response
    const weather = data?.routes?.[0]?.legs?.[0]?.steps?.[0]?.weather;
    const description = weather?.description || 'Not available';
    const temperature = weather?.temperature?.value ?? null;

    if (temperature !== null) {
      return { description, temperature };
    } else {
      console.warn('Could not extract temperature from weather response');
      return { description, temperature: null };
    }
  } catch (error) {
    console.error('Error calling Weather API:', error);
    return null;
  }
}

// Fetch nearby Chinese restaurants from Google Places API
async function getNearbyChineseRestaurants(latitude: number, longitude: number): Promise<PlaceSearchResult[]> {
  console.log('Fetching nearby Chinese restaurants for:', latitude, longitude);
  const url = `${PLACES_API_ENDPOINT}?location=${latitude},${longitude}&radius=${RESTAURANT_SEARCH_RADIUS}&type=restaurant&keyword=chinese&key=${GOOGLE_CLOUD_API_KEY}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Places API error ${response.status}: ${errorText}`);
      return [];
    }
    const data = await response.json();
    console.log('Places API response status:', data.status);

    if (data.status === 'OK' && data.results) {
      // Map results to our simplified interface
      return data.results.map((place: any) => ({
        name: place.name,
        vicinity: place.vicinity,
        rating: place.rating,
        user_ratings_total: place.user_ratings_total,
      })).slice(0, 10); // Limit to top 10 results
    } else {
      console.warn('No restaurants found or Places API status not OK:', data.status);
      return [];
    }
  } catch (error) {
    console.error('Error calling Places API:', error);
    return [];
  }
}

// 获取用户设置（异步）
async function getUserSettings() {
  try {
    const data = await AsyncStorage.getItem('userSettings');
    if (data) return JSON.parse(data);
  } catch (e) {}
  // 默认值
  return { vegetarian: false, likesSpicy: true, prefersNoodles: true, language: 'zh-CN' };
}

// 修改 getUserHabits，结合异步用户设置
export async function getUserHabits(): Promise<string[]> {
  const userSettings = await getUserSettings();
  const habits = [];
  if (userSettings.likesSpicy) habits.push('喜欢辣');
  if (userSettings.prefersNoodles) habits.push('偏爱面食');
  if (userSettings.vegetarian) habits.push('素食');
  else habits.push('非素食');
  return habits;
}

function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

// --- Recommendation Generation ---

export async function getFoodRecommendation(): Promise<string> {
  console.log('Starting recommendation process...');
  try {
    // Fetch location first
    const location = await getLocation();

    // Fetch step count and habits concurrently
    const [stepCount, habits] = await Promise.all([
      getStepCount(),
      getUserHabits(),
    ]);

    // Fetch weather and restaurants concurrently *if* location is available
    let weatherData: WeatherData | null = null;
    let nearbyRestaurants: PlaceSearchResult[] = [];
    if (location) {
      const [weatherResult, restaurantsResult] = await Promise.all([
        getWeather(location.coords.latitude, location.coords.longitude),
        getNearbyChineseRestaurants(location.coords.latitude, location.coords.longitude),
      ]);
      weatherData = weatherResult;
      nearbyRestaurants = restaurantsResult;
    }

    const params: RecommendationParams = {
      location,
      weather: weatherData, // Now correctly typed
      habits,
      timeOfDay: getTimeOfDay(),
      stepCount,
      nearbyRestaurants,
    };

    console.log('Data collected for prompt:', params);

    // Construct the prompt for Gemini, including nearby restaurants
    const restaurantList = params.nearbyRestaurants.length > 0
      ? params.nearbyRestaurants.map((r, idx) => `  ${idx + 1}. ${r.name}（${r.vicinity || ''}）[评分: ${r.rating || '无'}]`).join('\n')
      : '未找到附近的中餐厅。';

    const prompt = `
      请用如下 JSON 数组格式（并用 markdown 代码块包裹）返回3个推荐：
      [
        {dishes: ['菜名1（中文）', '菜名2（中文）', '菜名3（中文）'], reason: '推荐理由（中文）', restaurant: {name: '餐厅中文名（如有，否则用原名）', rating: 4.5, address: '地址', lat: xx, lng: xx}},
        ...
      ]
      推荐要求：
      1. 只推荐评分4.5分及以上的餐厅。
      2. 每家餐厅推荐三个菜（含主食/配菜，适合两人分享），菜名必须用中文。
      3. 所有内容（菜名、理由、餐厅名、描述等）必须用中文。
      4. 餐厅名请优先用中文（如有），没有则用原名。
      5. 优先参考中国人社区的评价和信息（如大众点评、华人论坛等），更贴近中国人口味。
      6. 结合用户真实手机GPS定位、当前天气、饮食习惯、时间、步数等，推荐3个不同的中餐馆和菜品组合。
      7. 餐厅请从以下列表优选：\n${restaurantList}
      8. 推荐理由简明扼要。
      9. 餐厅信息请补全评分、地址、经纬度（如有）。
      10. 只返回JSON数组，不要多余解释。
      11. 用markdown代码块包裹JSON。
      \n用户信息：\n- 当前时间：${params.timeOfDay}（${new Date().toLocaleTimeString()}）\n- 位置：${params.location ? `纬度 ${params.location.coords.latitude.toFixed(4)}，经度 ${params.location.coords.longitude.toFixed(4)}` : '不可用'}\n- 天气：${params.weather ? `${params.weather.description}，${params.weather.temperature}°C` : '不可用'}\n- 饮食习惯：${params.habits.length > 0 ? params.habits.join('，') : '未指定'}\n- 今日步数：${params.stepCount !== null ? params.stepCount : '不可用'}\n`;

    console.log('Sending prompt to Gemini...');
    // console.log('Prompt:', prompt); // Uncomment to debug prompt

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    console.log('Gemini response received:', text);
    return text;

  } catch (error) {
    console.error('Error getting food recommendation:', error);
    // Check for specific Gemini API errors if needed
    // if (error?.response?.promptFeedback) {
    //   console.error('Gemini Prompt Feedback:', error.response.promptFeedback);
    // }
    return 'Sorry, I encountered an error trying to get a recommendation. Please try again later.';
  }
}
