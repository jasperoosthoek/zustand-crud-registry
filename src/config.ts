import type { Method, AxiosInstance } from "axios";

export type OnError = (error: any) => void;

export type DetailRoute = string | ((instance: any, { args, 
  // getState,
   params }: RouteOptions) => string);
export type RouteOptions = {
  args?: any;
  params?: any;
  // getState: GetState,
};
export type Route = string | ((data: any, { args, 
  // getState,
   params }: RouteOptions) => string);

export type PrepareOptions = {
  args?: any;
  params?: any;
  // getState: GetState,
}
export type Prepare = (obj: any, options?: PrepareOptions) => any;


type PrepareResponseOptions = {
  args: any,
  params: any,
}
interface PrepareDataResponseOptions extends PrepareResponseOptions {
  data: any;
}
export type PrepareDetailResponse<T> = (responseData: any, options: PrepareDataResponseOptions) => T;
export type PrepareListResponse<T> = (responseData: any, options: PrepareResponseOptions) => T[];

export type DetailPrepare = (instance: any) => any;
export type Callback = (responseData: any) => void;

export type AsyncFunction<T> = {
  callback: Callback,
  onError: OnError,
  method: Method;
  prepare: Prepare | null,
  route: Route;
}

export interface AsyncListFunction<T> extends Omit<AsyncFunction<T>, 'prepare'> {
  prepareResponse: PrepareListResponse<T> | null,
}
export interface AsyncDetailFunction<T> extends Omit<AsyncFunction<T>, 'prepare'> {
  prepare: DetailPrepare | null,
  prepareResponse: PrepareDetailResponse<T> | null,
};
export type GetListConfig<T> = AsyncListFunction<T>;
export type GetAllConfig<T> = AsyncListFunction<T>;
export type CreateConfig<T> = AsyncDetailFunction<T>;

export type GetConfig<T> = AsyncDetailFunction<T>;
export type UpdateConfig<T> = AsyncDetailFunction<T>;
export type DeleteConfig<T> = Omit<AsyncFunction<T>, 'prepareResponse'>;

export type HandleResponseOptions = PrepareDataResponseOptions;
export type HandleResponse = (responseData: any, options: HandleResponseOptions) => void;

export interface ValidCustomActionConfig<T> extends Omit<AsyncFunction<T>, 'prepareResponse'> {
  handleResponse: HandleResponse;
}

export interface CustomActionConfig<T> extends Partial<Omit<ValidCustomActionConfig<T>, 'route'>> {
  route: Route;
}

export type CustomActions<T> = {
  [action: string]: CustomActionConfig<T>;
}

export type ValidCustomActions<T, C extends Config<T>> = {
  [K in keyof C['customActions']]: (
    CustomActionConfig<T>
  );
}

export type State<T> = {
  [key: string]: any;
}

export type Actions<T> = {
  get?: boolean | Partial<GetConfig<T>>;
  getList?: boolean | Partial<GetListConfig<T>>;
  getAll?: boolean | Partial<GetAllConfig<T>>;
  create?: boolean | Partial<CreateConfig<T>>;
  update?: boolean | Partial<UpdateConfig<T>>;
  delete?: boolean | Partial<DeleteConfig<T>>;
  select?: false | 'single' | 'multiple';
}

export type Config<T> = {
  actions?: Actions<T>;
  id?: string;
  parseIdToInt?: boolean;
  byKey?: string;
  state?: State<T>;
  route: Route;
  customActions?: CustomActions<T>;
  axios: AxiosInstance;
  onError?: OnError;
};

type ActionKeys<T, TConfig extends Config<T>> =
  keyof TConfig['actions'];

type ActionConfigIfExists<
  T,
  TConfig extends Config<T>,
  TActionName extends keyof Actions<T>
> = TActionName extends keyof ActionKeys<T, TConfig>
    ? (TConfig['actions'][TActionName] extends true | object ? Actions<T>[TActionName] : never)
      : never;

