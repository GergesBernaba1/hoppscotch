import type { KernelAPI } from "@hoppscotch/kernel"

type KernelMode = 'web' | 'desktop'

declare global {
  interface Window {
    __KERNEL__?: KernelAPI
    __KERNEL_MODE__?: KernelMode
  }
}

export {}
