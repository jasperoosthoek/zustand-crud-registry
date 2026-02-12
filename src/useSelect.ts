import { useCallback, useMemo } from "react";
import type { CrudStore } from "./createStoreRegistry";
import type { Config, ValidatedConfig } from "./config";

const toId = <T>(instanceOrId: T | string | number, byKey: string): string =>
  typeof instanceOrId === 'string' || typeof instanceOrId === 'number'
    ? String(instanceOrId)
    : String((instanceOrId as any)[byKey]);

export function useSelect<T, K extends string, C extends Config<K, T>>(
  store: CrudStore<T, K, C, ValidatedConfig<K, T, C>>
) {
  const { byKey } = store.config;
  const selectMode = store.config.select; // 'single' | 'multiple'

  const record = store((s) => s.record);
  const selectedIds = store((s) => s.selectedIds);

  const selectedItems = useMemo(() => {
    if (!record || selectedIds.length === 0) return [];
    return selectedIds
      .map((id: string) => record[id])
      .filter(Boolean) as T[];
  }, [record, selectedIds]);

  const selectedItem = selectedItems[0] ?? null;

  const select = useCallback(
    (instanceOrId: T | string | number | null) => {
      store.getState().setSelectedIds(
        instanceOrId !== null ? [toId(instanceOrId, byKey)] : []
      );
    },
    [store, byKey]
  );

  const toggle = useCallback(
    (instanceOrId: T | string | number) => {
      const id = toId(instanceOrId, byKey);
      const current = store.getState().selectedIds;

      if (selectMode === 'single') {
        // Single mode: toggle behaves like select (replace, not add)
        store.getState().setSelectedIds(
          current.includes(id) ? [] : [id]
        );
      } else {
        // Multiple mode: add/remove from selection
        store.getState().setSelectedIds(
          current.includes(id)
            ? current.filter((i: string) => i !== id)
            : [...current, id]
        );
      }
    },
    [store, byKey, selectMode]
  );

  const clear = useCallback(
    () => store.getState().setSelectedIds([]),
    [store]
  );

  return { selectedItems, selectedItem, selectedIds, select, toggle, clear };
}