export type ValidatedConfig<T, TConfig extends Config<T>> = {
  id: string;
  byKey: string;
  parseIdToInt: boolean;
  state: {
    [K in keyof TConfig['state']]: TConfig['state'][K];
  };
  axios: AxiosInstance;
  onError: OnError | null;

actions: {
  [K in Extract<keyof TConfig['actions'], keyof Actions<T>>]: ActionConfigIfExists<T, TConfig, K>;
};

  customActions: ValidCustomActions<T, TConfig>;
  route: Route;
  selectedId?: string,
  selectedIds?: string,
}

export const getDetailRoute = (route: Route | null, id: string) => (
  typeof route === 'function'
    ? route
    : (data: any) =>
      // To do: assertions for data, route and id
      `${
        route
      }${
        route && route.endsWith('/') ? '' : '/'
      }${
        typeof data === 'object' ? data[id] : data
      }${
        route && route.endsWith('/') ? '/' : ''
      }`
);

export const validateConfig = <
  T,
  C extends Config<T>,
>(
  config: C
): ValidatedConfig<T, C> => {
  const {
    // The id to use when perform crud actions
    id = 'id',
    parseIdToInt = false,
    // The key to sort by in the state
    byKey = null,
    state = {},
    route,
    customActions = {},
    onError = null,
  } = config;

  const actions =
    !config.actions
    ? {
        get: true,
        getList: true,
        create: true,
        update: true,
        delete: true,
        select: false,
      }
    : {
      ...config.actions ? config.actions : {},
    } as const;

  const detailRoute = getDetailRoute(route, id);

  const newConfig = {
    id,
    byKey: byKey ? byKey : id,
    parseIdToInt,
    state: state as { [K in keyof C['state']]: C['state'][K] },
    axios: config.axios,
    onError,
    actions: {
      ...actions.getList
        ? { getList: {
            method: 'get',
            prepare: null,
            callback: null,
            onError,
            prepareResponse: null,
            route,
            ...typeof actions.getList === 'object' ? actions.getList : {},
          } as GetListConfig<T>}
        : {},
      ...actions.create
        ? { create: {
            method: 'post',
            prepare: null,
            callback: null,
            onError,
            prepareResponse: null,
            route,
            ...typeof actions.create === 'object' ? actions.create : {},
          } as CreateConfig<T>}
        : {},
      ...actions.get
        ? { get: {
            method: 'get',
            prepare: null,
            callback: null,
            onError,
            prepareResponse: null,
            route: detailRoute,
            ...typeof actions.get === 'object' ? actions.get : {},
          } as GetConfig<T>}
        : {},
      ...actions.update
        ? { update: {
            method: 'patch',
            prepare: null,
            callback: null,
            onError,
            prepareResponse: null,
            route: detailRoute,
            ...typeof actions.update === 'object' ? actions.update : {},
          } as UpdateConfig<T>}
        : {},
      ...actions.delete
        ? { delete: {
            method: 'delete',
            prepare: null,
            callback: null,
            onError,
            route: detailRoute,
            ...typeof actions.delete === 'object' ? actions.delete : {},
          } as DeleteConfig<T>}
        : {},
      ...!actions.select
        ? { select: false }
        : actions.select === 'multiple'
          ? {
              select: 'multiple',
            }
          : {
              select: 'single',
            },
    },
    customActions: Object.entries(customActions as CustomActions<T>)
      .reduce(
        (o, [key, action]) => {
          const { method = 'get', onError: onErrorOverride, route, ...rest } = action;
          return {
            ...o,
            [key]: {
              ...rest,
              onError: onErrorOverride || onError,
              method,
            },
          };
        },
        {} as ValidCustomActions<T, C>
      ),
    route,
  } as ValidatedConfig<T, C>

  return newConfig;
}

// This type is only used for creating confitional actions in the hook.
export type ValidConfig<T> = {
  id: string;
  byKey: string | null;
  parseIdToInt: boolean;
  state: State<T>;
  axios: AxiosInstance;
  onError: OnError | null;
  actions: {
    get?: GetConfig<T>;
    getList?: GetListConfig<T>;
    create?: CreateConfig<T>;
    update?: UpdateConfig<T>;
    delete?: DeleteConfig<T>;
    // select: false | 'single' | 'multiple';
    }
  customActions?: CustomActions<T>;
  route?: Route;
  selectedId?: string,
  selectedIds?: string,
};
