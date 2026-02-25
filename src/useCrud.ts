import { useMemo, useEffect } from "react";
import { useActions } from "./useActions";
import { useSelectBase } from "./useSelectBase";

import type { CrudStore } from "./createStoreRegistry";
import type { Config, ValidatedConfig, ValidConfig, Pagination, Prettify } from "./config"
import type { CustomActionFunctions, ActionFunctions } from "./useActions";
import type { LookupOptions } from "./useGet";

type ConditionalActionFunctions<
  T,
  C extends ValidConfig<T>
> = {
  [K in keyof C['actions'] & keyof ActionFunctions<T>]: ActionFunctions<T>[K];
};

// Conditional field types: 'configKey' extends keyof C checks presence at
// the call site, resolving eagerly so Prettify can flatten the intersection.
// NOTE: mapped types with Extract + 'as' key remapping don't work on TS 4.9
// (the remapped key leaks through even when Extract yields never).

type ListFields<T, C> = 'includeList' extends keyof C
  ? { list: T[] | null }
  : {};

type RecordFields<T, C> = 'includeRecord' extends keyof C
  ? { record: { [key: string]: T } | null }
  : {};

type PaginationFields<C> = 'pagination' extends keyof C
  ? { pagination: Pagination; setPagination: (partial: Partial<Pagination>) => void }
  : {};

type StateFields<C, S> = 'state' extends keyof C
  ? { state: S; setState: (subState: Partial<S>) => void }
  : {};

type InstanceFields<T, C> = C extends { actions: { get: any } }
  ? { instance: T | null }
  : {};

type SelectedTypeMap<T> = {
  single: T | null;
  multiple: T[];
};

type SelectFields<T, C> = 'select' extends keyof C
  ? {
      selected: SelectedTypeMap<T>[C['select'] & keyof SelectedTypeMap<T>];
      select: (instanceOrId: T | string | number | null) => void;
      toggle: (instanceOrId: T | string | number) => void;
      clear: () => void;
    }
  : {};

export function useCrud<
  T,
  K extends string,
  C extends Config<K, T>
>(
  store: CrudStore<T, K, C, ValidatedConfig<K, T, C>>,
  id?: number | string | null,
  options?: LookupOptions
) {
  const by = options?.by ?? store.config.detailKey;
  const useDetailKeyScan = by === store.config.detailKey && store.config.detailKey !== store.config.id;
  const { includeList, includeRecord, select: selectConfig } = store.config;
  const hasState = store.config.state && Object.keys(store.config.state).length > 0;
  const hasPagination = !!store.config.pagination;

  // Single data subscription — shared by list, record, and select derivations
  const data = store((s) => s.data);

  const list = useMemo(
    () => includeList && data ? Array.from(data.values()) : null,
    [data]
  );
  const dk = store.config.detailKey;
  const record = useMemo(() => {
    if (!includeRecord || !data) return null;
    const rec: { [key: string]: T } = {};
    data.forEach((item) => {
      rec[String((item as any)[dk])] = item;
    });
    return rec;
  }, [data]);

  // Instance by id
  const stringId = id != null ? String(id) : null;

  const findByField = (mapData: Map<string, T> | null, value: any): T | null => {
    if (!mapData || value == null) return null;
    const strVal = String(value);
    let found: T | null = null;
    mapData.forEach((item) => {
      if (found) return;
      const field = (item as any)[by];
      if (field === value || String(field) === strVal) found = item;
    });
    return found;
  };

  const instance = useMemo(() => {
    if (useDetailKeyScan) return findByField(data, id);
    return data && stringId != null ? data.get(stringId) ?? null : null;
  }, [data, stringId, useDetailKeyScan]);

  // Actions
  const actions = useActions(store);
  const actionGet = (actions as { get?: ActionFunctions<T>['get'] }).get;

  // Auto-fetch instance on mount / id change when not in store
  useEffect(() => {
    if (stringId == null || !actionGet) return;
    const state = store.getState();
    if (useDetailKeyScan) {
      if (findByField(state.data, id)) return;
    } else {
      if (state.data?.get(stringId)) return;
    }
    if (state.loadingState['get']?.isLoading) return;
    if (state.loadingState['get']?.error) return;
    actionGet({ [store.config.detailKey]: id });
  }, [stringId, actionGet, store, id]);

  // Pagination — stable refs, no extra re-renders when unchanged
  const pagination = store((s) => s.pagination);
  const setPagination = store((s) => s.setPagination);

  // Custom state
  const customState = store((s) => s.state);
  const setCustomState = store((s) => s.setState);

  // Selection — delegate to useSelectBase
  const selectBase = useSelectBase(store);

  type V = ValidatedConfig<K, T, C>;
  type S = C['state'];

  return {
    ...includeList ? { list } : {},
    ...includeRecord ? { record } : {},
    ...'get' in store.config.actions ? { instance } : {},
    ...hasPagination ? { pagination, setPagination } : {},
    ...hasState ? { state: customState, setState: setCustomState } : {},
    ...selectConfig ? {
      selected: selectConfig === 'single' ? selectBase.instance : selectBase.instances,
      select: selectBase.select,
      toggle: selectBase.toggle,
      clear: selectBase.clear,
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
    & InstanceFields<T, C>
  >;
}
