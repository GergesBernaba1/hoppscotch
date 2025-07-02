import type {
  StorageOptions,
  StoreError,
  StoreEvents,
  StoreEventEmitter,
} from "@hoppscotch/kernel"
import { getStoreImpl } from "@hoppscotch/kernel"

// Use a function to always get the latest store implementation
function impl() {
  return getStoreImpl()
}

export const store = {
  get capabilities() { return impl().capabilities },
  init: (...args: any[]) => impl().init(...args),
  set: (...args: any[]) => impl().set(...args),
  get: (...args: any[]) => impl().get(...args),
  has: (...args: any[]) => impl().has(...args),
  remove: (...args: any[]) => impl().remove(...args),
  clear: (...args: any[]) => impl().clear(...args),
  listNamespaces: (...args: any[]) => impl().listNamespaces(...args),
  listKeys: (...args: any[]) => impl().listKeys(...args),
  watch: (...args: any[]) => impl().watch(...args),
}

export type { StorageOptions, StoreError, StoreEvents, StoreEventEmitter }
