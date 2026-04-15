import { useMemo } from "react";
import { defaultLoadingState, initiateAction, finishAction, actionError, getLoadingState } from "./loadingState";

import type { AxiosRequestConfig, Method } from 'axios'
import type { LoadingStateValue } from "./loadingState";
import type { CrudStore, CrudState } from "./createStoreRegistry";
import type { Config, ValidatedConfig, ValidConfig, AsyncFunction, Route, Prettify } from "./config"

export const callIfFunc = (func: any, ...params: any[]) => {
  if (typeof func === 'function') {
    func(...params);
  }
}

export type AsyncFuncProps = {
  params?: any;
  callback?: (data: any) => void;
  onError?: (error: any) => void;
  axiosConfig?: Partial<AxiosRequestConfig>;
  args?: any;
}

export type onResponse = { onResponse?: (data: any) => void };

export type ActionProps = Prettify<onResponse & LoadingStateValue>;

export type InferActionData<A> =
  A extends { route: (data: infer D, ...args: any[]) => any } ? D
  : A extends { prepare: (data: infer D, ...args: any[]) => any } ? D
  : any;

export type CustomActionFunction<T> = ((data?: any, args?: AsyncFuncProps) => Promise<T | void>) & ActionProps

export type ActionFunctions<T> = {
  get: ((data: any, args?: AsyncFuncProps) => Promise<T | void>) & ActionProps;
  getList: ((args?: AsyncFuncProps) => Promise<T[] | void>) & ActionProps;
  create: ((instance: Partial<T>, args?: AsyncFuncProps) => Promise<T | void>) & ActionProps;
  update: ((instance: Partial<T>, args?: AsyncFuncProps) => Promise<T | void>) & ActionProps;
  delete: ((instance: Partial<T>, args?: AsyncFuncProps) => Promise<void>) & ActionProps;
  custom: CustomActionFunction<T>;
};

export type CustomActionFunctions<T, C extends ValidConfig<T>> = {
  [K in keyof C['customActions']]: (
    (data?: InferActionData<C['customActions'][K]>, args?: AsyncFuncProps) => Promise<T | void>
  ) & ActionProps;
};

type ConditionalActionFunctions<
  T,
  C extends ValidConfig<T>
> = {
  [K in keyof C['actions'] & keyof ActionFunctions<T>]: ActionFunctions<T>[K];
};

type GetAxiosConfigProps = {
  method: Method;
  route: Route
  params: any
  data?: any
  original?: any
  axiosConfig?: Partial<AxiosRequestConfig>
  args: any
  prepare?: any
}
const getAxiosConfig = ({
    method,
    route,
    params,
    data,
    original,
    axiosConfig,
    args,
    prepare,
  }: GetAxiosConfigProps) => ({
    ...axiosConfig || {},
    method,
    url: typeof route === 'function' ? route(data, { args, params, original }) : route,
    params,
    ...data
      ? { data: typeof prepare === 'function' ? prepare(data, { args, params }) : data }
      : {},
});


export type SetSubState<T, V extends ValidConfig<T>> = (obj: Partial<V['state']>) => void;

export function useActions<
  T,
  K extends string,
  C extends Config<K, T>
