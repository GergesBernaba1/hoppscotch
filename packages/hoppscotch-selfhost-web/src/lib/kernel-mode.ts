/**
 * This is a proxy for the getKernelMode function from @hoppscotch/kernel
 * Used to avoid direct import issues with the kernel package
 */
export function getKernelMode(): "web" | "desktop" {
  // Check if we're in desktop mode using a safe property check
  return (window as any).__KERNEL_MODE__ === "desktop" ? "desktop" : "web"
}
