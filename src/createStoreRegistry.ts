
import { create, type StoreApi, type UseBoundStore } from "zustand";
import { defaultLoadingState } from "./loadingState";
import { validateConfig } from "./config";

import type { LoadingStateValue } from "./loadingState";
import { defaultPagination } from "./config";
import type { Config, ValidatedConfig, Pagination, Prettify } from "./config";

export type CrudState<T, S> = {
  data: Map<string, T> | null;
  setList: (data: T[] | null) => void;
  patchList: (data: Partial<T>[]) => void;
  updateList: (data: T[]) => void;
  setInstance: (instance: T) => void;
  updateInstance: (instance: T) => void;
  deleteInstance: (instance: T) => void;
  loadingState: { [key: string]: LoadingStateValue };
  setLoadingState: (key: string, value: Partial<LoadingStateValue>) => void;
  state: S;
  patchState: (subState: Partial<S>) => void;
  pagination: Pagination | null;
  setPagination: (partial: Partial<Pagination>) => void;
  selectedIds: string[];
  setSelectedIds: (ids: string[]) => void;
};

// Public state type — conditional fields based on config
type ResolvedCrudState<T, K extends string, C extends Config<K, T>> = Prettify<
  {
    data: Map<string, T> | null;
    setList: (data: T[] | null) => void;
    patchList: (data: Partial<T>[]) => void;
    updateList: (data: T[]) => void;
    setInstance: (instance: T) => void;
    updateInstance: (instance: T) => void;
    deleteInstance: (instance: T) => void;
    loadingState: { [key: string]: LoadingStateValue };
    setLoadingState: (key: string, value: Partial<LoadingStateValue>) => void;
  }
  & ('state' extends keyof C ? {
      state: C['state'] & {};
      patchState: (subState: Partial<C['state'] & {}>) => void;
    } : {})
  & ('pagination' extends keyof C ? {
      pagination: Pagination;
      setPagination: (partial: Partial<Pagination>) => void;
    } : {})
  & ('select' extends keyof C ? {
      selectedIds: string[];
      setSelectedIds: (ids: string[]) => void;
    } : {})
>;

type CrudStoreMethods<T, K extends string, C extends Config<K, T>> = {
  setList: (data: T[] | null) => void;
  patchList: (data: Partial<T>[]) => void;
  updateList: (data: T[]) => void;
  setInstance: (instance: T) => void;
  updateInstance: (instance: T) => void;
  deleteInstance: (instance: T) => void;
}
& ('state' extends keyof C ? {
    patchState: (subState: Partial<C['state'] & {}>) => void;
  } : {})
& ('pagination' extends keyof C ? {
    setPagination: (partial: Partial<Pagination>) => void;
  } : {})
& ('select' extends keyof C ? {
    setSelectedIds: (ids: string[]) => void;
  } : {});

export type CrudStore<
  T,
  K extends string,
  C extends Config<K, T>,
  V extends ValidatedConfig<K, T, C>
> = {
  // Zustand hook — selectors use internal full state type
  (): CrudState<T, C['state'] & {}>;
  <U>(selector: (state: CrudState<T, C['state'] & {}>) => U): U;
  // StoreApi — getState returns conditional public type
  getState: () => ResolvedCrudState<T, K, C>;
  getInitialState: () => ResolvedCrudState<T, K, C>;
  setState: StoreApi<CrudState<T, C['state'] & {}>>['setState'];
  subscribe: StoreApi<CrudState<T, C['state'] & {}>>['subscribe'];
  // Store metadata
  key: K;
  config: V;
  rawConfig: C;
} & CrudStoreMethods<T, K, C>;

