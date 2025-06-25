import type { CrudStore } from "./crudStoreRegistry";
import type { Config, ValidatedConfig } from "./config"

export type LoadingStateValue = {
  isLoading: boolean;
  error: any | null;
  response: any | null;
  id: string | number | null | undefined;
  sequence: number;
};

export const defaultLoadingState: LoadingStateValue = {
  isLoading: false,
  error: null,
  response: undefined,
  id: undefined,
  sequence: 0,
};

// Function to use within callbacks
export function getLoadingState<
  T,
  K,
  C extends Config<T>,
  V extends ValidatedConfig<T, C>
>(
  store: CrudStore<T, K, C, V>,
  action: string,
) {
  const state = store.getState();
  return {
    ...defaultLoadingState,
    ...state.loadingState[action] || {}
  } as LoadingStateValue;
}

// Hook
export function useLoadingState<
  T,
  K,
  C extends Config<T>,
  V extends ValidatedConfig<T, C>
>(
  store: CrudStore<T, K, C, V>,
  action: string
): LoadingStateValue {
  return store((s) => s.loadingState[action] || defaultLoadingState);
}

export function setLoadingState<
  T,
  K,
  C extends Config<T>,
  V extends ValidatedConfig<T, C>
>(
  store: CrudStore<T, K, C, V>,
  action: string,
  loadingState: Partial<LoadingStateValue>,
) {
  const state = store.getState();
  state.setLoadingState(action, loadingState);
}

export function initiateAction<
  T,
  K,
  C extends Config<T>,
  V extends ValidatedConfig<T, C>
>(
  store: CrudStore<T, K, C, V>,
  action: string,
  loadingState?: Partial<LoadingStateValue>,
){
  setLoadingState<T, K, C, V>(
    store,
    action,
    {
      isLoading: true,
      error: null,
      response: null,
      id: null,
      ...loadingState || {},
    }
  );
}

export function finishAction<
  T,
  K,
  C extends Config<T>,
  V extends ValidatedConfig<T, C>
>(
  store: CrudStore<T, K, C, V>,
  action: string,
  response: any = null,
){
  setLoadingState<T, K, C, V>(
    store,
    action,
    {
      isLoading: false,
      error: null,
      id: response?.id || null,
      response,
    }
  );
}

export function actionError<
  T,
  K,
  C extends Config<T>,
  V extends ValidatedConfig<T, C>
>(
  store: CrudStore<T, K, C, V>,
  action: string,
  error: any,
){
  setLoadingState<T, K, C, V>(
    store,
    action,
    {
      isLoading: false,
      error,
      response: null,
    }
  );
}