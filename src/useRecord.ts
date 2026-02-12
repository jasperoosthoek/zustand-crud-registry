import { useMemo } from "react";
import type { CrudStore } from "./createStoreRegistry";
import type { Config, ValidatedConfig } from "./config";

export function useRecord<T, K extends string, C extends Config<K, T>>(
  store: CrudStore<T, K, C, ValidatedConfig<K, T, C>>
): { [key: string]: T } | null {
  const data = store((s) => s.data);
  return useMemo(() => data ? Object.fromEntries(data) : null, [data]);
}

export function useInstance<T, K extends string, C extends Config<K, T>>(
  store: CrudStore<T, K, C, ValidatedConfig<K, T, C>>,
  id: number | string
): T | null {
  return store((s) => s.data ? s.data.get(String(id)) ?? null : null);
}
