import { useEffect, useCallback, useMemo } from "react";
import { defaultLoadingState } from "./loadingState";
import type { LoadingStateValue } from "./loadingState";
import type { CrudStore } from "./createStoreRegistry";
import type { Config, ValidatedConfig } from "./config";
import { useActions } from "./useActions";

export type GetListFunction = (() => void) & LoadingStateValue;

export function useGetList<T, K extends string, C extends Config<K, T>>(
  store: CrudStore<T, K, C, ValidatedConfig<K, T, C>>
) {
  const rawData = store((s) => s.data);
  const list = useMemo(
    () => rawData ? Array.from(rawData.values()) : null,
    [rawData]
  );

  const actions = useActions(store);
  const actionGetList = (actions as any).getList;

  const getList = useCallback(() => {
    if (!actionGetList) return;
    actionGetList();
  }, [actionGetList]);

  // Attach loading state from the action
  Object.assign(getList, actionGetList ?? defaultLoadingState);

  // Auto-fetch on mount when no data in store
  useEffect(() => {
    if (!actionGetList) return;
    const state = store.getState();
    if (state.data) return;
    if (state.loadingState['getList']?.isLoading) return;
    if (state.loadingState['getList']?.error) return;
    getList();
  }, [getList]);

  return [list, getList] as [T[] | null, GetListFunction];
}
