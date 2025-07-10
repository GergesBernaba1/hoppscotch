/**
 * Service that manages persistence of app state using the kernel store
 */
import * as E from "fp-ts/Either"
import { Service } from "dioc"
import { StoreError } from "@hoppscotch/kernel"
import { store } from "~/kernel/store"
import { Container } from "dioc"
import { useToast } from "~/composables/toast"
import { STORE_KEYS, STORE_NAMESPACE } from "./constants"

export { STORE_KEYS, STORE_NAMESPACE }

export class PersistenceService extends Service {
  public static readonly ID = "PERSISTENCE_SERVICE"

  constructor(container: Container) {
    super(container)
  }

  public showErrorToast(key: string) {
    const toast = useToast()
    toast.error(
      `Schema validation failed for ${STORE_NAMESPACE}:${key}. A backup has been created with suffix '-backup'`
    )
  }

  /**
   * Initialize persistence store
   */
  public async init(): Promise<E.Either<StoreError, void>> {
    try {
      const initResult = await store.init()
      if (E.isLeft(initResult)) {
        console.error("Store initialization failed:", initResult.left)
        return initResult
      }
      return initResult
    } catch (e) {
      console.error("Store initialization error:", e)
      return E.left({
        kind: "storage",
        message: e instanceof Error ? e.message : "Unknown error",
        cause: e,
      })
    }
  }

  /**
   * Sets up initial persistence service
   */
  public async setupFirst(): Promise<void> {
    try {
      // Initialize the store with default values
      await Promise.all([
        this.set("settings", {
          theme: "system",
          language: "en",
          fontSize: 14,
        }),
        this.set("restCollections", []),
        this.set("gqlCollections", []),
        this.set("environments", []),
        this.set("restHistory", []),
        this.set("gqlHistory", []),
        this.set("soapHistory", []),
      ])
    } catch (e) {
      console.error("Failed to setup initial persistence:", e)
      throw e
    }
  }

  /**
   * Sets up later persistence service functionality
   */
  public async setupLater(): Promise<void> {
    // To be implemented in index.ts
  }

  /**
   * Gets a typed value from persistence, deserialization is automatic.
   * No need to use JSON.parse on the result, it's handled internally by the store.
   * @param key The key to retrieve
   * @returns Either containing the typed value or an error
   */
  public async get(
    key: (typeof STORE_KEYS)[keyof typeof STORE_KEYS]
  ): Promise<E.Either<StoreError, unknown>> {
    return await store.get(STORE_NAMESPACE, key)
  }

  /**
   * NOTE: Use this cautiously, try to always use `get`, handling error at call site is better
   * @param key The key to retrieve
   * @returns The typed value or null if not found or on error
   */
  public async getNullable(
    key: (typeof STORE_KEYS)[keyof typeof STORE_KEYS]
  ): Promise<unknown | null> {
    const r = await store.get(STORE_NAMESPACE, key)
    if (E.isLeft(r)) return null
    return r.right ?? null
  }

  /**
   * Sets a value in persistence with proper type safety and automatic serialization.
   * No need to use JSON.stringify on the value, it's handled internally by the store.
   * @param key The key to set
   * @param value The value to set (passed directly without manual serialization)
   * @returns Either containing void or an error
   */
  public async set(
    key: (typeof STORE_KEYS)[keyof typeof STORE_KEYS],
    value: unknown
  ): Promise<E.Either<StoreError, void>> {
    return await store.set(STORE_NAMESPACE, key, value)
  }

  /**
   * Clear config value from persistence
   * @param key The key to remove
   * @returns Either containing boolean or an error
   */
  public async remove(
    key: (typeof STORE_KEYS)[keyof typeof STORE_KEYS]
  ): Promise<E.Either<StoreError, boolean>> {
    return await store.remove(STORE_NAMESPACE, key)
  }

  public async getLocalConfig<T>(
    key: (typeof STORE_KEYS)[keyof typeof STORE_KEYS]
  ): Promise<T | null> {
    const result = await this.get(key)
    return E.isRight(result) ? (result.right as T) : null
  }

  public async setLocalConfig<T>(
    key: (typeof STORE_KEYS)[keyof typeof STORE_KEYS],
    value: T
  ): Promise<void> {
    await this.set(key, value)
  }
}
