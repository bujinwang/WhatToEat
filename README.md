# WhatToEat - Food Analysis App

A React Native application that helps users track their food intake through photo analysis and provides nutritional insights.

## Features

- Photo-based food recognition
- Automatic meal time detection
- Nutritional analysis
- Food database with common Chinese/Asian foods
- Local storage using SQLite
- Offline-first approach

## Technical Stack

- React Native with TypeScript
- Expo
- SQLite for local storage
- TensorFlow.js for food recognition
- Expo Camera and Image Picker for photo capture
- Expo Media Library for gallery access

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm or yarn
- Expo CLI
- iOS Simulator or Android Emulator

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/whattoeat.git
cd whattoeat
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Run on iOS or Android:
```bash
npm run ios
# or
npm run android
```

## Project Structure

```
src/
├── components/     # React components
├── database/       # SQLite database operations
├── services/       # Business logic and API calls
├── types/          # TypeScript type definitions
└── screens/        # Screen components
```

## Database Schema

The app uses SQLite with the following main tables:

1. `PhotoAnalysis` - Stores photo analysis results
2. `DetectedFoodItems` - Stores detected food items from photos
3. `FoodItems` - Food database with nutritional information
4. `UserProfile` - User information and preferences
5. `NutritionReport` - Daily nutrition reports

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 