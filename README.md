# Aegis Vault 🛡️

> **Zero-Knowledge, Client-Side Encrypted Password Manager**  
> Built with React 19, TypeScript, Tailwind CSS, and WebCrypto API (AES-256-GCM + PBKDF2-SHA256).

Aegis Vault is a modern, privacy-first password manager that runs entirely in your browser. All encryption and decryption operations happen locally on your device—your master password and plaintext credentials are **never** transmitted to any server or remote storage.

---

## ✨ Features

- 🔐 **Zero-Knowledge Security Architecture**:
  - **AES-256-GCM**: Military-grade authenticated encryption for all vault payloads.
  - **PBKDF2-SHA256**: 600,000 key derivation iterations with cryptographic salt.
  - **Master Key Verification**: HMAC-SHA256 verification token prevents master key exposure during unlock attempts.
- 📊 **Security Audit & Health Dashboard**:
  - Live vault health score calculation based on password length, entropy, reuse, and weak credentials.
  - One-click filters to isolate compromised or reused passwords.
- 🎲 **Cryptographic Password Generator**:
  - Customizable generator (length, uppercase, lowercase, numbers, special symbols, ambiguous character exclusion).
  - High-entropy random byte generation via `crypto.getRandomValues`.
- ⚡ **Real-Time Password Strength Evaluator**:
  - Instant zxcvbn-style entropy scoring with cracking time estimates and tailored improvement tips.
- ⏱️ **Auto-Lock & Inactivity Timer**:
  - Configurable auto-lock duration (1m, 5m, 15m, 30m) and auto-lock on window blur / tab switch.
- 📋 **Secure Clipboard Integration**:
  - Auto-clearing clipboard after a set countdown (5s, 10s, 30s) to prevent sensitive data leaks.
- 📁 **Backup, Export & Import**:
  - Export encrypted vault backup (`.enc` JSON file) for offsite storage.
  - Export unencrypted CSV for migration.
  - Import JSON backups with automatic deduplication.
- 🎨 **Elegant Dark Mode UI**:
  - Modern, high-contrast dark theme built with Tailwind CSS, Lucide icons, and Motion transitions.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS v4, Lucide React Icons, Motion
- **Cryptography**: Native WebCrypto API (`window.crypto.subtle`)
- **Key Derivation**: PBKDF2-SHA256 (600,000 iterations)
- **Symmetric Encryption**: AES-256-GCM (12-byte IV)

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed on your machine:
- [Node.js](https://nodejs.org/) (v18.0.0 or higher)
- [npm](https://www.npmjs.com/) (v9.0.0 or higher) or `pnpm` / `yarn`

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/aegis-vault.git
cd aegis-vault
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables (Optional)

Copy the example environment file:

```bash
cp .env.example .env
```

Since Aegis Vault executes 100% client-side in the browser, no API keys or backend server configurations are required.

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

---

## 📦 Production Build

To build the project for production:

```bash
npm run build
```

The optimized static build files will be output to the `dist/` directory.

To test the production build locally:

```bash
npm run preview
```

---

## 📂 Project Structure

```
aegis-vault/
├── public/                 # Static assets
├── src/
│   ├── components/         # React UI Components
│   │   ├── CredentialModal.tsx          # Add/Edit password dialog
│   │   ├── DashboardView.tsx            # Main overview & quick stats
│   │   ├── DeleteConfirmModal.tsx       # Deletion & purge confirmations
│   │   ├── GeneratorView.tsx            # Password generator tool
│   │   ├── MasterPasswordSetup.tsx      # First-time vault creation
│   │   ├── Navbar.tsx                   # Top navigation & lock controls
│   │   ├── SecurityAuditView.tsx        # Vault health & security audit
│   │   ├── SettingsView.tsx             # Preferences, backup & export
│   │   ├── StrengthCheckerModalView.tsx # Password analyzer tool
│   │   ├── UnlockVault.tsx              # Vault unlock screen
│   │   └── VaultView.tsx                # Password list, search & filters
│   ├── lib/                # Core Utility Modules
│   │   ├── crypto.ts                    # WebCrypto AES-GCM & PBKDF2 implementations
│   │   └── storage.ts                   # Encrypted storage & settings handlers
│   ├── App.tsx             # Main Application Root & State Management
│   ├── index.css           # Tailwind CSS imports & animations
│   ├── main.tsx            # React Entry Point
│   └── types.ts            # TypeScript interfaces & types
├── .env.example            # Environment variables blueprint
├── .gitignore              # Git ignore configuration
├── index.html              # HTML Document Entry Point
├── package.json            # Project dependencies and scripts
├── tsconfig.json           # TypeScript compiler configuration
└── vite.config.ts          # Vite build configuration
```

---

## 🌐 Deployment Options

Since Aegis Vault produces a set of static HTML, CSS, and JS files upon build, it can be hosted on any static hosting provider **for free without needing a paid cloud account**:

### Option 1: Vercel

1. Install Vercel CLI or connect your GitHub repository to [Vercel](https://vercel.com).
2. Set Build Command: `npm run build`
3. Set Output Directory: `dist`

### Option 2: Netlify

1. Drag and drop the `dist/` folder to Netlify Drop, or connect your GitHub repository in Netlify.
2. Build Command: `npm run build`
3. Publish directory: `dist`

### Option 3: GitHub Pages

Use `gh-pages` package or GitHub Actions to deploy the contents of `dist/` directly to your `gh-pages` branch.

---

## 🔒 Security Disclaimer

Aegis Vault uses industry-standard cryptographic algorithms implemented via the browser's native WebCrypto API. Because this software operates under a zero-knowledge model, **your master password is never stored anywhere**. If you forget your master password, your encrypted data cannot be recovered. Always keep an encrypted offline backup of your vault (`.enc` file).

---

## 📄 License

Apache-2.0 License. See [LICENSE](LICENSE) for details.
