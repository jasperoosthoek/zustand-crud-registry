import { useSelectBase, clipSingle, clipMultiple } from "./useSelectBase";
import type { SingleSelectResult, MultipleSelectResult } from "./useSelectBase";
import type { CrudStore } from "./createStoreRegistry";
import type { Config, ValidatedConfig, Prettify } from "./config";

export type { SelectResultBase, SingleSelectResult, MultipleSelectResult } from "./useSelectBase";

export function useSelect<T, K extends string, C extends Config<K, T> & { select: 'single' }>(
  store: CrudStore<T, K, C, ValidatedConfig<K, T, C>>
): Prettify<SingleSelectResult<T>>;
export function useSelect<T, K extends string, C extends Config<K, T> & { select: 'multiple' }>(
  store: CrudStore<T, K, C, ValidatedConfig<K, T, C>>
): Prettify<MultipleSelectResult<T>>;
export function useSelect<T, K extends string, C extends Config<K, T>>(
  store: CrudStore<T, K, C, ValidatedConfig<K, T, C>>
): Prettify<SingleSelectResult<T>> | Prettify<MultipleSelectResult<T>> {
  const base = useSelectBase(store);
  const mode = store.config.select;
  return mode === 'single' ? clipSingle(base) : clipMultiple(base);
}
