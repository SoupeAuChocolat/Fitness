// Accès aux fonctions Android via Capacitor. Dans un navigateur, tout vaut null
// et l'app fonctionne comme la version web.
const Cap = globalThis.Capacitor;

export const isNative = !!Cap?.isNativePlatform?.();

const plugin = (name) => (isNative && Cap.isPluginAvailable(name) ? Cap.registerPlugin(name) : null);

export const App = plugin('App');
export const LocalNotifications = plugin('LocalNotifications');
export const Filesystem = plugin('Filesystem');
export const Share = plugin('Share');
export const BarcodeScanner = plugin('BarcodeScanner');
export const HealthConnect = plugin('HealthConnect');
export const MaFormeWidget = plugin('MaFormeWidget');
export const CapacitorHttp = isNative ? globalThis.capacitorExports?.CapacitorHttp ?? null : null;
export const SystemBars = isNative ? globalThis.capacitorExports?.SystemBars ?? null : null;
