import { useEffect, useCallback } from "react";
import { defaultLoadingState } from "./loadingState";
import type { LoadingStateValue } from "./loadingState";
import type { CrudStore } from "./createStoreRegistry";
import type { Config, ValidatedConfig } from "./config";
import { useActions } from "./useActions";

export type GetFunction = (() => void) & LoadingStateValue;

export function useGet<T, K extends string, C extends Config<K, T>>(
  store: CrudStore<T, K, C, ValidatedConfig<K, T, C>>,
  id?: number | string | null
) {
  const stringId = id != null ? String(id) : null;

  const instance = store((s) =>
    s.data && stringId != null ? s.data.get(stringId) ?? null : null
  );

  const actions = useActions(store);
  const actionGet = (actions as any).get;

  const get = useCallback(() => {
    if (stringId == null || !actionGet) return;
    const idField = store.config.id;
    actionGet({ [idField]: id });
  }, [stringId, actionGet, store, id]);

  // Attach loading state from the action
  Object.assign(get, actionGet ?? defaultLoadingState);

  // Auto-fetch on mount / id change when instance is not in store
  useEffect(() => {
    if (stringId == null || !actionGet) return;
    const state = store.getState();
    if (state.data?.get(stringId)) return;
    if (state.loadingState['get']?.isLoading) return;
    if (state.loadingState['get']?.error) return;
    get();
  }, [stringId, get]);

  return [instance, get] as [T | null, GetFunction];
}
