import type { CrudStore } from "./createStoreRegistry";
import type { Config, ValidatedConfig } from "./config";

export function useRecord<T, K extends string, C extends Config<K, T>>(
  store: CrudStore<T, K, C, ValidatedConfig<K, T, C>>
): { [key: string]: T } | null {
  return store((s) => s.record);
}

export function useInstance<T, K extends string, C extends Config<K, T>>(
  store: CrudStore<T, K, C, ValidatedConfig<K, T, C>>,
  id: number | string
): T | null {
  return store((s) => s.record ? s.record[String(id)] ?? null : null);
}
