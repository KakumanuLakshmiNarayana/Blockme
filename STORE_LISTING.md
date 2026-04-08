# Blockme — App Store Listing Guide

## App Name
**Blockme: No-Turn-Back Blocker**

## Subtitle (iOS, 30 chars max)
**VPN-based social media blocker**

## Short Description (Google Play, 80 chars max)
**Block social media across all your apps. No easy way back.**

---

## Full Description

**Stop scrolling. For real this time.**

Blockme is a self-hosted, tamper-proof social media blocker that works at the network level — blocking Instagram, TikTok, YouTube, Twitter, and 14 other platforms across *every app* on every device you own.

**Unlike other blockers, Blockme is designed to make bypassing genuinely painful:**

🔒 **DNS-Level Blocking via WireGuard VPN**
Routes all your traffic through your own server. Blocks happen before any app or browser can reach social media — no per-app exceptions, no incognito workarounds.

⏳ **Typed Friction Unlocks**
Want to unlock Instagram? Wait 10–60 minutes (escalates with each attempt today) then type a specific phrase exactly. No one-tap bypasses.

🚨 **Emergency Cap**
Only 3 emergency unlocks per week, for essential apps only (Zoom, Maps, etc.). Social media is never accessible via emergency.

🕐 **Auto-Relock**
Unlocks expire after 15 minutes. Blocking re-engages automatically.

🛡️ **Tamper-Proof**
Clock manipulation detection via NTP. System time changes re-engage blocking immediately.

📱 **Cross-Device**
One server, every device. iPhone, Android, Mac, Windows — connect via WireGuard and everything is blocked.

📅 **Schedules**
Set automatic blocking windows (e.g. work hours, morning focus time).

**This app requires a self-hosted Blockme server.** See the GitHub repo for setup instructions.

---

## Keywords (iOS)
social media blocker, screen time, digital wellbeing, focus, productivity, vpn blocker, wireguard, app blocker, distraction free, phone addiction

## Category
- **iOS**: Productivity
- **Android**: Productivity

## Age Rating
- iOS: 4+
- Android: Everyone

---

## Privacy Policy Requirements
Both stores require a privacy policy URL. Key points to cover:
- The app connects to a **user-owned** server
- No data is collected by the app developer
- JWT token is stored locally on device (iOS Keychain / Android KeyStore via expo-secure-store)
- Server URL is stored locally only
- No analytics, no tracking

## Support URL
Link to your GitHub repo or a dedicated support page.

---

## Required Assets

### iOS (App Store Connect)
| Asset | Size | Notes |
|---|---|---|
| App Icon | 1024×1024 px | No alpha, no rounded corners (Apple adds them) |
| iPhone 6.7" screenshots | 1290×2796 px | Minimum 3, up to 10 |
| iPhone 6.5" screenshots | 1242×2688 px | Optional but recommended |
| iPad 12.9" screenshots | 2048×2732 px | Required if supportsTablet is true |

### Android (Google Play Console)
| Asset | Size | Notes |
|---|---|---|
| App Icon | 512×512 px | 32-bit PNG |
| Feature Graphic | 1024×500 px | Shown at top of listing |
| Phone screenshots | 16:9 or 9:16 | Min 2, max 8 |

### In-app (add to mobile/assets/)
- `icon.png` — 1024×1024 px (used by Expo for all icon sizes)
- `adaptive-icon.png` — 1024×1024 px (Android adaptive icon foreground)
- `splash.png` — 2048×2048 px (on dark #0f172a background)
- `notification-icon.png` — 96×96 px (Android notification icon, white on transparent)

---

## Pre-Launch Checklist

### EAS Build Setup
```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo account
eas login

# Configure project (creates EAS project ID)
cd mobile && eas build:configure

# Update eas.json with real project ID
# Update app.json: "projectId" and "owner"
```

### iOS Submission
1. Apple Developer account ($99/year)
2. Create App ID in Apple Developer Portal
3. Create app in App Store Connect
4. Build: `cd mobile && eas build --platform ios --profile production`
5. Submit: `eas submit --platform ios`

### Android Submission  
1. Google Play Developer account ($25 one-time)
2. Create app in Google Play Console
3. Create service account + download JSON key → save as `google-play-service-account.json`
4. Build: `cd mobile && eas build --platform android --profile production`
5. Submit: `eas submit --platform android`

### Server Requirements
Users need a Linux server with:
- WireGuard installed (`apt install wireguard`)
- Node.js 20+
- Ports open: 51820 UDP (WireGuard), 3000 TCP (API)
- Root access (for DNS port 53 + WireGuard)

---

## Development Build (Testing)
```bash
cd mobile
npm install
npx expo start          # Expo Go (limited — no WireGuard)
eas build --profile development --platform ios  # Dev build with full native modules
```
