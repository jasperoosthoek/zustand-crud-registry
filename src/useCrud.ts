import { useCallback } from "react";
import { useList } from "./useList";
import { useActions } from "./useActions";
import { usePagination } from "./usePagination";
import { useCrudState } from "./useCrudState";

import type { CrudStore } from "./createStoreRegistry";
import type { Config, ValidatedConfig, ValidConfig, Pagination, Prettify } from "./config"
import type { CustomActionFunctions, ActionFunctions } from "./useActions";

const toId = <T>(instanceOrId: T | string | number, byKey: string): string =>
  typeof instanceOrId === 'string' || typeof instanceOrId === 'number'
    ? String(instanceOrId)
    : String((instanceOrId as any)[byKey]);

type ConditionalActionFunctions<
  T,
  C extends ValidConfig<T>
> = {
  [K in keyof C['actions'] & keyof ActionFunctions<T>]: ActionFunctions<T>[K];
};

// Mapped types resolve with generics (conditional types don't).
// When C has 'pagination' as a key → produces { pagination: ...; setPagination: ... }
// When C doesn't → iterates over never → produces {}
type PaginationFields<C> = {
  [K in Extract<keyof C, 'pagination'>]: Pagination;
} & {
  [K in Extract<keyof C, 'pagination'> as 'setPagination']: (partial: Partial<Pagination>) => void;
};

// When C has 'state' as a key → { state: S; setState: ... }. When not → {}
type StateFields<C, S> = {
  [K in Extract<keyof C, 'state'> as 'state']: S;
} & {
  [K in Extract<keyof C, 'state'> as 'setState']: (subState: Partial<S>) => void;
};

// When C has 'includeRecord' as a key → { record: ... }. When not → {}
type RecordFields<T, C> = {
  [K in Extract<keyof C, 'includeRecord'> as 'record']: { [key: string]: T } | null;
};

// When C has 'select' as a key → 5 select fields (no selectedItems — use useSelect for that).
// selectedItem uses a zustand selector: referentially stable, only re-renders when the
// specific selected instance changes.
type SelectFields<T, C> = {
  [K in Extract<keyof C, 'select'> as 'selectedItem']: T | null;
} & {
  [K in Extract<keyof C, 'select'> as 'selectedIds']: string[];
} & {
  [K in Extract<keyof C, 'select'> as 'select']: (instanceOrId: T | string | number | null) => void;
} & {
  [K in Extract<keyof C, 'select'> as 'toggle']: (instanceOrId: T | string | number) => void;
} & {
  [K in Extract<keyof C, 'select'> as 'clear']: () => void;
};

export function useCrud<
  T,
  K extends string,
  C extends Config<K, T>
>(
  store: CrudStore<T, K, C, ValidatedConfig<K, T, C>>,
  // options?: {
  //   skip?: boolean;
  //   params?: Record<string, string | number | boolean>;
  // }
) {
  const list = useList(store);
  const actions = useActions(store);

  const { pagination: paginationConfig } = store.config;
  const pag = paginationConfig && usePagination(store);

  const hasState = store.config.state && Object.keys(store.config.state).length > 0;
  const customState = hasState && useCrudState(store);

  const record = store.config.includeRecord && store((s) => s.record);

  const { select: selectConfig, byKey } = store.config;

  // Zustand selector — referentially stable, only re-renders when the selected instance changes
  const selectedItem = selectConfig
    ? store((s) =>
        s.selectedIds.length > 0 && s.record
          ? s.record[s.selectedIds[0]] ?? null
          : null
      )
    : undefined;

  const selectedIds = selectConfig
    ? store((s) => s.selectedIds)
    : undefined;

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
      const id = toId(instanceOrId, byKey);
      const current = store.getState().selectedIds;

      if (selectConfig === 'single') {
        store.getState().setSelectedIds(
          current.includes(id) ? [] : [id]
        );
      } else {
        store.getState().setSelectedIds(
          current.includes(id)
            ? current.filter((i: string) => i !== id)
            : [...current, id]
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

  const output = {
    list,
    ...pag
      ? { pagination: pag.pagination, setPagination: pag.setPagination }
      : {},
    ...store.config.includeRecord ? { record } : {},
    ...customState
      ? { state: customState.state, setState: customState.setState }
      : {},
    ...selectConfig
      ? { selectedItem, selectedIds, select: selectFn, toggle, clear }
      : {},
    ...actions,
  } as Prettify<
    { list: T[] | null }
    & ConditionalActionFunctions<T, V>
    & PaginationFields<C>
    & StateFields<C, S>
    & CustomActionFunctions<T, V>
    & RecordFields<T, C>
    & SelectFields<T, C>
  >

  return output;
}
