import { InferredEntity } from "verzod"
/**
 * Defines the structure of a SOAP response
 */
export type HoppSOAPResponse = {
  type: "success" | "fail" | "loading" | "network_fail" | "script_fail" | "extension_error"
  statusCode?: number
  headers?: { key: string; value: string }[]
  body?: string | ArrayBuffer
  error?: Error | unknown
  req?: any // TODO: Fix type when versioned entity types are properly exported
}

/**
 * Type guard to check if a response is a success
 */
export function isSOAPResponseSuccess(response: HoppSOAPResponse): response is HoppSOAPResponse & { type: "success" } {
  return response.type === "success"
}

/**
 * Type guard to check if a response is a failure
 */
export function isSOAPResponseFailure(response: HoppSOAPResponse): response is HoppSOAPResponse & { type: "fail" | "network_fail" | "script_fail" | "extension_error" } {
  return ["fail", "network_fail", "script_fail", "extension_error"].includes(response.type)
}

/**
 * Type guard to check if a response is loading
 */
export function isSOAPResponseLoading(response: HoppSOAPResponse): response is HoppSOAPResponse & { type: "loading" } {
  return response.type === "loading"
}
