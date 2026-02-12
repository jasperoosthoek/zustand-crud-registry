import { useList } from "./useList";
import { useActions } from "./useActions";
import { usePagination } from "./usePagination";
import { useCrudState } from "./useCrudState";
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

// Mapped types with Extract resolve eagerly (never → {}), unlike
// conditional types which stay deferred and break Prettify flattening.

type PaginationFields<C> = {
  [K in Extract<keyof C, 'pagination'>]: Pagination;
} & {
  [K in Extract<keyof C, 'pagination'> as 'setPagination']: (partial: Partial<Pagination>) => void;
};

type StateFields<C, S> = {
  [K in Extract<keyof C, 'state'> as 'state']: S;
} & {
  [K in Extract<keyof C, 'state'> as 'setState']: (subState: Partial<S>) => void;
};

type ListFields<T, C> = {
  [K in Extract<keyof C, 'includeList'> as 'list']: T[] | null;
};

type RecordFields<T, C> = {
  [K in Extract<keyof C, 'includeRecord'> as 'record']: { [key: string]: T } | null;
};

// Indexed type map: resolves selected to T | null or T[] based on C['select'].
type SelectedTypeMap<T> = {
  single: T | null;
  multiple: T[];
};

// useCrud exposes selected (instance or instances) but NOT selectedIds.
// useSelect is the hook that additionally exposes selectedIds.
type SelectFields<T, C> = {
  [K in Extract<keyof C, 'select'> as 'selected']: SelectedTypeMap<T>[C[K] & keyof SelectedTypeMap<T>];
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
) {
  const list = store.config.includeList && useList(store);
  const actions = useActions(store);

  const { pagination: paginationConfig } = store.config;
  const pag = paginationConfig && usePagination(store);

  const hasState = store.config.state && Object.keys(store.config.state).length > 0;
  const customState = hasState && useCrudState(store);

  const data = store.config.includeRecord && store((s) => s.data);
  const record = data ? Object.fromEntries(data) : (data === false ? undefined : null);

  const selectConfig = store.config.select;
  const base = selectConfig && useSelectBase(store);
  const sel = base && selectConfig
    ? {
        selected: selectConfig === 'single' ? base.instance : base.instances,
        select: base.select,
        toggle: base.toggle,
        clear: base.clear,
      }
    : null;

  type V = ValidatedConfig<K, T, C>;
  type S = C['state'];

  return {
    ...store.config.includeList ? { list } : {},
    ...pag
      ? { pagination: pag.pagination, setPagination: pag.setPagination }
      : {},
    ...store.config.includeRecord ? { record } : {},
    ...customState
      ? { state: customState.state, setState: customState.setState }
      : {},
    ...sel ? sel : {},
    ...actions,
  } as Prettify<
    ConditionalActionFunctions<T, V>
    & ListFields<T, C>
    & PaginationFields<C>
    & StateFields<C, S>
    & CustomActionFunctions<T, V>
    & RecordFields<T, C>
    & SelectFields<T, C>
  >;
}
