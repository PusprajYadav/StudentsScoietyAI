import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { initializeAppRuntime } from "./lib/appRuntime";
import { scheduleDeferredTask } from "./lib/browserTasks";
import {
  initCapacitorNotifications,
} from "./lib/capacitorNotifications";
import { warmAndroidStartupPermissions } from "./lib/androidPermissions";
import { useThemeStore } from "./store/themeStore";

async function bootstrap() {
  await useThemeStore.getState().initTheme();

  // Initialise Capacitor native notification listeners (no-op on web)
  initCapacitorNotifications();

  ReactDOM.createRoot(document.getElementById("root")!).render(<App />);

  void Promise.resolve().then(() => {
    scheduleDeferredTask(() => {
      void initializeAppRuntime().catch(() => undefined);
    }, { timeout: 1200 });

    scheduleDeferredTask(() => {
      void warmAndroidStartupPermissions();
    }, { timeout: 2400 });
  });
}

void bootstrap();
