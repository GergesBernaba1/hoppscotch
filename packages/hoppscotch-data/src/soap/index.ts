import * as Eq from "fp-ts/Eq"
import * as S from "fp-ts/string"
import { createVersionedEntity, InferredEntity } from "verzod"
import { z } from "zod"
import { lodashIsEqualEq, mapThenEq, undefinedEq } from "../utils/eq"
import cloneDeep from "lodash/cloneDeep"
import V1_VERSION from "./v/1"

// Re-export constants
import {
  HOPP_SOAP_AUTH_NONE,
  HOPP_SOAP_AUTH_BASIC,
  HOPP_SOAP_AUTH_BEARER,
  HOPP_SOAP_AUTH_APIKEY,
  SOAP_AUTH_TYPES,
  SOAP_VERSION_1_1,
  SOAP_VERSION_1_2,
  SOAP_VERSIONS
} from "./constants"

export {
  HOPP_SOAP_AUTH_NONE,
  HOPP_SOAP_AUTH_BASIC,
  HOPP_SOAP_AUTH_BEARER,
  HOPP_SOAP_AUTH_APIKEY,
  SOAP_AUTH_TYPES,
  SOAP_VERSION_1_1,
  SOAP_VERSION_1_2,
  SOAP_VERSIONS
}

export type HoppSOAPAuthNone = {
  authType: typeof HOPP_SOAP_AUTH_NONE
  authActive: boolean
}

export type HoppSOAPAuthBasic = {
  authType: typeof HOPP_SOAP_AUTH_BASIC
  authActive: boolean
  username: string
  password: string
}

export type HoppSOAPAuthBearer = {
  authType: typeof HOPP_SOAP_AUTH_BEARER
  authActive: boolean
  token: string
}

export type HoppSOAPAuthAPIKey = {
  authType: typeof HOPP_SOAP_AUTH_APIKEY
  authActive: boolean
  key: string
  value: string
  addTo: "header" | "query"
}

export type HoppSOAPAuth =
  | HoppSOAPAuthNone
  | HoppSOAPAuthBasic
  | HoppSOAPAuthBearer
  | HoppSOAPAuthAPIKey

export type HoppSOAPHeader = {
  key: string
  value: string
  active: boolean
}

export type HoppSOAPParam = {
  key: string
  value: string
  active: boolean
}

export type HoppSOAPOperation = {
  name: string
  soapAction?: string
  input?: string
  output?: string
  documentation?: string
}

const versionedObject = z.object({
  v: z.string().regex(/^\d+$/).transform(Number),
})

export const HoppSOAPRequest = createVersionedEntity({
  latestVersion: 1,
  versionMap: {
    1: V1_VERSION,
  },
  getVersion(data) {
    const versionCheck = versionedObject.safeParse(data)
    return versionCheck.success ? versionCheck.data.v : null
  },
})

export type HoppSOAPRequest = InferredEntity<typeof HoppSOAPRequest>

export function makeSOAPRequest(req?: Partial<HoppSOAPRequest>): HoppSOAPRequest {
  const defaultReq = V1_VERSION.schema.parse({
    v: "1",
    name: "",
    endpoint: "",
    wsdlUrl: "",
    soapVersion: SOAP_VERSION_1_1,
    auth: { authType: "none", authActive: true },
    headers: [],
    params: [],
    operation: "",
    body: "",
    preRequestScript: "",
    testScript: "",
    attachments: [],
    useMtom: false,
  })

  return {
    ...defaultReq,
    ...req,
  }
}

export type HoppSOAPResponse = {
  type: "success" | "fail" | "loading" | "network_fail" | "script_fail" | "extension_error"
  statusCode?: number
  headers?: HoppSOAPHeader[]
  body?: string | ArrayBuffer
  error?: Error | unknown
  req?: HoppSOAPRequest
}

export function cloneSOAPRequest(req: HoppSOAPRequest): HoppSOAPRequest {
  return cloneDeep(req)
}

export type HoppSOAPAttachment = {
  name: string
  contentType: string
  contentId: string
  content: string | ArrayBuffer | null
  active: boolean
}

export * from "./v/1"