>(
  store: CrudStore<T, K, C, ValidatedConfig<K, T, C>>
) {
  const { axios, actions: configActions, customActions, pagination: paginationConfig } = store.config;
  // Internal full-state access — pagination/setPagination are conditional on
  // CrudStore but always exist on the underlying Zustand store
  const _getState = store.getState as () => CrudState<T, any>;
  const loadingState = store((s) => s.loadingState);

  function getAction<T, K extends keyof ActionFunctions<T>, J extends keyof C['customActions'] | undefined>(
    actionKey: K,
    customAction?:J
  ) {
    const loadingStateKey = (actionKey === 'custom' && customAction ? customAction : actionKey) as string

    const act = Object.assign(
    async (...funcArgs: any[]) => {
      const { isLoading } = getLoadingState(store, loadingStateKey);
      if (isLoading) return;

      const data = funcArgs[0];
      const {
        params,
        callback,
        onError: callerOnError,
        axiosConfig,
        args,
      } = funcArgs[actionKey === 'getList' ? 0 : 1] || {} as AsyncFuncProps;

      const {
        callback: actionCallback,
        onError: actionOnError,
        onResponse: configOnResponse,
        method,
        route,
        prepare,
      } = (
        actionKey === 'custom' && customAction
          ? customActions[customAction]
          : (configActions as Record<string, AsyncFunction<T>>)[actionKey]
       ) as AsyncFunction<T>;

      const paginationState = _getState().pagination;
      const paginationParams = actionKey === 'getList' && paginationConfig?.prepareParams && paginationState
        ? paginationConfig.prepareParams(paginationState)
        : null;

      const mergedParams = paginationParams
        ? { ...paginationParams, ...params }
        : params;

      const mergedAxiosConfig = getAxiosConfig({
        ...actionKey !== 'getList' ? { data } : {},
        method,
        route,
        params: mergedParams,
        axiosConfig,
        args,
        prepare,
        ...actionKey === 'update' && data != null
          ? { original: (() => {
              const mapData = _getState().data;
              if (!mapData) return undefined;
              const idValue = data[store.config.id];
              return idValue != null ? mapData.get(String(idValue)) : undefined;
            })() }
          : {},
      })

      const id = data?.[store.config.detailKey]
      await initiateAction(
        store,
        loadingStateKey,
        {
          ...(
            actionKey === 'get'
            || actionKey === 'update'
            || actionKey === 'delete'
            || (actionKey === 'custom' && typeof id !== 'undefined')
          ) ? { id } : {},
        }
      );

      try {
        const response = await axios(mergedAxiosConfig);
        let responseData = response.data;

        const state = _getState()
        if (actionKey === 'get') {
          await state.setInstance(response.data);

        } else if (actionKey === 'getList') {
          const extractList = paginationConfig?.extractList || ((d: any) => d.data);
          const results = Array.isArray(response.data) ? response.data : extractList(response.data);
          await state.setList(results);
          if (paginationConfig?.prepare) {
            await state.setPagination(paginationConfig.prepare(response.data));
          }
          responseData = results;

        } else if (actionKey === 'create') {
          await state.setInstance(response.data);

        } else if (actionKey === 'update') {
          await state.updateInstance(response.data)

        } else if (actionKey === 'delete') {
          await state.deleteInstance(data)
        }

        callIfFunc(configOnResponse, responseData, { data, args, params });
        callIfFunc(act.onResponse, responseData);
        callIfFunc(actionCallback, responseData);
        callIfFunc(callback, responseData);

        await finishAction(store, loadingStateKey, responseData, id);

        return responseData;
      } catch (error) {
        if (!actionOnError && !callerOnError) {
          console.error(error);
        }
        await actionError(store, loadingStateKey, error);
        callIfFunc(actionOnError, error);
        callIfFunc(callerOnError, error);
      }
    },
    loadingState[loadingStateKey] || defaultLoadingState,
  ) as ActionFunctions<T>[K]
  return act;
};

  type V = ValidatedConfig<K, T, C>;

  // Unconditional useMemo calls — condition is inside, not guarding the hook
  const actionGet = useMemo(() => 'get' in configActions ? getAction<T, 'get', undefined>('get') : null, []);
  const actionGetList = useMemo(() => 'getList' in configActions ? getAction<T, 'getList', undefined>('getList') : null, []);
  const actionCreate = useMemo(() => 'create' in configActions ? getAction<T, 'create', undefined>('create') : null, []);
  const actionUpdate = useMemo(() => 'update' in configActions ? getAction<T, 'update', undefined>('update') : null, []);
  const actionDelete = useMemo(() => 'delete' in configActions ? getAction<T, 'delete', undefined>('delete') : null, []);

  const actions: Partial<ActionFunctions<T>> = {
    ...actionGet ? { get: actionGet } : {},
    ...actionGetList ? { getList: actionGetList } : {},
    ...actionCreate ? { create: actionCreate } : {},
    ...actionUpdate ? { update: actionUpdate } : {},
    ...actionDelete ? { delete: actionDelete } : {},
  };

  // Single useMemo for all custom actions — no hooks inside loops
  const customActionConfig = useMemo(() => {
    const entries = Object.keys(store.config.customActions ?? {}) as (keyof C['customActions'])[];
    return entries.reduce((acc, action) => {
      acc[action] = getAction<T, 'custom', typeof action>('custom', action);
      return acc;
    }, {} as CustomActionFunctions<T, V>);
  }, []);

  // Update loading state properties on stable action refs (every render)
  for (const key of Object.keys(actions) as (keyof ActionFunctions<T>)[]) {
    Object.assign(actions[key]!, loadingState[key] || defaultLoadingState);
  }
  for (const key of Object.keys(customActionConfig)) {
    Object.assign((customActionConfig as Record<string, object>)[key], loadingState[key] || defaultLoadingState);
  }

  return {
    ...actions,
    ...customActionConfig,
  } as ConditionalActionFunctions<T, V> & CustomActionFunctions<T, V>;
}
