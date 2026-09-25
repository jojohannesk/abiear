// Capacitor: die Web-Fassung als Android-App. Gebaut wird mit
// `npm run android` (Vite-Bau ohne Service Worker, dann `cap sync`).
import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  // Dieselbe Kennung wie die iOS-App — im Play Store ist sie der Paketname
  // und lässt sich nach der ersten Veröffentlichung nie mehr ändern.
  appId: "de.abiear.app",
  appName: "AbiEar",
  webDir: "dist",
  backgroundColor: "#15171b",
  android: {
    // Nur Dunkelmodus, wie unter iOS: kein weißes Aufblitzen beim Start.
    backgroundColor: "#15171b",
  },
  plugins: {
    SystemBars: {
      // Randlos; die Ränder rechnet `design.css` mit `env(safe-area-inset-*)`.
      insetsHandling: "css",
      initialViewportFitValueHint: "cover",
      style: "DARK",
    },
    LocalNotifications: {
      smallIcon: "ic_stat_abiear",
      iconColor: "#00D1DA",
    },
  },
};

export default config;
