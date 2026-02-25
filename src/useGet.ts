import { useEffect, useCallback } from "react";
import { defaultLoadingState } from "./loadingState";
import type { LoadingStateValue } from "./loadingState";
import type { CrudStore } from "./createStoreRegistry";
import type { Config, ValidatedConfig } from "./config";
import { useActions, type ActionFunctions } from "./useActions";

export type GetFunction = (() => void) & LoadingStateValue;

export type LookupOptions = { by?: string };

export function useGet<T, K extends string, C extends Config<K, T>>(
  store: CrudStore<T, K, C, ValidatedConfig<K, T, C>>,
  id?: number | string | null,
  options?: LookupOptions
) {
  const by = options?.by ?? store.config.detailKey;
  const useDetailKeyScan = by === store.config.detailKey && store.config.detailKey !== store.config.id;
  const stringId = id != null ? String(id) : null;

  const findByField = (data: Map<string, T> | null, value: any): T | null => {
    if (!data || value == null) return null;
    const strVal = String(value);
    let found: T | null = null;
    data.forEach((item) => {
      if (found) return;
      const field = (item as any)[by];
      if (field === value || String(field) === strVal) found = item;
    });
    return found;
  };

  const instance = store((s) => {
    if (useDetailKeyScan) return findByField(s.data, id);
    return s.data && stringId != null ? s.data.get(stringId) ?? null : null;
  });

  const actions = useActions(store);
  const actionGet = (actions as { get?: ActionFunctions<T>['get'] }).get;

  const get = useCallback(() => {
    if (stringId == null || !actionGet) return;
    actionGet({ [store.config.detailKey]: id });
  }, [stringId, actionGet, store, id]);

  // Attach loading state from the action
  Object.assign(get, actionGet ?? defaultLoadingState);

  // Auto-fetch on mount / id change when instance is not in store.
  // Skip when by !== detailKey — can't build a correct route from a non-detailKey value.
  const canAutoFetch = by === store.config.detailKey;
  useEffect(() => {
    if (!canAutoFetch) return;
    if (stringId == null || !actionGet) return;
    const state = store.getState();
    if (useDetailKeyScan) {
      if (findByField(state.data, id)) return;
    } else {
      if (state.data?.get(stringId)) return;
    }
    if (state.loadingState['get']?.isLoading) return;
    if (state.loadingState['get']?.error) return;
    get();
  }, [stringId, get, canAutoFetch]);

  return [instance, get] as [T | null, GetFunction];
}
