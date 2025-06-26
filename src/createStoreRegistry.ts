
import { create, type StoreApi, type UseBoundStore } from "zustand";
import { defaultLoadingState } from "./loadingState";
import { validateConfig } from "./config";

import type { LoadingStateValue } from "./loadingState";
import type { Config, ValidatedConfig } from "./config";

export type CrudState<T, S> = {
  record: { [key: string]: T } | null;
  count: number;
  setList: (data: T[]) => void;
  setCount: (count: number) => void;
  setInstance: (instance: T, incrementCount?: boolean) => void;
  updateInstance: (instance: T) => void;
  deleteInstance: (instance: T) => void;
  loadingState: { [key: string]: LoadingStateValue };
  setLoadingState: (key: string, value: Partial<LoadingStateValue>) => void;
  state: S;
  setState: (subState: Partial<S>) => void;
};

export type CrudStore<
  T,
  K extends string,
  C extends Config<K, T>,
  V extends ValidatedConfig<K, T, C>
> = UseBoundStore<StoreApi<CrudState<T, Config<K, T>['state']>>> & {
  key: K;
  config: V;
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
          record: null,
          count: 0,
          setList: (data) => set({ record: Object.fromEntries(data.map((obj) => [obj[byKey], obj]))}),
          setInstance: (instance: Models[K], incrementCount?: boolean) =>
            set((state) => {
              if (!state.record) return {};

              return {
                record: {
                  ...state.record,
                  [instance[byKey]]: instance,
                },
                ...incrementCount ? { count: state.count + 1 } : {}
              };
            }),
          updateInstance: (instance: Models[K]) =>
            set((state) => {
              if (!state.record) return {};

              return {
                record: {
                  ...state.record,
                  [instance[byKey]]: {
                    ...state.record[byKey] || {},
                    ...instance,
                  },
                },
              };
            }),
          deleteInstance: (instance: Models[K]) =>
            set((state) => {
              if (!state.record) return {};

              const newList = { ...state.record };
              if (newList[instance[byKey as string]]) {
                delete newList[instance[byKey as string]];
              }

              return {
                record: newList,
                count: state.count > 0 ? state.count - 1 : 0,
              };
            }),
          setCount: (count) => set({ count }),
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
            }))
        })),
        { key, config: validated } 
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