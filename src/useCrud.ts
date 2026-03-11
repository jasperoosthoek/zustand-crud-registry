import { useMemo, useEffect } from "react";
import { useActions } from "./useActions";
import { useSelectBase } from "./useSelectBase";

import type { CrudStore } from "./createStoreRegistry";
import type { Config, ValidatedConfig, ValidConfig, Pagination, Prettify } from "./config"
import type { CustomActionFunctions, ActionFunctions } from "./useActions";

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
  ? { state: S; patchState: (subState: Partial<S>) => void }
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

export type UseCrudReturn<Store> = (
  Store extends CrudStore<infer T, infer K, infer C, infer _V>
    ? Prettify<
        ConditionalActionFunctions<T, ValidatedConfig<K, T, C>>
        & ListFields<T, C>
        & PaginationFields<C>
        & StateFields<C, C['state']>
        & CustomActionFunctions<T, ValidatedConfig<K, T, C>>
        & RecordFields<T, C>
        & SelectFields<T, C>
        & InstanceFields<T, C>
      >
    : never
);

export function useCrud<
  T,
  K extends string,
  C extends Config<K, T>
>(
  store: CrudStore<T, K, C, ValidatedConfig<K, T, C>>,
  id?: number | string | null,
) {
  const detailKey = store.config.detailKey;
  const useDetailKeyScan = store.config.detailKey !== store.config.id;
  const { includeList, includeRecord, select: selectConfig } = store.config;
  const hasState = store.config.state && Object.keys(store.config.state).length > 0;
  const hasPagination = !!store.config.pagination;

  // Single data subscription — shared by list, record, and select derivations
  const data = store((s) => s.data);

  const list = useMemo(
    () => includeList && data ? Array.from(data.values()) : null,
    [data]
  );
  const sameKey = store.config.detailKey === store.config.id;
  const record = useMemo(() => {
    if (!includeRecord || !data) return null;
    const rec: { [key: string]: T } = Object.create(null);
    if (sameKey) {
      data.forEach((v, k) => { rec[k] = v; });
    } else {
      data.forEach((v) => { rec[String((v as any)[detailKey])] = v; });
    }
    return rec;
  }, [data]);

  // Instance by id
  const stringId = id != null ? String(id) : null;

  const findByDetailKey = (mapData: Map<string, T> | null, value: any): T | null => {
    if (!mapData || value == null) return null;
    const strVal = String(value);
    let found: T | null = null;
    mapData.forEach((item) => {
      if (found) return;
      const field = (item as any)[detailKey];
      if (field === value || String(field) === strVal) found = item;
    });
    return found;
  };

  const instance = useMemo(() => {
    if (useDetailKeyScan) return findByDetailKey(data, id);
    return data && stringId != null ? data.get(stringId) ?? null : null;
  }, [data, stringId, useDetailKeyScan]);

  // Actions
  const actions = useActions(store);
  const actionGet = (actions as { get?: ActionFunctions<T>['get'] }).get;

  // Auto-fetch instance on mount / id change when not in store.
  useEffect(() => {
    if (stringId == null || !actionGet) return;
    const state = store.getState();
    if (useDetailKeyScan) {
      if (findByDetailKey(state.data, id)) return;
    } else {
      if (state.data?.get(stringId)) return;
    }
    if (state.loadingState['get']?.isLoading) return;
    if (state.loadingState['get']?.error) return;
    actionGet({ [detailKey]: id });
  }, [stringId, actionGet, store, id, detailKey]);

  // Pagination — stable refs, no extra re-renders when unchanged
  const pagination = store((s) => s.pagination);
  const setPagination = store((s) => s.setPagination);

  // Custom state
  const customState = store((s) => s.state);
  const setCustomState = store((s) => s.patchState);

  // Selection — delegate to useSelectBase
  const selectBase = useSelectBase(store);

  return {
    ...includeList ? { list } : {},
    ...includeRecord ? { record } : {},
    ...'get' in store.config.actions ? { instance } : {},
    ...hasPagination ? { pagination, setPagination } : {},
    ...hasState ? { state: customState, patchState: setCustomState } : {},
    ...selectConfig ? {
      selected: selectConfig === 'single' ? selectBase.instance : selectBase.instances,
      select: selectBase.select,
      toggle: selectBase.toggle,
      clear: selectBase.clear,
    } : {},
    ...actions,
  } as UseCrudReturn<typeof store>;
}
