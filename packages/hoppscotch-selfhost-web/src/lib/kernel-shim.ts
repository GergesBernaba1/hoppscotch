/**
 * This file serves as a shim for the @hoppscotch/kernel package
 * It provides the essential functions and types needed by the application
 */

// Basic types from kernel
export interface Version {
  major: number
  minor: number
  patch: number
}

export interface KernelInfo {
  name: string
  version: Version
  capabilities: string[]
}

export interface KernelAPI {
  info: KernelInfo
  io: any
  relay: any
  store: any
}

export type KernelMode = 'web' | 'desktop'

// Utility functions
export function getKernelMode(): KernelMode {
  return (window as any).__KERNEL_MODE__ === "desktop" ? "desktop" : "web"
}

const createStore = () => ({
  capabilities: new Set(['permanent', 'structured', 'watch', 'namespace']),
  async init() {
    return { right: undefined }
  },
  async set(namespace: string, key: string, value: any) {
    try {
      const fullKey = `${namespace}:${key}`
      const persistenceService = (window as any).__PERSISTENCE_SERVICE__
      if (!persistenceService) throw new Error('Persistence service not initialized')
      const result = await persistenceService.set(key, value)
      if ('left' in result) throw new Error(result.left.message)
      return { right: undefined }
    } catch (e) {
      return { left: { kind: 'storage', message: e instanceof Error ? e.message : 'Unknown error', cause: e } }
    }
  },
  async get<T>(namespace: string, key: string) {
    try {
      const persistenceService = (window as any).__PERSISTENCE_SERVICE__
      if (!persistenceService) throw new Error('Persistence service not initialized')
      const result = await persistenceService.get(key)
      if ('left' in result) throw new Error(result.left.message)
      return { right: result.right as T }
    } catch (e) {
      return { left: { kind: 'storage', message: e instanceof Error ? e.message : 'Unknown error', cause: e } }
    }
  },
  async has(namespace: string, key: string) {
    try {
      const persistenceService = (window as any).__PERSISTENCE_SERVICE__
      if (!persistenceService) throw new Error('Persistence service not initialized')
      const result = await persistenceService.get(key)
      return { right: !('left' in result) && result.right !== undefined }
    } catch (e) {
      return { left: { kind: 'storage', message: e instanceof Error ? e.message : 'Unknown error', cause: e } }
    }
  },
  async remove(namespace: string, key: string) {
    try {
      const persistenceService = (window as any).__PERSISTENCE_SERVICE__
      if (!persistenceService) throw new Error('Persistence service not initialized')
      const result = await persistenceService.remove(key)
      if ('left' in result) throw new Error(result.left.message)
      return { right: result.right }
    } catch (e) {
      return { left: { kind: 'storage', message: e instanceof Error ? e.message : 'Unknown error', cause: e } }
    }
  },
  async clear(namespace?: string) {
    try {
      const persistenceService = (window as any).__PERSISTENCE_SERVICE__
      if (!persistenceService) throw new Error('Persistence service not initialized')
      if (namespace) {
        const result = await persistenceService.remove(namespace)
        if ('left' in result) throw new Error(result.left.message)
      } else {
        // Clear all namespaces
        const namespaces = await this.listNamespaces()
        if ('left' in namespaces && namespaces.left) throw new Error(namespaces.left.message)
        await Promise.all(namespaces.right.map(ns => persistenceService.remove(ns)))
      }
      return { right: undefined }
    } catch (e) {
      return { left: { kind: 'storage', message: e instanceof Error ? e.message : 'Unknown error', cause: e } }
    }
  },
  async listNamespaces() {
    try {
      const persistenceService = (window as any).__PERSISTENCE_SERVICE__
      if (!persistenceService) throw new Error('Persistence service not initialized')
      // For now, we only have one namespace
      return { right: ['persistence.v1'] }
    } catch (e) {
      return { left: { kind: 'storage', message: e instanceof Error ? e.message : 'Unknown error', cause: e } }
    }
  },
  async listKeys(namespace: string) {
    try {
      const persistenceService = (window as any).__PERSISTENCE_SERVICE__
      if (!persistenceService) throw new Error('Persistence service not initialized')
      // For now, we only have one namespace
      if (namespace !== 'persistence.v1') return { right: [] }
      // We don't have a way to list all keys yet
      return { right: [] }
    } catch (e) {
      return { left: { kind: 'storage', message: e instanceof Error ? e.message : 'Unknown error', cause: e } }
    }
  },
  watch(namespace: string, key: string) {
    return {
      on: (event: string, handler: (payload: any) => void) => {
        // No-op for now
        return () => {}
      },
      once: (event: string, handler: (payload: any) => void) => {
        // No-op for now
        return () => {}
      },
      off: (event: string, handler: (payload: any) => void) => {
        // No-op for now
      }
    }
  }
})

export function initKernel(mode?: KernelMode): KernelAPI {
  const kernel: KernelAPI = {
    info: {
      name: mode === 'desktop' ? "desktop-kernel" : "web-kernel",
      version: { major: 1, minor: 0, patch: 0 },
      capabilities: ["basic-io"]
    },
    io: {},
    relay: {},
    store: createStore()
  }
  
  ;(window as any).__KERNEL__ = kernel
  return kernel
}

export function getModule<K extends keyof KernelAPI>(
  name: K
): NonNullable<KernelAPI[K]> {
  const kernel = (window as any).__KERNEL__
  if (!kernel?.[name]) throw new Error(`Kernel ${name} not initialized`)
  return kernel[name]
}

export function getStoreImpl() {
  const mode = getKernelMode()
  const kernel = (window as any).__KERNEL__
  if (!kernel?.store) throw new Error('Kernel store not initialized')
  return kernel.store
}

// Media type constants
export enum MediaType {
  APPLICATION_JSON = "application/json",
  APPLICATION_XML = "application/xml",
  APPLICATION_FORM = "application/x-www-form-urlencoded",
  MULTIPART_FORM_DATA = "multipart/form-data",
  TEXT_PLAIN = "text/plain",
  TEXT_HTML = "text/html",
  TEXT_XML = "text/xml",
  APPLICATION_JAVASCRIPT = "application/javascript",
  APPLICATION_EDI = "application/EDI-X12",
  APPLICATION_YAML = "application/yaml",
}

// Content helpers
export const content = {
  json: (content: any, mediaType: MediaType) => ({
    kind: "json",
    content,
    mediaType
  })
}

// Body helpers
export const body = {
  json: (data: any) => ({
    type: "json",
    data
  })
}

// Relay adapter
export function relayRequestToNativeAdapter(request: any): any {
  return request
}
