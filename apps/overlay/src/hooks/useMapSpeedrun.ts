import { useEffect } from "react";
import { useOverlayStore } from "../stores/overlay-store";
import { useSpeedrunStore } from "../stores/speedrun-store";
import { isMapZone, isHideout, isBossArena, findMap } from "@exiled-orb/shared";

/**
 * Hook that monitors zone changes and death events to automatically
 * track map runs (start → boss → complete cycle).
 *
 * State machine: idle → in_map → (boss_arena) → completed → idle
 */
export function useMapSpeedrun() {
  const currentZone = useOverlayStore((s) => s.currentZone);
  const sessionDeaths = useOverlayStore((s) => s.sessionDeaths);

  useEffect(() => {
    if (!currentZone) return;

    const store = useSpeedrunStore.getState();
    if (!store.tracking) return;

    const now = Date.now();

    if (isMapZone(currentZone)) {
      // Entered a map zone
      if (!store.currentRun) {
        // New map run
        const mapInfo = findMap(currentZone);
        store.startMapRun(
          mapInfo?.name ?? currentZone,
          mapInfo?.tier ?? null,
          now
        );
      } else if (isBossArena(currentZone)) {
        // Entered boss arena within current map
        store.enterBossArena(now);
      }
    } else if (isHideout(currentZone)) {
      // Returned to hideout — complete the current map run
      if (store.currentRun) {
        store.completeMapRun(now);
      }
    }
    // If we zone to a town or campaign area, we don't auto-complete
    // (could be a portal back to town during a map)
  }, [currentZone]);

  // Track deaths during map runs
  useEffect(() => {
    const store = useSpeedrunStore.getState();
    if (store.currentRun && sessionDeaths > 0) {
      store.addMapDeath();
    }
  }, [sessionDeaths]);
}
