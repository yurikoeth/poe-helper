import { create } from "zustand";
import type { MapRun, SpeedrunSession } from "@exiled-orb/shared";
import { computeSessionStats } from "@exiled-orb/shared";

interface SpeedrunState {
  /** Current active map run (null when in hideout/town) */
  currentRun: MapRun | null;
  /** Current grinding session */
  session: SpeedrunSession | null;
  /** Whether the tracker is active */
  tracking: boolean;
  /** Personal best times per map name */
  personalBests: Map<string, number>;
  /** Last completed run (for split display) */
  lastCompletedRun: MapRun | null;

  // Actions
  startSession: (game: string, league: string) => void;
  endSession: () => void;
  startMapRun: (mapName: string, mapTier: number | null, timestamp: number) => void;
  enterBossArena: (timestamp: number) => void;
  completeMapRun: (timestamp: number) => void;
  addMapDeath: () => void;
  abandonMapRun: () => void;
  setTracking: (tracking: boolean) => void;
}

let nextId = 1;
function genId(): string {
  return `${Date.now()}-${nextId++}`;
}

export const useSpeedrunStore = create<SpeedrunState>((set, get) => ({
  currentRun: null,
  session: null,
  tracking: true,
  personalBests: new Map(),
  lastCompletedRun: null,

  startSession: (game, league) => {
    const session: SpeedrunSession = {
      id: genId(),
      game: game as "poe1" | "poe2",
      league,
      startedAt: Date.now(),
      endedAt: null,
      maps: [],
      totalMaps: 0,
      completedMaps: 0,
      totalDeaths: 0,
      totalTimeMs: 0,
      mapsPerHour: null,
      avgMapTimeMs: null,
      chaosPerHour: null,
      fastestMapMs: null,
      slowestMapMs: null,
      fastestMapName: null,
    };
    set({ session });
  },

  endSession: () => {
    set((s) => {
      if (!s.session) return s;
      return {
        session: { ...s.session, endedAt: Date.now() },
        currentRun: null,
      };
    });
  },

  startMapRun: (mapName, mapTier, timestamp) => {
    const state = get();
    // Auto-start session if not running
    if (!state.session) {
      state.startSession("poe2", "Standard");
    }

    const run: MapRun = {
      id: genId(),
      sessionId: state.session?.id ?? "",
      mapName,
      mapTier,
      game: (state.session?.game ?? "poe2") as "poe1" | "poe2",
      league: state.session?.league ?? "Standard",
      startedAt: timestamp,
      bossEnteredAt: null,
      completedAt: null,
      totalMs: null,
      deaths: 0,
      completed: false,
      data: null,
    };
    set({ currentRun: run });
  },

  enterBossArena: (timestamp) => {
    set((s) => {
      if (!s.currentRun) return s;
      return { currentRun: { ...s.currentRun, bossEnteredAt: timestamp } };
    });
  },

  completeMapRun: (timestamp) => {
    set((s) => {
      if (!s.currentRun || !s.session) return s;

      const completedRun: MapRun = {
        ...s.currentRun,
        completedAt: timestamp,
        totalMs: timestamp - s.currentRun.startedAt,
        completed: true,
      };

      const maps = [...s.session.maps, completedRun];
      const stats = computeSessionStats(maps, s.session.startedAt);

      // Update personal best
      const pbs = new Map(s.personalBests);
      const currentPb = pbs.get(completedRun.mapName);
      if (completedRun.totalMs != null && (currentPb == null || completedRun.totalMs < currentPb)) {
        pbs.set(completedRun.mapName, completedRun.totalMs);
      }

      return {
        currentRun: null,
        lastCompletedRun: completedRun,
        personalBests: pbs,
        session: {
          ...s.session,
          maps,
          ...stats,
        },
      };
    });
  },

  addMapDeath: () => {
    set((s) => {
      if (!s.currentRun) return s;
      return { currentRun: { ...s.currentRun, deaths: s.currentRun.deaths + 1 } };
    });
  },

  abandonMapRun: () => {
    set((s) => {
      if (!s.currentRun || !s.session) return s;
      const abandoned = { ...s.currentRun, completed: false };
      const maps = [...s.session.maps, abandoned];
      const stats = computeSessionStats(maps, s.session.startedAt);
      return {
        currentRun: null,
        session: { ...s.session, maps, ...stats },
      };
    });
  },

  setTracking: (tracking) => set({ tracking }),
}));
