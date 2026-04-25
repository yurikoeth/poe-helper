import { useEffect, useRef } from "react";
import { useOverlayStore } from "../stores/overlay-store";
import { useSpeedrunStore } from "../stores/speedrun-store";
import { isMapZone, isHideout, isBossArena, findMap } from "@exiled-orb/shared";

/**
 * Hook that monitors zone changes and death events to automatically
 * track map runs (start → boss → complete cycle).
 *
 * When the player returns to hideout, the timer stops and a pending run
 * is shown with Clear/Brick buttons. Nothing is saved until the user decides.
 */
export function useMapSpeedrun() {
  const currentZone = useOverlayStore((s) => s.currentZone);
  const sessionDeaths = useOverlayStore((s) => s.sessionDeaths);
  const areaLevel = useOverlayStore((s) => s.areaLevel);
  const characterName = useOverlayStore((s) => s.characterName);
  const lastDeathCountRef = useRef<number | null>(null);

  useEffect(() => {
    if (!currentZone) return;

    const store = useSpeedrunStore.getState();
    if (!store.tracking) return;

    const now = Date.now();

    if (isMapZone(currentZone)) {
      if (!store.currentRun) {
        // New map run — use areaLevel as tier fallback
        const mapInfo = findMap(currentZone);
        store.startMapRun(
          mapInfo?.name ?? currentZone,
          mapInfo?.tier ?? areaLevel ?? null,
          now,
          characterName
        );
      } else if (isBossArena(currentZone)) {
        // Entered boss arena within current map
        store.enterBossArena(now);
      }
    } else if (isHideout(currentZone)) {
      // Returned to hideout — stop timer, await user decision (Clear/Brick)
      if (store.currentRun) {
        store.finishMapRun(now);
      }
    }
    // Town/campaign zones don't end the run — player may portal back
  }, [currentZone, areaLevel]);

  // Track deaths during map runs — use ref to avoid re-counting on re-renders
  useEffect(() => {
    if (lastDeathCountRef.current === null) {
      // Initial mount — set baseline without adding deaths
      lastDeathCountRef.current = sessionDeaths;
      return;
    }

    const delta = sessionDeaths - lastDeathCountRef.current;
    lastDeathCountRef.current = sessionDeaths;

    if (delta > 0) {
      const store = useSpeedrunStore.getState();
      if (store.currentRun) {
        for (let i = 0; i < delta; i++) {
          store.addMapDeath();
        }
      }
    }
  }, [sessionDeaths]);
}
