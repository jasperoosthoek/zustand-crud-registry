
import { create, type StoreApi, type UseBoundStore } from "zustand";
import { defaultLoadingState } from "./loadingState";
import { validateConfig } from "./config";

import type { LoadingStateValue } from "./loadingState";
import { defaultPagination } from "./config";
import type { Config, ValidatedConfig, Pagination } from "./config";

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
  setState: (subState: Partial<S>) => void;
  pagination: Pagination | null;
  setPagination: (partial: Partial<Pagination>) => void;
  selectedIds: string[];
  setSelectedIds: (ids: string[]) => void;
};

export type CrudStore<
  T,
  K extends string,
  C extends Config<K, T>,
  V extends ValidatedConfig<K, T, C>
> = UseBoundStore<StoreApi<CrudState<T, Config<K, T>['state']>>> & {
  key: K;
  config: V;
  rawConfig: C;
};

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
      const { byKey } = validated;

      const store: CrudStore<Models[K], K, C, typeof validated> = Object.assign(
        create<CrudState<Models[K], C['state']>>((set) => ({
          data: null,
          setList: (list) => set({
            data: list
              ? new Map(list.map((item) => [String((item as any)[byKey]), item]))
              : null,
            selectedIds: [],
          }),
          patchList: (list: Partial<Models[K]>[]) =>
            set((state) => {
              if (!state.data) return {};
              const next = new Map(state.data);
              list.forEach((item) => {
                const id = String((item as any)[byKey]);
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
                const id = String((item as any)[byKey]);
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
              const id = String((instance as any)[byKey]);
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
              const id = String((instance as any)[byKey]);
              const next = new Map(state.data);
              const existing = next.get(id);
              next.set(id, existing ? { ...existing, ...instance } : instance as Models[K]);
              return { data: next };
            }),
          deleteInstance: (instance: Models[K]) =>
            set((state) => {
              if (!state.data) return {};
              const id = String((instance as any)[byKey]);
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
          setState: (subState: Partial<C['state']>) => set(
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
        })),
        { key, config: validated, rawConfig: rawConfig }
      );
      
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