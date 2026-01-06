# Mobile App Setup Guide

## Quick Start

### 1. Install Dependencies

The dependencies have already been installed. If you need to reinstall:

```bash
cd app
npm install
```

### 2. Configure API URL

**IMPORTANT:** You must update the API URL with your computer's IP address.

1. Find your computer's IP address:
   - **Windows**: Open Command Prompt, run `ipconfig`, look for "IPv4 Address" under your active network adapter
   - **Mac**: Open Terminal, run `ifconfig | grep "inet "`, look for your local IP (usually starts with 192.168.x.x)
   - **Linux**: Run `ip addr show` or `hostname -I`

2. Open `app/src/services/api.js`

3. Replace the IP address on line 8:
   ```javascript
   const API_BASE_URL = __DEV__
     ? 'http://YOUR_IP_HERE:8080'  // Replace YOUR_IP_HERE with your actual IP
     : 'https://your-production-api.com';
   ```

   Example:
   ```javascript
   const API_BASE_URL = __DEV__
     ? 'http://192.168.1.100:8080'  // Your computer's IP
     : 'https://your-production-api.com';
   ```

### 3. Start the Backend Services

Make sure your microservices are running:

```bash
cd D:\microservice
docker-compose -f docker-compose.prod.yml up -d
```

Verify all services are healthy:
```bash
docker-compose -f docker-compose.prod.yml ps
```

### 4. Run the Mobile App

#### Option A: Using Expo Go App (Easiest for Testing)

1. Install Expo Go on your phone:
   - iOS: https://apps.apple.com/app/expo-go/id982107779
   - Android: https://play.google.com/store/apps/details?id=host.exp.exponent

2. Start the development server:
   ```bash
   cd app
   npm start
   ```

3. Scan the QR code:
   - iOS: Use the Camera app
   - Android: Use the Expo Go app

4. The app will open in Expo Go

#### Option B: Android Emulator

1. Install Android Studio and set up an emulator

2. Start the emulator

3. Run:
   ```bash
   cd app
   npm run android
   ```

#### Option C: iOS Simulator (Mac only)

1. Install Xcode

2. Run:
   ```bash
   cd app
   npm run ios
   ```

#### Option D: Web Browser (Limited functionality)

```bash
cd app
npm run web
```

## Testing the App

### 1. Register a New Account

- Open the app
- Click "Register"
- Fill in:
  - First Name: John
  - Last Name: Doe
  - Email: john@example.com
  - Password: Test123! (must be 6+ characters)
  - Confirm Password: Test123!
- Click "Register"
- You should be redirected to Login

### 2. Login

- Email: john@example.com
- Password: Test123!
- Click "Login"

### 3. Browse Products

- Navigate to the "Products" tab
- The products list will be empty initially
- You need to add products via the backend API first

### 4. Add Test Products (Using API)

Open a new terminal and run:

```bash
# Add a category first
curl -X POST http://localhost:8080/api/categories \
  -H "Content-Type: application/json" \
  -d '{"name":"Electronics","description":"Electronic devices","slug":"electronics"}'

# Add a product
curl -X POST http://localhost:8080/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "name":"iPhone 15 Pro",
    "description":"Latest iPhone model",
    "price":999.99,
    "sku":"IPHONE15PRO",
    "stock":50,
    "categoryId":"<category_id_from_previous_response>",
    "imageUrl":"https://example.com/iphone.jpg"
  }'
```

Replace `<category_id_from_previous_response>` with the actual ID returned from the category creation.

### 5. Test Shopping Flow

1. **Browse Products**: Go to Products tab
2. **View Details**: Tap on a product
3. **Add to Cart**: Click "Add to Cart"
4. **View Cart**: Go to Cart tab
5. **Checkout**: Enter shipping address and place order
6. **View Orders**: Go to Orders tab to see your order

## Troubleshooting

### Problem: "Network request failed" or "Unable to connect"

**Solution:**
1. Make sure backend services are running: `docker ps`
2. Check that you updated the IP address in `api.js`
3. Verify your phone/emulator is on the same Wi-Fi network as your computer
4. Try accessing `http://YOUR_IP:8080/health` in a browser to verify the backend is accessible

### Problem: "Cannot connect to Metro bundler"

**Solution:**
1. Clear Expo cache: `npx expo start -c`
2. Restart the development server
3. Make sure port 8081 is not in use

### Problem: App shows empty product list

**Solution:**
1. Products don't exist yet in the database
2. Use the curl commands above to add test data
3. Pull down to refresh the products list in the app

### Problem: Login/Register not working

**Solution:**
1. Check backend logs: `docker-compose -f docker-compose.prod.yml logs user-service`
2. Verify the API Gateway is running: `curl http://localhost:8080/health`
3. Check that the API URL in `api.js` is correct

### Problem: "Engine mismatch" warnings during npm install

**Solution:**
These warnings are safe to ignore. The app will still work with Node.js v20.10.0.

## Development Tips

### Hot Reload

The app supports hot reload. When you make changes to the code, the app will automatically refresh.

### Debugging

- Use `console.log()` statements
- Check the terminal running `npm start` for logs
- Use React Native Debugger or Flipper for advanced debugging

### Adding New Features

1. Create screen in `src/screens/`
2. Add route in `src/navigation/AppNavigator.js`
3. Add API methods in `src/services/api.js`

## Next Steps

1. ✅ Backend services running
2. ✅ Mobile app created
3. ✅ Can register and login
4. ⏳ Add sample products and categories
5. ⏳ Test complete shopping flow
6. ⏳ Customize UI/UX as needed

## Need Help?

Check the main README.md for more detailed information about the app architecture and features.
