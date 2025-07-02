import {
  HoppSOAPRequest,
  HoppSOAPResponse,
} from "@hoppscotch/data"
import { HoppInheritedProperty } from "../types/HoppInheritedProperties"
import { HoppTestResult } from "../types/HoppTestResult"

// SOAP option tabs - similar to REST but for SOAP-specific options
export type SOAPOptionTabs = 
  | "params"
  | "headers" 
  | "authorization"
  | "preRequestScript"
  | "tests"
  | "attachments"
  | "wsdl"
  | "operation"
  | "body"
  | "auth"
  | "pre-request-script"

export type HoppSOAPSaveContext =
  | {
      /**
       * The origin source of the request
       */
      originLocation: "user-collection"
      /**
       * Path to the request folder
       */
      folderPath: string
      /**
       * Index to the request
       */
      requestIndex: number
    }
  | {
      /**
       * The origin source of the request
       */
      originLocation: "team-collection"
      /**
       * ID of the request in the team
       */
      requestID: string
      /**
       * ID of the team
       */
      teamID?: string
      /**
       * ID of the collection loaded
       */
      collectionID?: string
    }
  | null

/**
 * Defines a live SOAP 'document' (something that is open and being edited) in the app
 */
export type HoppSOAPRequestDocument = {
  /**
   * The document type
   */
  type: "request"

  /**
   * The SOAP request as it is in the document
   */
  request: HoppSOAPRequest

  /**
   * Whether the request has any unsaved changes
   * (atleast as far as we can say)
   */
  isDirty: boolean

  /**
   * Info about where this request should be saved.
   * This contains where the request is originated from basically.
   */
  saveContext?: HoppSOAPSaveContext

  /**
   * The response as it is in the document
   * (if any)
   */
  response?: HoppSOAPResponse | null

  /**
   * The test results as it is in the document
   * (if any)
   */
  testResults?: HoppTestResult | null

  /**
   * Response tab preference for the current tab's document
   */
  responseTabPreference?: string

  /**
   * Options tab preference for the current tab's document
   */
  optionTabPreference?: SOAPOptionTabs

  /**
   * The inherited properties from the parent collection
   * (if any)
   */
  inheritedProperties?: HoppInheritedProperty

  /**
   * The function responsible for cancelling the tab request call
   */
  cancelFunction?: () => void
}

/**
 * The different types of SOAP documents that can be opened in tabs
 */
export type HoppSOAPTabDocument = HoppSOAPRequestDocument

/**
 * Checks if the given tab document is a SOAP request document
 */
export function isHoppSOAPRequestDocument(
  doc: HoppSOAPTabDocument
): doc is HoppSOAPRequestDocument {
  return doc.type === "request"
}