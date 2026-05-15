# EcoTag: Estimating Garment Carbon Footprint from Clothing Labels

EcoTag is a mobile app that estimates the carbon footprint of clothing items by scanning garment care tags. Point your phone camera at a clothing label, and EcoTag uses AI to read the materials, manufacturing origin, and care instructions, then calculates total CO2 emissions across the garment's lifecycle.

The project has two main parts:

- **`backend/`** -- A Node.js server that receives clothing tag images, sends them to a vision-language model (Google Gemini by default, OpenAI optional) for analysis, and calculates CO2 emissions.
- **`mobile/`** -- A React Native (Expo) mobile app with a camera interface for scanning tags and viewing results.

---

## Table of Contents

1. [Features & Pages](#features--pages)
2. [Requirements](#requirements)
3. [Choosing a VLM Provider](#choosing-a-vlm-provider)
4. [Backend Setup](#backend-setup)
5. [Mobile App Setup](#mobile-app-setup)
   - [Option A: iOS Simulator on Mac (Xcode)](#option-a-ios-simulator-on-mac-xcode)
   - [Option B: Real iPhone with Expo Go](#option-b-real-iphone-with-expo-go)
6. [Using the App](#using-the-app)
7. [Troubleshooting](#troubleshooting)
8. [Android Support](#android-support)
9. [Running Without an API Key (Mock Mode)](#running-without-an-api-key-mock-mode)

---

## Features & Pages

### Onboarding
A guided two-step walkthrough that introduces new users to the app's core workflow: scanning a garment tag and viewing the results.

### Home
A dashboard showing your two most recent scans with their CO2 values and EcoRatings. Provides quick access to the scanner and a "View All" link to your full closet history.

### Scan
Point your phone camera at a clothing care tag and take a photo, or pick an image from your photo library. The app sends the image to the backend, where a vision-language model extracts the materials, country of origin, and care instructions.

### Results
After a scan, the app displays a detailed emissions breakdown covering material production, manufacturing, transport, care, and end-of-life. Each garment receives an **EcoRating** (Poor, Average, or Good) based on how its CO2 footprint compares to industry benchmarks, shown as a color-coded badge and gauge.

### Closet
Browse all your scanned garments or just the ones you've saved. Search by name, view material composition and emissions data, and delete items you no longer need.

### Comparison
Select multiple garments to compare their environmental impact side-by-side. Each card shows its EcoRating pill, and the view highlights your overall wardrobe eco-score alongside the highest-impact items.

### About
Background on the Benevolent Bandwidth Foundation and the principles behind EcoTag.

---

## Requirements

You need the following installed on your Mac:

- **Node.js v18 or newer** -- Download the LTS version from [nodejs.org](https://nodejs.org), run the installer, then verify with `node --version` in Terminal.
- **Git** -- Run `git --version` in Terminal. If not installed, macOS will prompt you to install the Command Line Developer Tools.

---

## Choosing a VLM Provider

EcoTag reads clothing tags using a vision-language model (VLM). Two providers are supported; pick one before running the backend.

| Provider | `VLM_PROVIDER` | Default `VLM_MODEL` | API key env var                  |
|----------|----------------|---------------------|----------------------------------|
| Google   | `google`       | `gemini-2.5-pro`    | `GOOGLE_GENERATIVE_AI_API_KEY`   |
| OpenAI   | `openai`       | `gpt-4o`            | `OPENAI_API_KEY`                 |

Selection happens **at server start** via environment variables in `backend/.env`. To switch providers, edit the env file and restart the backend -- there is no per-request override.

> **Note:** Both providers are pay-per-use. Each tag scan costs a fraction of a cent on Gemini Pro or a few cents on GPT-4o.

### Getting a Google Gemini key (recommended)

1. Sign in at [Google AI Studio](https://aistudio.google.com/apikey)
2. Click **"Create API key"**
3. Copy the key -- you'll paste it into `backend/.env` in the next section.

### Getting an OpenAI key (optional)

1. Create an account (or sign in) at [platform.openai.com](https://platform.openai.com/signup)
2. Go to [API keys](https://platform.openai.com/api-keys) and click **"Create new secret key"**
3. Name it (e.g., "EcoTag") and click **Create**
4. **Copy the key immediately** -- it starts with `sk-proj-` and won't be shown again

---

## Backend Setup

### 1. Navigate to the backend directory

```bash
cd ecotag/backend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up your environment file

```bash
cp .env.example .env
```

Open `backend/.env` in any text editor and fill in the key for the provider you chose above.

**For Gemini (default):**

```bash
VLM_PROVIDER=google
GOOGLE_GENERATIVE_AI_API_KEY=your-key-here
```

**For OpenAI:**

```bash
VLM_PROVIDER=openai
OPENAI_API_KEY=sk-proj-your-key-here
```

Override the default model with `VLM_MODEL=...` if you want a different one (e.g., `gemini-2.5-flash`).

### 4. Start the server

```bash
node server.js
```

You should see:

```
Server running on port 3001
```

**Leave this Terminal window open** -- the server needs to stay running. Open a new Terminal window/tab for the mobile app.

---

## Mobile App Setup

There are two ways to run the mobile app:

- **Option A:** iOS Simulator on your Mac (no physical iPhone needed)
- **Option B:** Expo Go on a real iPhone (full camera access)

### Option A: iOS Simulator on Mac (Xcode)

#### 1. Install Xcode

1. Open the **App Store** on your Mac and search for **"Xcode"**
2. Click **Get / Install** (large download, ~10-12 GB)
3. Once installed, **open Xcode once** to accept the license agreement and install additional components

#### 2. Install an iOS Simulator runtime

1. In Xcode, go to **Xcode > Settings > Platforms**
2. If no iOS simulator is listed, click **+** and download the latest iOS version

> Already have Xcode? Verify simulators are available with `xcrun simctl list devices available` in Terminal.

#### 3. Install dependencies and start

Open a **new Terminal window** (keep the backend running):

```bash
cd ecotag/mobile
npm install
npx expo start --ios
```

This starts the Expo dev server, opens the iOS Simulator, and installs the app. The first launch may take a couple of minutes.

> **Note:** The iOS Simulator has no real camera. Use the gallery icon in the app to pick a photo of a clothing tag from your Mac's photo library instead.

---

### Option B: Real iPhone with Expo Go

#### 1. Install Expo Go

Download **"Expo Go"** from the App Store on your iPhone.

#### 2. Connect to the same Wi-Fi

Make sure your iPhone and Mac are on the **same Wi-Fi network**.

#### 3. Install dependencies and start

Open a **new Terminal window** (keep the backend running):

```bash
cd ecotag/mobile
npm install
npx expo start
```

#### 4. Scan the QR code

A QR code will appear in Terminal. Open the **Camera** app on your iPhone, point it at the QR code, and tap the notification to open the app in Expo Go.

> **Backend connection:** The app automatically detects your Mac's IP address from the Expo dev server and connects to the backend on port 3001 -- no manual configuration needed.
>
> **If the app can't reach the backend**, auto-detection may not work on your network. Find your Mac's IP (System Settings > Wi-Fi > Details, or `ipconfig getifaddr en0` in Terminal) and start with:
> ```bash
> EXPO_PUBLIC_API_BASE_URL=http://YOUR_IP:3001 npx expo start
> ```

---

## Using the App

1. **Home** -- View your most recent scans with their CO2 values and EcoRatings, and jump straight to the scanner
2. **Scan** -- Open the Scan tab, point your camera at a clothing tag, and take a photo (or pick one from your photo library)
3. **Results** -- The app sends the image to the backend for AI analysis, then shows the extracted materials, country of origin, care instructions, a CO2 emissions breakdown, and an EcoRating. You can save a scan to your closet from the results screen.
4. **Closet** -- Browse your saved garments or all recent scans. Search, view details, and delete items.
5. **Comparison** -- Select multiple garments to compare their environmental impact side-by-side with EcoRating badges

---

## Troubleshooting

### "Unable to reach backend"

- Make sure the backend is still running (`Server running on port 3001` in Terminal)
- If on a real iPhone, confirm your phone and Mac are on the **same Wi-Fi**
- If auto-detection isn't working, set `EXPO_PUBLIC_API_BASE_URL` explicitly (see [Option B](#option-b-real-iphone-with-expo-go))

### Backend returns 502 (UPSTREAM_ERROR)

- The API key for your selected `VLM_PROVIDER` is likely missing or invalid
- For `VLM_PROVIDER=google`: check that `GOOGLE_GENERATIVE_AI_API_KEY` is set in `backend/.env`
- For `VLM_PROVIDER=openai`: check that `OPENAI_API_KEY` is set in `backend/.env` (starts with `sk-proj-`, no extra spaces)
- The model id in `VLM_MODEL` may not exist for the selected provider

### Xcode / simulator issues

- Make sure Xcode has been opened at least once and components are installed
- Verify a simulator runtime is downloaded (Xcode > Settings > Platforms)

### npm install fails

- Confirm Node.js v18+ is installed (`node --version`)
- Try removing `node_modules` and reinstalling: `rm -rf node_modules && npm install`

---

## Android Support

Android has **not been tested yet**. The app includes Android configuration in `app.json`, but it has not been verified on Android devices or emulators. This is planned for a future milestone.

---

## Running Without an API Key (Mock Mode)

To try the app without a Gemini or OpenAI key, start the backend in mock mode:

```bash
cd backend
MOCK_OCR=1 node server.js
```

This returns fake (but realistic-looking) tag data instead of calling the VLM. Useful for testing the full app flow without any API costs.
