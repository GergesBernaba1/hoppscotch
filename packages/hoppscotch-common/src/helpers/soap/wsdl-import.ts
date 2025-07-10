// Helper utility for WSDL parsing
import * as E from "fp-ts/Either"
import { pipe } from "fp-ts/function"
import { XMLParser } from "fast-xml-parser"
import { WSDLOperation, WSDLService } from "./wsdl-parser"

/**
 * Wrap the XML parsing in a try/catch and ensure proper initialization
 * @param wsdlContent The WSDL XML content to parse
 * @returns Either an Error or the parsed WSDL object
 */
export const safeParseWSDL = (wsdlContent: string): E.Either<Error, any> => {
  try {
    // Initialize all variables before using them to avoid temporal dead zone errors
    const parserOptions = {
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      isArray: (name: string) =>
        ["operation", "service", "port"].includes(name),
    }

    // Create parser with options
    const parser = new XMLParser(parserOptions)

    // Parse the content
    const result = parser.parse(wsdlContent)

    return E.right(result)
  } catch (error) {
    return E.left(
      new Error(
        `Failed to parse WSDL: ${error instanceof Error ? error.message : String(error)}`
      )
    )
  }
}

/**
 * Extract operations and services safely from parsed WSDL
 * @param parsedWSDL The parsed WSDL object
 * @returns Object containing operations and services arrays
 */
export const extractWSDLElements = (
  parsedWSDL: any
): {
  operations: WSDLOperation[]
  services: WSDLService[]
  targetNamespace?: string
} => {
  // Default empty results
  const result = {
    operations: [] as WSDLOperation[],
    services: [] as WSDLService[],
    targetNamespace: undefined as string | undefined,
  }

  // Extract target namespace
  if (parsedWSDL?.definitions?.["@_targetNamespace"]) {
    result.targetNamespace = parsedWSDL.definitions["@_targetNamespace"]
  }

  // Extract operations from portType
  if (parsedWSDL?.definitions?.portType) {
    const portTypes = Array.isArray(parsedWSDL.definitions.portType)
      ? parsedWSDL.definitions.portType
      : [parsedWSDL.definitions.portType]

    portTypes.forEach((portType: any) => {
      if (portType.operation) {
        const ops = Array.isArray(portType.operation)
          ? portType.operation
          : [portType.operation]

        ops.forEach((op: any) => {
          result.operations.push({
            name: op["@_name"],
            input: op.input?.["@_message"],
            output: op.output?.["@_message"],
            documentation: op.documentation,
          })
        })
      }
    })
  }

  // Extract soap actions from bindings
  if (parsedWSDL?.definitions?.binding) {
    const bindings = Array.isArray(parsedWSDL.definitions.binding)
      ? parsedWSDL.definitions.binding
      : [parsedWSDL.definitions.binding]

    bindings.forEach((binding: any) => {
      if (binding.operation) {
        const ops = Array.isArray(binding.operation)
          ? binding.operation
          : [binding.operation]

        ops.forEach((op: any) => {
          const existingOpIndex = result.operations.findIndex(
            (o) => o.name === op["@_name"]
          )
          if (existingOpIndex >= 0) {
            // Check for SOAP 1.1 and 1.2 operations
            const soapAction =
              op?.["soap:operation"]?.["@_soapAction"] ||
              op?.["soap12:operation"]?.["@_soapAction"]

            if (soapAction) {
              result.operations[existingOpIndex].soapAction = soapAction
            }
          }
        })
      }
    })
  }

  // Extract services
  if (parsedWSDL?.definitions?.service) {
    const services = Array.isArray(parsedWSDL.definitions.service)
      ? parsedWSDL.definitions.service
      : [parsedWSDL.definitions.service]

    services.forEach((service: any) => {
      const serviceInfo: WSDLService = {
        name: service["@_name"],
        documentation: service.documentation,
      }

      // Get port info
      if (service.port && service.port.length > 0) {
        const port = service.port[0]
        const address = port["soap:address"] || port["soap12:address"]

        if (address) {
          serviceInfo.port = {
            name: port["@_name"],
            binding: port["@_binding"],
            address: address["@_location"],
          }
        }
      }

      result.services.push(serviceInfo)
    })
  }

  return result
}
