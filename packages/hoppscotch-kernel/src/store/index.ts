import { v1 } from './v/1'
import { STORE_IMPLS as WEB_STORE_IMPLS } from './impl/web'
import { STORE_IMPLS as DESKTOP_STORE_IMPLS } from './impl/desktop'
import { getKernelMode } from '../index'

export type {
    StoreV1,
} from './v/1'

export const VERSIONS = {
    v1,
} as const

export const latest = v1

export const STORE_IMPLS = {
    web: WEB_STORE_IMPLS,
    desktop: DESKTOP_STORE_IMPLS,
} as const

export function getStoreImpl() {
    const mode = getKernelMode()
    return STORE_IMPLS[mode].v1.api
}
