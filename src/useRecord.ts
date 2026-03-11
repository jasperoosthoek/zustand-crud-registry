import { useMemo } from "react";
import type { CrudStore } from "./createStoreRegistry";
import type { Config, ValidatedConfig } from "./config";

export function useRecord<T, K extends string, C extends Config<K, T>>(
  store: CrudStore<T, K, C, ValidatedConfig<K, T, C>>
): { [key: string]: T } | null {
  const data = store((s) => s.data);
  const dk = store.config.detailKey;
  const sameKey = store.config.detailKey === store.config.id;
  return useMemo(() => {
    if (!data) return null;
    const rec: { [key: string]: T } = Object.create(null);
    if (sameKey) {
      data.forEach((v, k) => { rec[k] = v; });
    } else {
      data.forEach((v) => { rec[String((v as any)[dk])] = v; });
    }
    return rec;
  }, [data]);
}
