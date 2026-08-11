# 📱 How to Build Aegis Vault into an Android APK

Aegis Vault is built as a zero-knowledge Progressive Web App (PWA) powered by Capacitor. You can build it into a native Android APK file using two easy methods:

---

## Method 1: Automated GitHub Actions (Easiest - No Android Studio Needed) 🚀

This project includes a pre-configured GitHub Actions workflow in `.github/workflows/build-apk.yml`.

1. Push your code to your GitHub repository.
2. Go to the **Actions** tab in your GitHub repository.
3. Click on the **Build Android APK** workflow.
4. Click **Run workflow** (or wait for the push trigger).
5. Once complete (~2-3 minutes), download the generated `aegis-vault-debug.apk` under **Artifacts** at the bottom of the workflow run page!
6. Install the `.apk` file directly on your Android phone.

---

## Method 2: Local Android Studio or Command Line 💻

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [Android Studio](https://developer.android.com/studio) installed with Android SDK & JDK 21+

### Step-by-Step Instructions

#### 1. Build the Web Application
```bash
npm run build
```

#### 2. Initialize and Add Android Platform
```bash
npx cap add android
```

#### 3. Sync Web Assets to Native Project
```bash
npm run cap:sync
```

#### 4. Build APK

**Option A: Using Command Line (Gradle)**
```bash
cd android
./gradlew assembleDebug
```
The compiled APK will be located at:
`android/app/build/outputs/apk/debug/app-debug.apk`

**Option B: Using Android Studio GUI**
```bash
npx cap open android
```
- In Android Studio, select **Build > Build Bundle(s) / APK(s) > Build APK(s)** from the top menu bar.
- Once finished, click **locate** in the popup notification to find your `.apk` file.

---

## 🌐 100% Offline Capability

Aegis Vault is designed to work completely offline without an internet connection:
- All cryptographic key derivation (PBKDF2) and AES-256-GCM encryption run natively on the device using WebCrypto.
- Service Worker precaching is enabled via `vite-plugin-pwa`.
- No backend server or network calls are made. Your master password and vault data remain strictly local.
