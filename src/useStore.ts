import type { CrudStore } from "./createStoreRegistry";
import type { Config, ValidatedConfig } from "./config"

export function useStore<
  T,
  K extends string,
  C extends Config<K, T>
>(
  store: CrudStore<T, K, C, ValidatedConfig<K, T, C>>,
) {
  return store((s) => s);
};