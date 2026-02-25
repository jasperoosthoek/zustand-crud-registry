import type { Method, AxiosInstance } from "axios";

export type Prettify<T> = { [K in keyof T]: T[K] } & {};

export type OnError = (error: any) => void;

export type DetailRoute = string | ((instance: any, { args, 
   params }: RouteOptions) => string);
export type RouteOptions = {
  args?: any;
  params?: any;
  original?: any;
};
export type Route = string | ((data: any, { args, 
   params }: RouteOptions) => string);

export type PrepareOptions = {
  args?: any;
  params?: any;
}
export type Prepare = (obj: any, options: PrepareOptions) => any;

type PrepareResponseOptions = {
  args: any,
  params: any,
}
interface PrepareDataResponseOptions extends PrepareResponseOptions {
  data: any;
}

export type DetailPrepare = (instance: any) => any;
export type Callback = (responseData: any) => void;

export type AsyncFunction<T> = {
  callback: Callback,
  onError: OnError,
  onResponse: OnResponse | null,
  method: Method;
  prepare: Prepare | null,
  route: Route;
}

export interface AsyncListFunction<T> extends Omit<AsyncFunction<T>, 'prepare'> {}
export interface AsyncDetailFunction<T> extends Omit<AsyncFunction<T>, 'prepare'> {
  prepare: DetailPrepare | null,
};
export type GetListConfig<T> = AsyncListFunction<T>;
export type CreateConfig<T> = AsyncDetailFunction<T>;

export type GetConfig<T> = AsyncDetailFunction<T>;
export type UpdateConfig<T> = AsyncDetailFunction<T>;
export type DeleteConfig<T> = AsyncFunction<T>;

export type OnResponseOptions = PrepareDataResponseOptions;
export type OnResponse = (responseData: any, options: OnResponseOptions) => void;

export interface ValidCustomActionConfig<T> extends AsyncFunction<T> {}

export interface CustomActionConfig<T> extends Partial<Omit<ValidCustomActionConfig<T>, 'route'>> {
  route: Route;
}

export type CustomActions<T> = {
  [action: string]: CustomActionConfig<T>;
}

export type ValidCustomActions<K extends string, T, C extends Config<K, T>> = {
  [K in keyof C['customActions']]: (
    CustomActionConfig<T>
  );
}

export type Pagination = {
  count: number;
  offset: number;
  limit: number;
}

export const defaultPagination: Pagination = { count: 0, offset: 0, limit: 0 };

export type PreparePagination = (responseData: any) => Partial<Pagination>;
export type PreparePaginationParams = (pagination: Pagination) => Record<string, any>;

export type PaginationInputConfig = {
  limit?: number;
  offset?: number;
  prepare?: PreparePagination;
  prepareParams?: PreparePaginationParams;
}

export type PaginationConfig = {
  limit: number;
  offset: number;
  prepare?: PreparePagination;
  prepareParams?: PreparePaginationParams;
}

export type State<T> = {
  [key: string]: any;
}

export type Actions<T> = {
  get?: boolean | Partial<GetConfig<T>>;
  getList?: boolean | Partial<GetListConfig<T>>;
  create?: boolean | Partial<CreateConfig<T>>;
  update?: boolean | Partial<UpdateConfig<T>>;
  delete?: boolean | Partial<DeleteConfig<T>>;
}


export type BaseConfig<T> = {
  actions?: Actions<T>;
  detailKey?: string;
  id?: string;
  state?: State<T>;
  route: Route;
  customActions?: CustomActions<T>;
  axios: AxiosInstance;
  includeList?: boolean;
  includeRecord?: boolean;
  onError?: OnError;
  pagination?: true | PaginationInputConfig;
  select?: 'single' | 'multiple';
};

export interface Config<K extends string, T> extends BaseConfig<T> {}


type ActionKeys<K extends string, T, TConfig extends Config<K, T>> =
  keyof TConfig['actions'];

type ValidatedActionTypes<T> = {
  get: GetConfig<T>;
  getList: GetListConfig<T>;
  create: CreateConfig<T>;
  update: UpdateConfig<T>;
  delete: DeleteConfig<T>;
};

