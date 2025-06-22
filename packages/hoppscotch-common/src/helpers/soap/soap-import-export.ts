import { SOAPCollection, SOAPFolder, SOAPCollectionRequest } from "~/newstore/SOAPCollection"
import { HoppSOAPRequest } from "@hoppscotch/data"
import { cloneDeep } from "lodash-es"

/**
 * Exports a SOAP collection to a JSON string
 * @param collection The collection to export
 * @returns A JSON string representation of the collection
 */
export function exportSOAPCollection(collection: SOAPCollection): string {
  return JSON.stringify(collection, null, 2)
}

/**
 * Imports a SOAP collection from a JSON string
 * @param jsonData The JSON string to import
 * @returns The imported collection or null if import failed
 */
export function importSOAPCollection(jsonData: string): SOAPCollection | null {
  try {
    const parsedData = JSON.parse(jsonData)
    
    // Validate the imported data
    if (!parsedData || typeof parsedData !== "object") {
      throw new Error("Invalid collection format")
    }
    
    if (!parsedData.id || !parsedData.name || !Array.isArray(parsedData.folders) || !Array.isArray(parsedData.requests)) {
      throw new Error("Collection is missing required properties")
    }
    
    // Create a clean import by running through our data structures
    const collection: SOAPCollection = {
      id: parsedData.id,
      name: parsedData.name,
      folders: [],
      requests: [],
      documentation: parsedData.documentation || undefined
    }
    
    // Process folders (recursively)
    collection.folders = parsedData.folders.map((folder: any) => processImportedFolder(folder))
    
    // Process requests
    collection.requests = parsedData.requests.map((request: any) => processImportedRequest(request))
    
    return collection
  } catch (error) {
    console.error("Failed to import SOAP collection:", error)
    return null
  }
}

/**
 * Process an imported folder
 * @param folderData The raw folder data
 * @returns A properly structured SOAPFolder
 */
function processImportedFolder(folderData: any): SOAPFolder {
  if (!folderData || typeof folderData !== "object") {
    throw new Error("Invalid folder format")
  }
  
  if (!folderData.id || !folderData.name || !Array.isArray(folderData.folders) || !Array.isArray(folderData.requests)) {
    throw new Error("Folder is missing required properties")
  }
  
  return {
    id: folderData.id,
    name: folderData.name,
    folders: folderData.folders.map((subfolder: any) => processImportedFolder(subfolder)),
    requests: folderData.requests.map((request: any) => processImportedRequest(request)),
    documentation: folderData.documentation || undefined
  }
}

/**
 * Process an imported request
 * @param requestData The raw request data
 * @returns A properly structured SOAPCollectionRequest
 */
function processImportedRequest(requestData: any): SOAPCollectionRequest {
  if (!requestData || typeof requestData !== "object") {
    throw new Error("Invalid request format")
  }
  
  if (!requestData.id || !requestData.name || !requestData.request) {
    throw new Error("Request is missing required properties")
  }
  
  // Ensure the request has the required SOAP properties
  const request = requestData.request
  if (!request.endpoint || !request.soapVersion) {
    throw new Error("Request is missing required SOAP properties")
  }
  
  return {
    id: requestData.id,
    name: requestData.name,
    request: cloneDeep(request) as HoppSOAPRequest,
    documentation: requestData.documentation || undefined
  }
}
