import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { useOverlayStore } from "../stores/overlay-store";

interface LogEventPayload {
  type: string;
  zone_name?: string;
  character_name?: string;
  direction?: string;
  player_name?: string;
  message?: string;
  level?: number;
  server?: string;
}

/**
 * Listen for log-event events from the Rust backend (Client.txt watcher).
 * Updates the overlay store with zone changes, deaths, etc.
 */
export function useClientLog() {
  useEffect(() => {
    const unlisten = listen<LogEventPayload>("log-event", (event) => {
      const data = event.payload;
      const store = useOverlayStore.getState();

      switch (data.type) {
        case "zone":
          if (data.zone_name) {
            store.setZone(data.zone_name);
          }
          break;
        case "death":
          store.addDeath();
          break;
        case "level_up":
          // Could display a notification, for now just log
          console.log(`Level up: ${data.level}`);
          break;
        case "connected":
          console.log(`Connected to: ${data.server}`);
          break;
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);
}
