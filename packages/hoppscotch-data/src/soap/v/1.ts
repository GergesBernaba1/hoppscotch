import { z } from "zod"
import {
  HOPP_SOAP_AUTH_APIKEY,
  HOPP_SOAP_AUTH_BASIC,
  HOPP_SOAP_AUTH_BEARER, 
  HOPP_SOAP_AUTH_NONE,
  SOAP_VERSION_1_1,
  SOAP_VERSION_1_2,
} from "../constants"

export const HoppSOAPAuthNone = z.object({
  authType: z.literal(HOPP_SOAP_AUTH_NONE),
  authActive: z.boolean(),
})

export const HoppSOAPAuthBasic = z.object({
  authType: z.literal(HOPP_SOAP_AUTH_BASIC),
  authActive: z.boolean(),
  username: z.string(),
  password: z.string(),
})

export const HoppSOAPAuthBearer = z.object({
  authType: z.literal(HOPP_SOAP_AUTH_BEARER),
  authActive: z.boolean(),
  token: z.string(),
})

export const HoppSOAPAuthAPIKey = z.object({
  authType: z.literal(HOPP_SOAP_AUTH_APIKEY),
  authActive: z.boolean(),
  key: z.string(),
  value: z.string(),
  addTo: z.union([z.literal("header"), z.literal("query")]),
})

export const HoppSOAPAuth = z.union([
  HoppSOAPAuthNone,
  HoppSOAPAuthBasic,
  HoppSOAPAuthBearer,
  HoppSOAPAuthAPIKey,
])

export const HoppSOAPHeader = z.object({
  key: z.string(),
  value: z.string(),
  active: z.boolean(),
})

export const HoppSOAPParam = z.object({
  key: z.string(),
  value: z.string(),
  active: z.boolean(),
})

export const HoppSOAPOperation = z.object({
  name: z.string(),
  soapAction: z.string().optional(),
  input: z.string().optional(),
  output: z.string().optional(),
  documentation: z.string().optional(),
})

export const HoppSOAPAttachment = z.object({
  name: z.string(),
  contentType: z.string(),
  contentId: z.string(),
  content: z.union([z.string(), z.instanceof(ArrayBuffer), z.null()]),
  active: z.boolean(),
})

export const schema = z.object({
  v: z.literal("1"),
  name: z.string(),
  endpoint: z.string(),
  wsdlUrl: z.string(),
  soapVersion: z.union([z.literal(SOAP_VERSION_1_1), z.literal(SOAP_VERSION_1_2)]),
  auth: HoppSOAPAuth,
  headers: z.array(HoppSOAPHeader),
  params: z.array(HoppSOAPParam),
  operation: z.string(),
  body: z.string(),
  preRequestScript: z.string(),
  testScript: z.string(),
  attachments: z.array(HoppSOAPAttachment).optional(),
  useMtom: z.boolean().optional(),
})

export default {
  schema,
  initial: true,
  up: (old: any) => old,
  creator(data: any) {
    return {
      v: "1",
      name: data.name || "",
      endpoint: data.endpoint || "",
      wsdlUrl: data.wsdlUrl || "",
      soapVersion: data.soapVersion || SOAP_VERSION_1_1,
      auth: data.auth || { authType: "none", authActive: true },
      headers: data.headers || [],
      params: data.params || [],
      operation: data.operation || "",
      body: data.body || "",
      preRequestScript: data.preRequestScript || "",
      testScript: data.testScript || "",
      attachments: data.attachments || [],
      useMtom: data.useMtom || false,
    }
  },
}
