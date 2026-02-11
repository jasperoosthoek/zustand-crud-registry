import { useMemo } from "react";
import { defaultLoadingState, initiateAction, finishAction, actionError, getLoadingState } from "./loadingState";

import type { AxiosRequestConfig, Method } from 'axios'
import type { LoadingStateValue } from "./loadingState";
import type { CrudStore } from "./createStoreRegistry";
import type { Config, ValidatedConfig, ValidConfig, AsyncFunction, Route, Pagination, Prettify } from "./config"

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

type ActionProps = Prettify<onResponse & LoadingStateValue>;

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
  [K in keyof C['customActions']]: CustomActionFunction<T>;
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
    url: typeof route === 'function' ? route(original ? original : data, { args, params }) : route,
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
  const loadingState = store((s) => s.loadingState);

  function getAction<T, K extends keyof ActionFunctions<T>, J extends keyof C['customActions'] | undefined>(
    actionKey: K,
    customAction?:J
  ) {
    const loadingStateKey = (actionKey === 'custom' && customAction ? customAction : actionKey) as string

    const act = Object.assign(
    async (...funcArgs: any[]) => {
      const { isLoading } = getLoadingState(store, actionKey);
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
          : (configActions as unknown as any)[actionKey]
       ) as AsyncFunction<T>;

      const paginationState = store.getState().pagination;
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
      })

      const id = data?.id
      await initiateAction(
        store,
        loadingStateKey,
        {
          ...actionKey === 'update' || actionKey === 'delete' ? { id } : {},
        }
      );

      try {
        const response = await axios(mergedAxiosConfig);
        let responseData = response.data;

        const state = store.getState()
        if (actionKey === 'get') {
          await state.setInstance(response.data);

        } else if (actionKey === 'getList') {
          const results = Array.isArray(response.data) ? response.data : response.data.results;
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

        await finishAction(store, loadingStateKey);

        return responseData;
      } catch (error) {
        console.error(error)
        await actionError(store, actionKey, error);
        callIfFunc(actionOnError, error);
        callIfFunc(callerOnError, error);
      }
    },
    loadingState[loadingStateKey] || defaultLoadingState,
  ) as ActionFunctions<T>[K]
  return act;
};

  type V = ValidatedConfig<K, T, C>;

  const actions: Record<string, unknown> = {
    ...'get' in configActions
      ? { get: useMemo(() => getAction<T, 'get', undefined>('get'), []) }
      : {},
    ...'getList' in configActions
      ? { getList: useMemo(() => getAction<T, 'getList', undefined>('getList'), []) }
      : {},
    ...'create' in configActions
      ? { create: useMemo(() => getAction<T, 'create', undefined>('create'), []) }
      : {},
    ...'update' in configActions
      ? { update: useMemo(() => getAction<T, 'update', undefined>('update'), []) }
      : {},
    ...'delete' in configActions
      ? { delete: useMemo(() => getAction<T, 'delete', undefined>('delete'), []) }
      : {},
  }

  // Update loading state properties on stable action refs (every render)
  for (const key of Object.keys(actions)) {
    Object.assign(actions[key] as object, loadingState[key] || defaultLoadingState);
  }

  function buildCustomActions<
    T,
    C extends Config<K, T>,
    V extends ValidatedConfig<K, T, C>
  >(
    store: CrudStore<T, any, C, V>,
    loadingState: Record<string, LoadingStateValue>
  ): CustomActionFunctions<T, V> {
    const entries = Object.keys(store.config.customActions ?? {}) as (keyof C['customActions'])[];

    return entries.reduce((acc, action) => {
      acc[action] = useMemo(
        () => getAction<T, 'custom', typeof action>('custom', action),
        []
      );
      return acc;
    }, {} as CustomActionFunctions<T, V>);
  }
  const customActionConfig = buildCustomActions(store, loadingState);

  // Update loading state properties on stable custom action refs (every render)
  for (const key of Object.keys(customActionConfig)) {
    Object.assign((customActionConfig as Record<string, object>)[key], loadingState[key] || defaultLoadingState);
  }

  return {
    ...actions,
    ...customActionConfig,
  } as ConditionalActionFunctions<T, V> & CustomActionFunctions<T, V>;
}
