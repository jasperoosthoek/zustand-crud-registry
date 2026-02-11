import { useMemo } from "react";

import type { CrudStore } from "./createStoreRegistry";
import type { Config, ValidatedConfig } from "./config";

export function useList<
  T,
  K extends string,
  C extends Config<K, T>
>(
  store: CrudStore<T, K, C, ValidatedConfig<K, T, C>>
): T[] | null {
  const record = store((s) => s.record);
  return useMemo(() => record ? Object.values(record) : null, [record]);
}
