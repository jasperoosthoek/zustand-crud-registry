import { useList } from "./useList";
import { useActions } from "./useActions";
import { usePagination } from "./usePagination";
import { useCrudState } from "./useCrudState";
import { useSelect } from "./useSelect";

import type { CrudStore } from "./createStoreRegistry";
import type { Config, ValidatedConfig, ValidConfig, Pagination, Prettify } from "./config"
import type { CustomActionFunctions, ActionFunctions } from "./useActions";

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

// When C has 'select' as a key → 6 select fields. When not → {}
type SelectFields<T, C> = {
  [K in Extract<keyof C, 'select'> as 'selected']: T[];
} & {
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

  const { select: selectConfig } = store.config;
  const sel = selectConfig && useSelect(store);

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
    ...sel
      ? {
          selected: sel.selected,
          selectedItem: sel.selectedItem,
          selectedIds: sel.selectedIds,
          select: sel.select,
          toggle: sel.toggle,
          clear: sel.clear,
        }
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
