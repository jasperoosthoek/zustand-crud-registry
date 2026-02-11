import type { CrudStore } from "./createStoreRegistry";
import type { Config, ValidatedConfig, Pagination } from "./config";

export function usePagination<
  T,
  K extends string,
  C extends Config<K, T>
>(
  store: CrudStore<T, K, C, ValidatedConfig<K, T, C>>
): { pagination: Pagination | null; setPagination: (partial: Partial<Pagination>) => void } {
  const pagination = store((s) => s.pagination);
  const setPagination = store((s) => s.setPagination);
  return { pagination, setPagination };
}
