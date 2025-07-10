import { Service } from "dioc"
import { store } from "~/kernel/store"
// import type { RelayRequest } from "@hoppscotch/kernel"
type RelayRequest = any // Temporary fix for missing types
import * as E from "fp-ts/Either"
import {
  InputDomainSetting,
  convertDomainSetting,
} from "~/helpers/functional/domain-settings"

const STORE_NAMESPACE = "interceptors.native.v1"

const STORE_KEYS = {
  SETTINGS: "settings",
} as const

interface StoredData {
  version: string
  domains: Record<string, InputDomainSetting>
  lastUpdated: string
}

const defaultDomainConfig: InputDomainSetting = {
  version: "v1",
  security: {
    verifyHost: true,
    verifyPeer: true,
  },
  proxy: undefined,
}

export class KernelInterceptorNativeStore extends Service {
  public static readonly ID = "KERNEL_NATIVE_INTERCEPTOR_STORE"
  private static readonly GLOBAL_DOMAIN = "*"
  private static readonly DEFAULT_GLOBAL_SETTINGS: InputDomainSetting = {
    ...defaultDomainConfig,
    version: "v1",
  }

  private domainSettings = new Map<string, InputDomainSetting>()

  async onServiceInit(): Promise<void> {
    const initResult = await store.init()
    if ((initResult as any)._tag === "Left") {
      console.error(
        "[NativeStore] Failed to initialize store:",
        (initResult as any).left
      )
      return
    }

    await this.loadStore()
    this.setupWatchers()
  }

  private async loadStore(): Promise<void> {
    const loadResult = await store.get(STORE_NAMESPACE, STORE_KEYS.SETTINGS)

    if ((loadResult as any)._tag === "Right" && (loadResult as any).right) {
      const storedData = (loadResult as any).right as StoredData
      this.domainSettings = new Map(Object.entries(storedData.domains))
    }

    if (!this.domainSettings.has(KernelInterceptorNativeStore.GLOBAL_DOMAIN)) {
      this.domainSettings.set(
        KernelInterceptorNativeStore.GLOBAL_DOMAIN,
        KernelInterceptorNativeStore.DEFAULT_GLOBAL_SETTINGS
      )
      await this.persistStore()
    }
  }

  private setupWatchers() {
    store
      .watch(STORE_NAMESPACE, STORE_KEYS.SETTINGS)
      .on("change", async ({ value }: { value: any }) => {
        if (value) {
          const storeData = value as StoredData
          this.domainSettings = new Map(Object.entries(storeData.domains))
        }
      })
  }

  private async persistStore(): Promise<void> {
    const storeData: StoredData = {
      version: "v1",
      domains: Object.fromEntries(this.domainSettings),
      lastUpdated: new Date().toISOString(),
    }

    const saveResult = await store.set(
      STORE_NAMESPACE,
      STORE_KEYS.SETTINGS,
      storeData
    )
    if ((saveResult as any)._tag === "Left") {
      console.error(
        "[AgentStore] Failed to save store:",
        (saveResult as any).left
      )
    }
  }

  private mergeSecurity(
    ...settings: (Required<InputDomainSetting>["security"] | undefined)[]
  ): Required<InputDomainSetting>["security"] | undefined {
    return settings.reduce(
      (acc, setting) => (setting ? { ...acc, ...setting } : acc),
      undefined as Required<RelayRequest>["security"] | undefined
    )
  }

  private mergeProxy(
    ...settings: (Required<InputDomainSetting>["proxy"] | undefined)[]
  ): Required<InputDomainSetting>["proxy"] | undefined {
    return settings.reduce(
      (acc, setting) => (setting ? { ...acc, ...setting } : acc),
      undefined as Required<InputDomainSetting>["proxy"] | undefined
    )
  }

  private getMergedSettings(domain: string): InputDomainSetting {
    const domainSettings = this.domainSettings.get(domain)
    const globalSettings =
      domain !== KernelInterceptorNativeStore.GLOBAL_DOMAIN
        ? this.domainSettings.get(KernelInterceptorNativeStore.GLOBAL_DOMAIN)
        : undefined

    const result = {
      security: this.mergeSecurity(
        globalSettings?.security,
        domainSettings?.security
      ),
      proxy: this.mergeProxy(globalSettings?.proxy, domainSettings?.proxy),
    }

    return { version: "v1", ...result }
  }

  public completeRequest(
    request: Omit<RelayRequest, "proxy" | "security">
  ): RelayRequest {
    const host = new URL(request.url).host
    const settings = this.getMergedSettings(host)
    const effective = convertDomainSetting(settings)

    if (E.isLeft(effective)) {
      throw effective.left
    }

    return { ...request, ...effective.right }
  }

  public getDomainSettings(domain: string): InputDomainSetting {
    return (
      this.domainSettings.get(domain) ?? {
        ...defaultDomainConfig,
        version: "v1",
      }
    )
  }

  public async saveDomainSettings(
    domain: string,
    settings: Partial<InputDomainSetting>
  ): Promise<void> {
    const updatedSettings: InputDomainSetting = {
      ...settings,
      version: "v1",
    }

    this.domainSettings.set(domain, updatedSettings)
    await this.persistStore()
  }

  public async clearDomainSettings(domain: string): Promise<void> {
    this.domainSettings.delete(domain)
    await this.persistStore()
  }

  public getDomains(): string[] {
    return Array.from(this.domainSettings.keys())
  }

  public getAllDomainSettings(): Map<string, InputDomainSetting> {
    return new Map(this.domainSettings)
  }
}
