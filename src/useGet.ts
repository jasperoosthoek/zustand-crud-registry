import { useEffect, useCallback } from "react";
import { defaultLoadingState } from "./loadingState";
import type { LoadingStateValue } from "./loadingState";
import type { CrudStore } from "./createStoreRegistry";
import type { Config, ValidatedConfig } from "./config";
import { useActions, type ActionFunctions } from "./useActions";

export type GetFunction = (() => void) & LoadingStateValue;

export function useGet<T, K extends string, C extends Config<K, T>>(
  store: CrudStore<T, K, C, ValidatedConfig<K, T, C>>,
  id?: number | string | null,
) {
  const detailKey = store.config.detailKey;
  const useDetailKeyScan = store.config.detailKey !== store.config.id;
  const stringId = id != null ? String(id) : null;

  const findByDetailKey = (data: Map<string, T> | null, value: any): T | null => {
    if (!data || value == null) return null;
    const strVal = String(value);
    let found: T | null = null;
    data.forEach((item) => {
      if (found) return;
      const field = (item as any)[detailKey];
      if (field === value || String(field) === strVal) found = item;
    });
    return found;
  };

  const instance = store((s) => {
    if (useDetailKeyScan) return findByDetailKey(s.data, id);
    return s.data && stringId != null ? s.data.get(stringId) ?? null : null;
  });

  const actions = useActions(store);
  const actionGet = (actions as { get?: ActionFunctions<T>['get'] }).get;

  const get = useCallback(() => {
    if (stringId == null || !actionGet) return;
    actionGet({ [detailKey]: id });
  }, [stringId, actionGet, id, detailKey]);

  // Attach loading state from the action
  Object.assign(get, actionGet ?? defaultLoadingState);

  // Auto-fetch on mount / id change when instance is not in store.
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

  return [instance, get] as [T | null, GetFunction];
}
