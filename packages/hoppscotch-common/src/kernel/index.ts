import { KernelAPI, getStoreImpl as kernelGetStoreImpl } from "@hoppscotch/kernel"

export { Io } from "./io"
export { Relay } from "./relay"
export { store } from "./store"

export const getModule = <K extends keyof KernelAPI>(
  name: K
): NonNullable<KernelAPI[K]> => {
  const kernel = window.__KERNEL__
  if (!kernel?.[name]) throw new Error(`Kernel ${name} not initialized`)
  return kernel[name]
}

export const getStoreImpl = kernelGetStoreImpl
