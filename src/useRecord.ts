import { useMemo } from "react";
import type { CrudStore } from "./createStoreRegistry";
import type { Config, ValidatedConfig } from "./config";

export function useRecord<T, K extends string, C extends Config<K, T>>(
  store: CrudStore<T, K, C, ValidatedConfig<K, T, C>>
): { [key: string]: T } | null {
  const data = store((s) => s.data);
  return useMemo(() => data ? Object.fromEntries(data) : null, [data]);
}
