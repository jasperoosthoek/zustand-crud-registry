import type { CrudStore } from "./createStoreRegistry";
import type { Config, ValidatedConfig } from "./config";

export function useCrudState<
  T,
  K extends string,
  C extends Config<K, T>
>(
  store: CrudStore<T, K, C, ValidatedConfig<K, T, C>>
) {
  const state = store((s) => s.state);
  const patchState = store((s) => s.patchState);
  return { state, patchState };
}
