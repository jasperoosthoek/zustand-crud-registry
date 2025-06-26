import { useMemo } from "react";
import { defaultLoadingState, initiateAction, finishAction, actionError, getLoadingState } from "./loadingState";

import type { AxiosRequestConfig, Method } from 'axios'
import type { LoadingStateValue } from "./loadingState";
import type { CrudStore } from "./createStoreRegistry";
import type { Config, ValidatedConfig, ValidConfig, AsyncFunction, Route } from "./config"

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

export type SideEffects = { sideEffects?: (data: any) => void };

type CustomActionFunction<T> = ((data?: any, args?: AsyncFuncProps) => Promise<T | void>) & SideEffects & LoadingStateValue

export type ActionFunctions<T> = {
  get: ((data: any, args?: AsyncFuncProps) => Promise<T | void>) & SideEffects & LoadingStateValue;
  getList: ((args?: AsyncFuncProps) => Promise<T[] | void>) & SideEffects & LoadingStateValue;
  create: ((instance: Partial<T>, args?: AsyncFuncProps) => Promise<T | void>) & SideEffects & LoadingStateValue;
  update: ((instance: Partial<T>, args?: AsyncFuncProps) => Promise<T | void>) & SideEffects & LoadingStateValue;
  delete: ((instance: Partial<T>, args?: AsyncFuncProps) => Promise<void>) & SideEffects & LoadingStateValue;
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

export function useCrud<
  T,
  K extends string,
  C extends Config<K, T>
>(
  store: CrudStore<T, K, C, ValidatedConfig<K, T, C>>,
  options?: {
    skip?: boolean;
    params?: Record<string, string | number | boolean>;
  }
) {
  const record = store((s) => s.record);
  const setList = store((s) => s.setList);
  const count = store((s) => s.count);
  const stateData = store((s) => s.state);
  const setState = store((s) => s.setState);
  const loadingState = store((s) => s.loadingState);
  const { axios, actions: configActions, customActions } = store.config;
  
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
        method,
        route,
        prepare,
      } = (
        actionKey === 'custom' && customAction
          ? customActions[customAction]
          : (configActions as unknown as any)[actionKey]
       ) as AsyncFunction<T>;

      const mergedAxiosConfig = getAxiosConfig({
        ...actionKey !== 'getList' ? { data } : {},
        method,
        route,
        params,
        axiosConfig, 
        args,
        prepare,
      });

      const id = data?.id
      await initiateAction(
        store,
        loadingStateKey,
        {
          ...actionKey === 'update' || actionKey === 'delete' ? { id } : {},
        }
      );

      const sleep = (delay: number) => new Promise((resolve) => setTimeout(resolve, delay))
      
      try {
        const response = await axios(mergedAxiosConfig);
        await sleep(500)
        let responseData = response.data;
        
        const state = store.getState()
        if (actionKey === 'get') {
          await state.setInstance(response.data);

        } else if (actionKey === 'getList') {
          const results = Array.isArray(response.data) ? response.data : response.data.results;
          const count = response.data.count ?? results.length;
          await state.setList(results);
          await state.setCount(count);
          responseData = results;

        } else if (actionKey === 'create') {
          await state.setInstance(response.data, true);

        } else if (actionKey === 'update') {
          await state.updateInstance(response.data)

        } else if (actionKey === 'delete') {
          await state.deleteInstance(data)
        }
        
        await finishAction(store, loadingStateKey); 
        callIfFunc(act.sideEffects, responseData);
        callIfFunc(actionCallback, responseData);
        callIfFunc(callback, responseData);

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
  type S = C['state'];

  const actions: Record<string, unknown> = {
    ...'get' in configActions
      ? { get: useMemo(() => getAction<T, 'get', undefined>('get'), [loadingState.get]) }
      : {},
    ...'getList' in configActions
      ? { getList: useMemo(() => getAction<T, 'getList', undefined>('getList'), [loadingState.getList]) }
      : {},
    ...'create' in configActions
      ? { create: useMemo(() => getAction<T, 'create', undefined>('create'), [loadingState.create]) }
      : {},
    ...'update' in configActions
      ? { update: useMemo(() => getAction<T, 'update', undefined>('update'), [loadingState.update]) }
      : {},
    ...'delete' in configActions
      ? { delete: useMemo(() => getAction<T, 'delete', undefined>('delete'), [loadingState.delete]) }
      : {},
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
        [loadingState[action as string]]
      );
      return acc;
    }, {} as CustomActionFunctions<T, V>);
  }
  const customActionConfig = buildCustomActions(store, loadingState);

  const output = {
    list: record ? Object.values(record) : null,
    setList,
    count,
    ...store.config.includeRecord ? { record } : {},
    ...store.config.state
      ? {
        state: stateData,
        setState,
      } : {},
    ...actions,
    ...customActionConfig,
  } as {
    list: T[] | null;
    setList: (record: T[]) => void;
    count: number;
  } & ConditionalActionFunctions<T, V> & (
  keyof S extends never
    ? {}
    : {
        state: S;
        setState: (subState: Partial<S>) => void;
      }
  ) & CustomActionFunctions<T, V> 
   & (
      C extends { includeRecord: true }
        ? {record: { [key: string]:  T} } | null
        : {}
    )

  return output;
}
