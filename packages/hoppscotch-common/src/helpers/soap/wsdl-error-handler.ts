import { HoppSOAPResponse, HoppSOAPRequest } from "@hoppscotch/data"
import * as E from "fp-ts/Either"
import { pipe } from "fp-ts/function"
import * as TE from "fp-ts/TaskEither"
import { XMLParser } from "fast-xml-parser"
import { createSOAPNetworkRequestStream } from "../soap-network"

export class WSDLErrorHandler {
  /**
   * Handle WSDL parsing or fetching errors with a retry mechanism
   * @param wsdlUrl The URL to fetch the WSDL from
   * @param retryCount Number of retries to attempt
   * @returns Either an Error or the successfully fetched WSDL content
   */
  public static async fetchWithRetry(
    wsdlUrl: string,
    retryCount = 3,
    delay = 1000
  ): Promise<E.Either<Error, string>> {
    let attempts = 0
    let lastError: Error | null = null

    while (attempts < retryCount) {
      try {
        const result = await TE.tryCatch(
          async () => {
            // Try to fetch with a timeout
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

            const res = await fetch(wsdlUrl, {
              signal: controller.signal,
              headers: {
                Accept:
                  "text/xml, application/xml, application/soap+xml, text/plain",
              },
              cache: "no-store", // Always fetch fresh WSDL
            })

            clearTimeout(timeoutId)

            // Check for HTTP errors
            if (!res.ok) {
              throw new Error(
                `Failed to fetch WSDL (HTTP ${res.status}): ${res.statusText}`
              )
            }

            const text = await res.text()

            // Simple validation that it looks like WSDL
            if (
              !text.includes("<wsdl:definitions") &&
              !text.includes("<definitions") &&
              !text.includes("xmlns:wsdl=")
            ) {
              throw new Error(
                "The document does not appear to be a valid WSDL file"
              )
            }

            return text
          },
          (err) => new Error(`Failed to fetch WSDL: ${String(err)}`)
        )()

        if (E.isRight(result)) {
          return result
        }

        lastError = result.left
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err))
      }

      // Increase delay with each retry (exponential backoff)
      await new Promise((resolve) =>
        setTimeout(resolve, delay * Math.pow(2, attempts))
      )
      attempts++
    }

    return E.left(
      lastError || new Error("Failed to fetch WSDL after multiple attempts")
    )
  }

  /**
   * Validate a WSDL document for structural issues
   * @param wsdlContent The WSDL XML content to validate
   * @returns Either an Error describing the issue or a boolean indicating success
   */
  public static validateWSDL(wsdlContent: string): E.Either<Error, boolean> {
    try {
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: "@_",
        isArray: (name) => ["operation", "service", "port"].includes(name),
      })

      // Try parsing the XML to check for syntax errors
      const result = parser.parse(wsdlContent)

      // Check for required WSDL elements
      if (!result.definitions) {
        return E.left(new Error("Invalid WSDL: Missing definitions element"))
      }

      // Check for port types (operations)
      const portTypes = result.definitions.portType
      if (!portTypes) {
        return E.left(
          new Error("Invalid WSDL: No port types/operations defined")
        )
      }

      return E.right(true)
    } catch (error) {
      return E.left(new Error(`WSDL XML Parsing Error: ${String(error)}`))
    }
  }

  /**
   * Test a WSDL endpoint with a simple request
   * @param endpoint The endpoint URL to test
   * @param soapVersion The SOAP version to use
   * @returns A Promise with the test result response
   */
  public static async testEndpoint(
    endpoint: string,
    soapVersion: string
  ): Promise<HoppSOAPResponse> {
    // Create a basic SOAP request
    const request: HoppSOAPRequest = {
      v: "1",
      name: "Test WSDL Endpoint",
      endpoint: endpoint,
      wsdlUrl: "",
      soapVersion: soapVersion as any,
      auth: { authType: "none", authActive: true },
      headers: [],
      params: [],
      operation: "",
      body: `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="${
        soapVersion === "1.2"
          ? "http://www.w3.org/2003/05/soap-envelope"
          : "http://schemas.xmlsoap.org/soap/envelope/"
      }">
  <soap:Header></soap:Header>
  <soap:Body>
    <TestConnection xmlns="http://hoppscotch.io/soap/test" />
  </soap:Body>
</soap:Envelope>`,
      preRequestScript: "",
      testScript: "",
    }

    // Send the request
    const [responseStream, _] = createSOAPNetworkRequestStream(request)

    return new Promise((resolve) => {
      const subscription = responseStream.subscribe({
        next: (value) => {
          if (value.type !== "loading") {
            subscription.unsubscribe()
            resolve(value)
          }
        },
      })
    })
  }
}
