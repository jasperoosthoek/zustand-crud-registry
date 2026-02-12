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
  const data = store((s) => s.data);
  return useMemo(() => data ? Array.from(data.values()) : null, [data]);
}
