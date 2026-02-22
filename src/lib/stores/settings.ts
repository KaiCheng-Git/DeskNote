import { writable } from "svelte/store";
import { Store } from "@tauri-apps/plugin-store";

export type TabId = "todo" | "notes" | "worklog" | "settings";

export const activeTab = writable<TabId>("todo");
export const opacity = writable<number>(0.85);
export const desktopMode = writable<boolean>(false);

// Map of card id → collapsed boolean (false = expanded)
export const cardCollapsed = writable<Record<string, boolean>>({
  todo: false,
  notes: true,
  worklog: true,
  settings: true,
});

let store: Store | null = null;

async function getStore() {
  if (!store) store = await Store.load(".settings.dat");
  return store;
}

export async function loadSettings() {
  const s = await getStore();
  const savedOpacity = await s.get<number>("opacity");
  const savedDesktopMode = await s.get<boolean>("desktopMode");
  const savedCardCollapsed = await s.get<Record<string, boolean>>("cardCollapsed");
  if (savedOpacity != null) opacity.set(savedOpacity);
  if (savedDesktopMode != null) desktopMode.set(savedDesktopMode);
  if (savedCardCollapsed != null) cardCollapsed.set(savedCardCollapsed);
}

export async function saveOpacity(value: number) {
  opacity.set(value);
  const s = await getStore();
  await s.set("opacity", value);
  await s.save();
}

export async function saveDesktopMode(value: boolean) {
  desktopMode.set(value);
  const s = await getStore();
  await s.set("desktopMode", value);
  await s.save();
}

export async function saveCardCollapsed(map: Record<string, boolean>) {
  cardCollapsed.set(map);
  const s = await getStore();
  await s.set("cardCollapsed", map);
  await s.save();
}
