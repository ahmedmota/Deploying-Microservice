# E-Commerce Mobile App

React Native mobile application for the E-Commerce microservices backend.

## Features

- User Authentication (Login/Register)
- Browse Products
- Product Search
- Shopping Cart
- Place Orders
- View Order History
- User Profile Management

## Tech Stack

- React Native
- Expo
- React Navigation
- Axios for API calls
- AsyncStorage for local data
- Expo Secure Store for tokens

## Setup

### Prerequisites

- Node.js (v18+)
- Expo CLI
- iOS Simulator (Mac) or Android Emulator

### Installation

1. Navigate to the app directory:
   ```bash
   cd app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Update API URL:
   - Open `src/services/api.js`
   - Replace `192.168.1.100` with your computer's actual IP address
   - You can find your IP by running `ipconfig` (Windows) or `ifconfig` (Mac/Linux)

### Running the App

#### On Android:
```bash
npm run android
```

#### On iOS (Mac only):
```bash
npm run ios
```

#### On Web Browser:
```bash
npm run web
```

#### Using Expo Go App:
```bash
npm start
```
Then scan the QR code with the Expo Go app on your phone.

## Important Notes

### API Connection

When running on a physical device or emulator, you **cannot** use `localhost` or `127.0.0.1` to connect to your backend. You must use your computer's actual IP address.

**To find your IP address:**

- **Windows**: Open Command Prompt and run `ipconfig`, look for "IPv4 Address"
- **Mac/Linux**: Open Terminal and run `ifconfig` or `ip addr`, look for your local network IP

**Example:**
If your computer's IP is `192.168.1.100`, update `src/services/api.js`:
```javascript
const API_BASE_URL = __DEV__
  ? 'http://192.168.1.100:8080'  // Your computer's IP
  : 'https://your-production-api.com';
```

### Testing on the Same Network

Make sure your mobile device/emulator is on the same Wi-Fi network as your computer running the backend services.

## Project Structure

```
app/
├── src/
│   ├── screens/           # App screens
│   │   ├── LoginScreen.js
│   │   ├── RegisterScreen.js
│   │   ├── HomeScreen.js
│   │   ├── ProductsScreen.js
│   │   ├── ProductDetailScreen.js
│   │   ├── CartScreen.js
│   │   ├── OrdersScreen.js
│   │   └── ProfileScreen.js
│   ├── navigation/        # Navigation configuration
│   ├── contexts/          # React contexts (Auth)
│   ├── services/          # API services
│   ├── components/        # Reusable components
│   └── utils/            # Utility functions
├── assets/               # Images and fonts
├── App.js               # Main app component
└── package.json
```

## Features Overview

### Authentication
- Secure login and registration
- JWT token management
- Auto-login on app restart

### Products
- Browse all products
- Search functionality
- View product details
- Add to cart

### Shopping Cart
- Add/remove items
- Update quantities
- View total price
- Checkout

### Orders
- Place orders with shipping address
- View order history
- Track order status

### Profile
- View user information
- Logout functionality

## Troubleshooting

### Cannot connect to API
- Verify your backend services are running (`docker-compose ps`)
- Check that you're using your computer's IP, not localhost
- Ensure both devices are on the same network
- Check firewall settings aren't blocking port 8080

### Build errors
- Clear cache: `expo start -c`
- Reinstall dependencies: `rm -rf node_modules && npm install`
- Check that you have the correct version of Expo SDK

### Navigation issues
- Make sure all screen components are imported correctly
- Check React Navigation setup in `AppNavigator.js`

## Development

### Adding New Features

1. Create screen component in `src/screens/`
2. Add route in `src/navigation/AppNavigator.js`
3. Add API service method in `src/services/api.js` if needed

### Styling

The app uses React Native's StyleSheet API. All styles are defined inline with components for now. Consider creating a shared `styles` folder for theme consistency.

## Production Build

### Android:
```bash
eas build --platform android
```

### iOS:
```bash
eas build --platform ios
```

Note: You'll need an Expo account and EAS CLI configured for production builds.

## License

MIT
