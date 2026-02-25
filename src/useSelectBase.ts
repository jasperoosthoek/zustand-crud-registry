import { useCallback, useMemo } from "react";
import type { CrudStore } from "./createStoreRegistry";
import type { Config, ValidatedConfig } from "./config";

export const toId = <T>(instanceOrId: T | string | number, id: string): string =>
  typeof instanceOrId === 'string' || typeof instanceOrId === 'number'
    ? String(instanceOrId)
    : String((instanceOrId as Record<string, unknown>)[id]);

// ── Types ──────────────────────────────────────────────────────────

/** Internal base — all computed values before clipping. */
export type SelectResultBase<T> = {
  instances: T[];
  instance: T | null;
  ids: string[];
  select: (instanceOrId: T | string | number | null) => void;
  toggle: (instanceOrId: T | string | number) => void;
  clear: () => void;
};

export type SingleSelectResult<T> = {
  selected: T | null;
  selectedId: string | null;
  select: (instanceOrId: T | string | number | null) => void;
  toggle: (instanceOrId: T | string | number) => void;
  clear: () => void;
};

export type MultipleSelectResult<T> = {
  selected: T[];
  selectedIds: string[];
  select: (instanceOrId: T | string | number | null) => void;
  toggle: (instanceOrId: T | string | number) => void;
  clear: () => void;
};

// ── Hook ───────────────────────────────────────────────────────────

export function useSelectBase<T, K extends string, C extends Config<K, T>>(
  store: CrudStore<T, K, C, ValidatedConfig<K, T, C>>
): SelectResultBase<T> {
  const { id } = store.config;
  const selectMode = store.config.select;

  const data = store((s) => s.data);
  const selectedIds = store((s) => s.selectedIds);

  const instances = useMemo(() => {
    if (!data || selectedIds.length === 0) return [];
    return selectedIds
      .map((id: string) => data.get(id))
      .filter(Boolean) as T[];
  }, [data, selectedIds]);

  const instance = instances[0] ?? null;

  const select = useCallback(
    (instanceOrId: T | string | number | null) => {
      store.getState().setSelectedIds(
        instanceOrId !== null ? [toId(instanceOrId, id)] : []
      );
    },
    [store, id]
  );

  const toggle = useCallback(
    (instanceOrId: T | string | number) => {
      const toggleId = toId(instanceOrId, id);
      const current = store.getState().selectedIds;

      if (selectMode === 'single') {
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
    [store, id, selectMode]
  );

  const clear = useCallback(
    () => store.getState().setSelectedIds([]),
    [store]
  );

  return { instances, instance, ids: selectedIds, select, toggle, clear };
}

// ── Clip functions ─────────────────────────────────────────────────

export function clipSingle<T>(base: SelectResultBase<T>): SingleSelectResult<T> {
  return {
    selected: base.instance,
    selectedId: base.ids[0] ?? null,
    select: base.select,
    toggle: base.toggle,
    clear: base.clear,
  };
}

export function clipMultiple<T>(base: SelectResultBase<T>): MultipleSelectResult<T> {
  return {
    selected: base.instances,
    selectedIds: base.ids,
    select: base.select,
    toggle: base.toggle,
    clear: base.clear,
  };
}
