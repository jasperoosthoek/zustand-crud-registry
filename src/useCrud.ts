import { useMemo, useCallback, useEffect } from "react";
import { useActions } from "./useActions";

import type { CrudStore } from "./createStoreRegistry";
import type { Config, ValidatedConfig, ValidConfig, Pagination, Prettify } from "./config"
import type { CustomActionFunctions, ActionFunctions } from "./useActions";

type ConditionalActionFunctions<
  T,
  C extends ValidConfig<T>
> = {
  [K in keyof C['actions'] & keyof ActionFunctions<T>]: ActionFunctions<T>[K];
};

// Mapped types with Extract resolve eagerly (never → {}), unlike
// conditional types which stay deferred and break Prettify flattening.

type PaginationFields<C> = {
  [K in Extract<keyof C, 'pagination'>]: Pagination;
} & {
  [K in Extract<keyof C, 'pagination'> as 'setPagination']: (partial: Partial<Pagination>) => void;
};

type StateFields<C, S> = {
  [K in Extract<keyof C, 'state'> as 'state']: S;
} & {
  [K in Extract<keyof C, 'state'> as 'setState']: (subState: Partial<S>) => void;
};

type ListFields<T, C> = {
  [K in Extract<keyof C, 'includeList'> as 'list']: T[] | null;
};

type RecordFields<T, C> = {
  [K in Extract<keyof C, 'includeRecord'> as 'record']: { [key: string]: T } | null;
};

// Indexed type map: resolves selected to T | null or T[] based on C['select'].
type SelectedTypeMap<T> = {
  single: T | null;
  multiple: T[];
};

// useCrud exposes selected (instance or instances) but NOT selectedIds.
// useSelect is the hook that additionally exposes selectedIds.
type SelectFields<T, C> = {
  [K in Extract<keyof C, 'select'> as 'selected']: SelectedTypeMap<T>[C[K] & keyof SelectedTypeMap<T>];
} & {
  [K in Extract<keyof C, 'select'> as 'select']: (instanceOrId: T | string | number | null) => void;
} & {
  [K in Extract<keyof C, 'select'> as 'toggle']: (instanceOrId: T | string | number) => void;
} & {
  [K in Extract<keyof C, 'select'> as 'clear']: () => void;
};

const toId = <T>(instanceOrId: T | string | number, byKey: string): string =>
  typeof instanceOrId === 'string' || typeof instanceOrId === 'number'
    ? String(instanceOrId)
    : String((instanceOrId as Record<string, unknown>)[byKey]);

export function useCrud<
  T,
  K extends string,
  C extends Config<K, T>
>(
  store: CrudStore<T, K, C, ValidatedConfig<K, T, C>>,
  id?: number | string | null
) {
  const { includeList, includeRecord, select: selectConfig, byKey } = store.config;
  const hasState = store.config.state && Object.keys(store.config.state).length > 0;
  const hasPagination = !!store.config.pagination;

  // Single data subscription — shared by list, record, and select derivations
  const data = store((s) => s.data);

  const list = useMemo(
    () => includeList && data ? Array.from(data.values()) : null,
    [data]
  );
  const record = useMemo(
    () => includeRecord && data ? Object.fromEntries(data) : null,
    [data]
  );

  // Instance by id
  const stringId = id != null ? String(id) : null;
  const instance = useMemo(
    () => data && stringId != null ? data.get(stringId) ?? null : null,
    [data, stringId]
  );

  // Actions
  const actions = useActions(store);
  const actionGet = (actions as { get?: ActionFunctions<T>['get'] }).get;

  // Auto-fetch instance on mount / id change when not in store
  useEffect(() => {
    if (stringId == null || !actionGet) return;
    const state = store.getState();
    if (state.data?.get(stringId)) return;
    if (state.loadingState['get']?.isLoading) return;
    if (state.loadingState['get']?.error) return;
    actionGet({ [store.config.id]: id });
  }, [stringId, actionGet, store, id]);

  // Pagination — stable refs, no extra re-renders when unchanged
  const pagination = store((s) => s.pagination);
  const setPagination = store((s) => s.setPagination);

  // Custom state
  const customState = store((s) => s.state);
  const setCustomState = store((s) => s.setState);

  // Selection
  const selectedIds = store((s) => s.selectedIds);

  const instances = useMemo(() => {
    if (!selectConfig || !data || selectedIds.length === 0) return [];
    return selectedIds
      .map((id: string) => data.get(id))
      .filter(Boolean) as T[];
  }, [data, selectedIds]);

  const selectedInstance = instances[0] ?? null;

  const selectFn = useCallback(
    (instanceOrId: T | string | number | null) => {
      store.getState().setSelectedIds(
        instanceOrId !== null ? [toId(instanceOrId, byKey)] : []
      );
    },
    [store, byKey]
  );

  const toggle = useCallback(
    (instanceOrId: T | string | number) => {
      const toggleId = toId(instanceOrId, byKey);
      const current = store.getState().selectedIds;

      if (selectConfig === 'single') {
        store.getState().setSelectedIds(
          current.includes(toggleId) ? [] : [toggleId]
        );
      } else {
        store.getState().setSelectedIds(
          current.includes(toggleId)
            ? current.filter((i: string) => i !== toggleId)
            : [...current, toggleId]
        );
      }
    },
    [store, byKey, selectConfig]
  );

  const clear = useCallback(
    () => store.getState().setSelectedIds([]),
    [store]
  );

  type V = ValidatedConfig<K, T, C>;
  type S = C['state'];

  return {
    ...includeList ? { list } : {},
    ...includeRecord ? { record } : {},
    ...'get' in store.config.actions ? { instance } : {},
    ...hasPagination ? { pagination, setPagination } : {},
    ...hasState ? { state: customState, setState: setCustomState } : {},
    ...selectConfig ? {
      selected: selectConfig === 'single' ? selectedInstance : instances,
      select: selectFn,
      toggle,
      clear,
    } : {},
    ...actions,
  } as Prettify<
    ConditionalActionFunctions<T, V>
    & ListFields<T, C>
    & PaginationFields<C>
    & StateFields<C, S>
    & CustomActionFunctions<T, V>
    & RecordFields<T, C>
    & SelectFields<T, C>
    & { instance: T | null }
  >;
}