type ActionConfigIfExists<
  K extends string,
  T,
  TConfig extends Config<K, T>,
  TActionName extends keyof Actions<T>
> = TActionName extends ActionKeys<K, T, TConfig>
    ? (TConfig['actions'][TActionName] extends true | object
        ? TActionName extends keyof ValidatedActionTypes<T>
          ? ValidatedActionTypes<T>[TActionName]
          : never
        : never)
      : never;

export type ValidatedConfig<K extends string, T, TConfig extends Config<K, T>> = Prettify<{
  detailKey: string;
  id: string;
  state: {
    [K in keyof TConfig['state']]: TConfig['state'][K];
  };
  axios: AxiosInstance;
  onError: OnError | null;

  actions: {
    [A in Extract<keyof TConfig['actions'], keyof Actions<T>>]: ActionConfigIfExists<K, T, TConfig, A>;
  };

  customActions: ValidCustomActions<K, T, TConfig>;
  route: Route;
  includeList: boolean;
  includeRecord: boolean;
  select: 'single' | 'multiple' | null;
  pagination: PaginationConfig | null;
}>

export const getDetailRoute = (route: Route | null, detailKey: string) => (
  typeof route === 'function'
    ? route
    : (data: any, options?: RouteOptions) => {
        const source = options?.original || data;
        return `${
          route
        }${
          route && route.endsWith('/') ? '' : '/'
        }${
          typeof source === 'object' ? source[detailKey] : source
        }${
          route && route.endsWith('/') ? '/' : ''
        }`;
      }
);

export const validateConfig = <
  K extends string, 
  T,
  C extends Config<K, T>,
>(
  config: C
): ValidatedConfig<K, T, C> => {
  const {
    // The field used to key the internal Map (default: 'id')
    id: configId,
    // The field used in detail routes (default: falls back to id)
    detailKey: configDetailKey,
    state,
    route,
    customActions = {},
    onError = null,
    includeList = false,
    includeRecord = false,
    pagination = null,
  } = config;

  const id = configId ?? 'id';
  const detailKey = configDetailKey ?? id;

  const actions =
    !config.actions
    ? {
        get: true,
        getList: true,
        create: true,
        update: true,
        delete: true,
      }
    : {
      ...config.actions ? config.actions : {},
    } as const;

  const detailRoute = getDetailRoute(route, detailKey);

  const newConfig = {
    detailKey,
    id,
    state: (state || {}) as { [K in keyof C['state']]: C['state'][K] },
    axios: config.axios,
    onError,
    includeList,
    includeRecord,
    actions: {
      ...actions.getList
        ? { getList: {
            method: 'get',
            prepare: null,
            callback: null,
            onError,
            onResponse: null,

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
            onResponse: null,

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
            onResponse: null,

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
            onResponse: null,

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
            onResponse: null,
            route: detailRoute,
            ...typeof actions.delete === 'object' ? actions.delete : {},
          } as DeleteConfig<T>}
        : {},
    },
    select: config.select || null,
    customActions: Object.entries(customActions as CustomActions<T>)
      .reduce(
        (o, [key, action]) => {
          const { method = 'get', onError: onErrorOverride, route, ...rest } = action;
          return {
            ...o,
            [key]: {
              ...rest,
              route,
              onError: onErrorOverride || onError,
              method,
            },
          };
        },
        {} as ValidCustomActions<K, T, C>
      ),
    route,
    pagination: pagination
      ? { limit: 0, offset: 0, ...(pagination === true ? {} : pagination) }
      : null,
  } as ValidatedConfig<K, T, C>

  return newConfig;
}

// This type is only used for creating confitional actions in the hook.
export type ValidConfig<T> = {
  detailKey: string;
  id: string | null;
  state: State<T>;
  axios: AxiosInstance;
  onError: OnError | null;
  actions: {
    get?: GetConfig<T>;
    getList?: GetListConfig<T>;
    create?: CreateConfig<T>;
    update?: UpdateConfig<T>;
    delete?: DeleteConfig<T>;
    }
  customActions?: CustomActions<T>;
  includeList: boolean;
  includeRecord: boolean;
  route?: Route;
  select?: 'single' | 'multiple' | null;
  pagination: PaginationConfig | null;
};
