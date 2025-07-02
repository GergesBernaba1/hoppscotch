import { Service } from "dioc"
import * as E from "fp-ts/Either"
import { getService } from "~/modules/dioc"

import { PersistenceService } from "~/services/persistence/service"
import { RESTTabService } from "~/services/tab/rest"
import { GQLTabService } from "~/services/tab/graphql"
import { SOAPTabService } from "~/services/tab/soap"
import { KernelInterceptorService } from "~/services/kernel-interceptor.service"

import { platform } from "~/platform"
import { NativeKernelInterceptorService } from "~/platform/std/kernel-interceptors/native"

import { initBackendGQLClient } from "~/helpers/backend/GQLClient"
import { getKernelMode } from "@hoppscotch/kernel"

type InitEvent =
  | { type: "STORE_READY" }
  | { type: "PERSISTENCE_FIRST_READY" }
  | { type: "PERSISTENCE_LATER_READY" }
  | { type: "TABS_READY" }
  | { type: "NATIVE_KERNEL_NETWORKING_READY" }
  | { type: "AUTH_READY" }
  | { type: "BACKEND_CLIENT_READY" }
  | { type: "SYNC_READY" }
  | { type: "ALL_READY" }

/**
 * Service responsible for coordinating the initialization sequence.
 */
export class InitializationService extends Service<InitEvent> {
  public static readonly ID = "INITIALIZATION_SERVICE"

  private _storeInitialized = false
  private _persistenceInitialized = false
  private _tabsInitialized = false
  private _nativeKernelInitialized = false
  private _authInitialized = false
  private _backendClientInitialized = false
  private _syncInitialized = false

  constructor(container: any) {
    super(container)
  }

  async initStore() {
    if (this._storeInitialized) return

    const persistenceService = getService(PersistenceService)
    const result = await persistenceService.init()

    if (E.isLeft(result)) {
      console.error("Store initialization failed:", result.left)
      throw new Error(`Store initialization failed: ${result.left.message}`)
    }

    this._storeInitialized = true
    this.emit({ type: "STORE_READY" })
  }

  async initPersistenceFirst() {
    if (!this._storeInitialized) {
      throw new Error("Cannot initialize persistence before store")
    }

    if (this._persistenceInitialized) return

    const persistenceService = getService(PersistenceService)
    await persistenceService.setupFirst()

    this._persistenceInitialized = true
    this.emit({ type: "PERSISTENCE_FIRST_READY" })
  }

  async initTabs() {
    if (this._tabsInitialized) return

    const restTabService = getService(RESTTabService)
    const gqlTabService = getService(GQLTabService)
    const soapTabService = getService(SOAPTabService)

    await Promise.all([
      restTabService.init(),
      gqlTabService.init(),
      soapTabService.init(),
    ])

    this._tabsInitialized = true
    this.emit({ type: "TABS_READY" })
  }

  async initNativeKernelNetworking() {
    if (this._nativeKernelInitialized) return

    const interceptorService = getService(KernelInterceptorService)
    const nativeInterceptorService = getService(NativeKernelInterceptorService)
    interceptorService.register(nativeInterceptorService)
    interceptorService.setActive("native")

    this._nativeKernelInitialized = true
    this.emit({ type: "NATIVE_KERNEL_NETWORKING_READY" })
  }

  async initAuth() {
    if (this._authInitialized) return

    if (
      getKernelMode() === "desktop" &&
      !this._nativeKernelInitialized
    ) {
      throw new Error(
        "Cannot initialize auth on desktop before native networking"
      )
    }

    if (!this._persistenceInitialized || !this._tabsInitialized) {
      throw new Error("Cannot initialize auth before persistence and tabs")
    }

    await platform.auth.performAuthInit()

    this._authInitialized = true
    this.emit({ type: "AUTH_READY" })
  }

  async initBackendClient() {
    if (this._backendClientInitialized) return

    initBackendGQLClient()

    this._backendClientInitialized = true
    this.emit({ type: "BACKEND_CLIENT_READY" })
  }

  async initPersistenceLater() {
    if (!this._persistenceInitialized) {
      throw new Error("Cannot initialize persistence before store")
    }

    const persistenceService = getService(PersistenceService)
    await persistenceService.setupLater()

    this.emit({ type: "PERSISTENCE_LATER_READY" })
  }

  async initSync() {
    if (this._syncInitialized) return

    await Promise.all([
      platform.sync.settings.initSettingsSync(),
      platform.sync.collections.initCollectionsSync(),
      platform.sync.history.initHistorySync(),
      platform.sync.environments.initEnvironmentsSync(),
      platform.analytics?.initAnalytics(),
    ])

    this._syncInitialized = true
    this.emit({ type: "SYNC_READY" })
  }

  async init() {
    await this.initStore()
    await this.initPersistenceFirst()
    await this.initTabs()
    await this.initNativeKernelNetworking()
    await this.initAuth()
    await this.initBackendClient()
    await this.initSync()
  }

  async initPre() {
    await this.initStore()
    await this.initPersistenceFirst()
    await this.initTabs()
  }

  async initPost() {
    await this.initNativeKernelNetworking()
    await this.initAuth()
    await this.initBackendClient()
    await this.initSync()
  }

  public isInitialized() {
    return this._storeInitialized &&
      this._persistenceInitialized &&
      this._tabsInitialized &&
      this._nativeKernelInitialized &&
      this._authInitialized &&
      this._backendClientInitialized &&
      this._syncInitialized
  }
}
