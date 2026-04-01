import { Store } from "@tauri-apps/plugin-store";

const STORE_NAME = "exiled-orb-store.json";

let storeInstance: Store | null = null;

/** Get the shared store instance (cached) */
export async function getStore(): Promise<Store> {
  if (!storeInstance) {
    storeInstance = await Store.load(STORE_NAME);
  }
  return storeInstance;
}

/** Get the Claude API key from the store */
export async function getApiKey(): Promise<string | null> {
  try {
    const store = await getStore();
    return (await store.get<string>("claude_api_key")) ?? null;
  } catch {
    return null;
  }
}

/** Save the Claude API key to the store */
export async function saveApiKey(key: string): Promise<void> {
  const store = await getStore();
  await store.set("claude_api_key", key);
  await store.save();
}