export function createStoreRegistry<Models extends Record<string, any>>() {
  const storeRegistry: {
    [K in keyof Models]?: Record<string, any> ;
  } = {};

  function getOrCreateStore<
    K extends Extract<keyof Models, string>,
    C extends Config<K, Models[K]>,
    V extends ValidatedConfig<K, Models[K], C>
  >(
    key: K,
    rawConfig: C
  ): CrudStore<Models[K], K, C, V> {
    if (!storeRegistry[key]) {
      const validated = validateConfig<K, Models[K], C>(rawConfig);
      const { id: mapKey } = validated;

      const zustandStore = create<CrudState<Models[K], C['state']>>((set) => ({
          data: null,
          setList: (list) => set({
            data: list
              ? new Map(list.map((item) => [String((item as Record<string, unknown>)[mapKey]), item]))
              : null,
            selectedIds: [],
          }),
          patchList: (list: Partial<Models[K]>[]) =>
            set((state) => {
              if (!state.data) return {};
              const next = new Map(state.data);
              list.forEach((item) => {
                const id = String((item as Record<string, unknown>)[mapKey]);
                const existing = next.get(id);
                if (existing) { next.set(id, { ...existing, ...item }); }
              });
              return { data: next };
            }),
          updateList: (list: Models[K][]) =>
            set((state) => {
              const next = new Map(state.data || []);
              let newCount = 0;
              list.forEach((item) => {
                const id = String((item as Record<string, unknown>)[mapKey]);
                if (!next.has(id)) newCount++;
                next.set(id, item);
              });
              return {
                data: next,
                ...state.pagination
                  ? { pagination: { ...state.pagination, count: state.pagination.count + newCount } }
                  : {},
              };
            }),
          setInstance: (instance: Models[K]) =>
            set((state) => {
              const id = String((instance as Record<string, unknown>)[mapKey]);
              const next = new Map(state.data || []);
              const isNew = !next.has(id);
              next.set(id, instance);
              return {
                data: next,
                ...state.pagination && isNew
                  ? { pagination: { ...state.pagination, count: state.pagination.count + 1 } }
                  : {},
              };
            }),
          updateInstance: (instance: Models[K]) =>
            set((state) => {
              if (!state.data) return {};
              const id = String((instance as Record<string, unknown>)[mapKey]);
              const next = new Map(state.data);
              const existing = next.get(id);
              next.set(id, existing ? { ...existing, ...instance } : instance as Models[K]);
              return { data: next };
            }),
          deleteInstance: (instance: Models[K]) =>
            set((state) => {
              if (!state.data) return {};
              const id = String((instance as Record<string, unknown>)[mapKey]);
              const next = new Map(state.data);
              next.delete(id);
              return {
                data: next,
                ...state.pagination
                  ? { pagination: { ...state.pagination, count: Math.max(0, state.pagination.count - 1) } }
                  : {},
                selectedIds: state.selectedIds.filter((i) => i !== id),
              };
            }),
          loadingState: {},
          setLoadingState: (key, value) =>
            set((state) => ({
              loadingState: {
                ...state.loadingState,
                [key]: {
                  ...defaultLoadingState,
                  ...state.loadingState[key]
                   ? { ...state.loadingState[key], sequence: state.loadingState[key].sequence + 1 }
                   : {}, ...value },
              },
            })
          ),
          state: rawConfig.state,
          patchState: (subState: Partial<C['state']>) => set(
            (state) => ({
              state: {
                ...state.state || {},
                ...subState,
              }
            })),
          pagination: validated.pagination
            ? { ...defaultPagination, limit: validated.pagination.limit, offset: validated.pagination.offset }
            : null,
          setPagination: (partial: Partial<Pagination>) => set(
            (state) => ({
              pagination: state.pagination
                ? { ...state.pagination, ...partial }
                : null,
            })),
          selectedIds: [] as string[],
          setSelectedIds: (ids: string[]) => set({ selectedIds: ids }),
        }));

      const s = zustandStore.getState();
      const store = Object.assign(
        zustandStore,
        {
          key, config: validated, rawConfig: rawConfig,
          setList: s.setList,
          patchList: s.patchList,
          updateList: s.updateList,
          setInstance: s.setInstance,
          updateInstance: s.updateInstance,
          deleteInstance: s.deleteInstance,
          setPagination: s.setPagination,
          setSelectedIds: s.setSelectedIds,
          patchState: s.patchState,
        },
      ) as unknown as CrudStore<Models[K], K, C, typeof validated>;

      storeRegistry[key] = store;
    }

    return storeRegistry[key] as CrudStore<Models[K], K, C, V>;
  }
  return getOrCreateStore as (
    <
      K extends Extract<keyof Models, string>,
      C extends Config<K, Models[K]>
    >(
      key: K,
      config: C
    ) => CrudStore<Models[K], K, C, ValidatedConfig<K, Models[K], C>>
  );
};