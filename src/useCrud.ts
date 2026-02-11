import { useList } from "./useList";
import { useActions } from "./useActions";
import { usePagination } from "./usePagination";
import { useCrudState } from "./useCrudState";

import type { CrudStore } from "./createStoreRegistry";
import type { Config, ValidatedConfig, ValidConfig, Pagination } from "./config"
import type { CustomActionFunctions, ActionFunctions } from "./useActions";

// Re-export everything from useActions for backwards compatibility
export * from './useActions';

type ConditionalActionFunctions<
  T,
  C extends ValidConfig<T>
> = {
  [K in keyof C['actions'] & keyof ActionFunctions<T>]: ActionFunctions<T>[K];
};

export function useCrud<
  T,
  K extends string,
  C extends Config<K, T>
>(
  store: CrudStore<T, K, C, ValidatedConfig<K, T, C>>,
  options?: {
    skip?: boolean;
    params?: Record<string, string | number | boolean>;
  }
) {
  const list = useList(store);
  const actions = useActions(store);

  const { pagination: paginationConfig } = store.config;
  const pag = paginationConfig && usePagination(store);

  const hasState = store.config.state && Object.keys(store.config.state).length > 0;
  const customState = hasState && useCrudState(store);

  const record = store.config.includeRecord && store((s) => s.record);

  type V = ValidatedConfig<K, T, C>;
  type S = C['state'];

  const output = {
    list,
    ...pag
      ? { pagination: pag.pagination, setPagination: pag.setPagination }
      : {},
    ...store.config.includeRecord ? { record } : {},
    ...customState
      ? { state: customState.state, setState: customState.setState }
      : {},
    ...actions,
  } as {
    list: T[] | null;
    pagination?: Pagination;
    setPagination?: (partial: Partial<Pagination>) => void;
  } & ConditionalActionFunctions<T, V> & (
  keyof S extends never
    ? {}
    : {
        state: S;
        setState: (subState: Partial<S>) => void;
      }
  ) & CustomActionFunctions<T, V>
   & (
      C extends { includeRecord: true }
        ? {record: { [key: string]:  T} | null }
        : {}
    )

  return output;
}
