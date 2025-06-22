import * as E from "fp-ts/Either"
import { pipe } from "fp-ts/function"
import { Observable, BehaviorSubject, Subscription } from "rxjs"
import { cloneDeep } from "lodash-es"
import { KernelInterceptorService, KernelInterceptorError, ExecutionResult } from "~/services/kernel-interceptor.service"
import { getService } from "~/modules/dioc"
import { RESTRequest } from "~/helpers/kernel/rest/request"
import { RESTResponse } from "~/helpers/kernel/rest/response"
import { RelayResponse } from "@hoppscotch/kernel/src/relay/v/1"
import { HoppRESTSuccessResponse, HoppRESTResponse } from "~/helpers/types/HoppRESTResponse"
import { createMTOMMessage } from "./soap-attachments"
import { HoppSOAPRequest, HoppSOAPResponse } from "@hoppscotch/data"

// Helper to convert File | null to ArrayBuffer | null (async)
async function fileToArrayBuffer(file: File | null): Promise<ArrayBuffer | null> {
  if (!file) return null
  const arrBuf = (file as any).arrayBuffer
  if (arrBuf && typeof arrBuf === 'function') {
    return await (arrBuf as () => Promise<ArrayBuffer>).call(file)
  }
  return null
}

// Helper to convert attachments to SOAPAttachment[] (with ArrayBuffer)
async function convertAttachments(attachments: { name: string; contentType: string; contentId: string; content: string | ArrayBuffer | null; active: boolean }[]): Promise<any[]> {
  return Promise.all(
    attachments.map(async (att) => ({
      ...att,
      content: att.content instanceof File ? await fileToArrayBuffer(att.content) : att.content,
    }))
  )
}

// Helper to validate SOAP envelope
function validateSOAPEnvelope(body: string, soapVersion: string): boolean {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(body, "text/xml")
    
    // Check for XML parsing errors
    const parserError = doc.querySelector("parsererror")
    if (parserError) {
      return false
    }

    // Check for SOAP envelope
    const envelope = doc.querySelector("Envelope")
    if (!envelope) {
      return false
    }

    // Check for SOAP version
    const namespace = envelope.getAttribute("xmlns:soap") || envelope.getAttribute("xmlns")
    if (!namespace) {
      return false
    }

    if (soapVersion === "1.1") {
      return namespace === "http://schemas.xmlsoap.org/soap/envelope/"
    } else if (soapVersion === "1.2") {
      return namespace === "http://www.w3.org/2003/05/soap-envelope"
    }

    return false
  } catch (error) {
    console.error("Error validating SOAP envelope:", error)
    return false
  }
}

export function createSOAPNetworkRequestStream(
  request: HoppSOAPRequest,
  onHistoryUpdate?: (req: HoppSOAPRequest, res: HoppSOAPResponse) => void
): [Observable<HoppSOAPResponse>, () => void] {
  const response = new BehaviorSubject<HoppSOAPResponse>({
    type: "loading",
    req: request,
  })
  
  const req = cloneDeep(request)
  let subscription: Subscription | undefined
  let timeoutId: NodeJS.Timeout | undefined

  const cleanup = () => {
    if (subscription) {
      subscription.unsubscribe()
      subscription = undefined
    }
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = undefined
    }
  }

  const handleError = (error: unknown) => {
    const errorResponse: HoppSOAPResponse = {
      type: "network_fail",
      req,
      error: error instanceof Error ? error : new Error(String(error)),
    }
    response.next(errorResponse)
    onHistoryUpdate?.(req, errorResponse)
    response.complete()
    cleanup()
  }

  (async () => {
    try {
      // Validate SOAP envelope
      if (!validateSOAPEnvelope(req.body, req.soapVersion)) {
        throw new Error("Invalid SOAP envelope")
      }

      let headers = [...req.headers]
      let bodyContent = req.body
      let contentType = req.soapVersion === "1.2" 
        ? "application/soap+xml;charset=UTF-8"
        : "text/xml;charset=UTF-8"
      
      // If using MTOM and has attachments, create the MTOM message
      if (req.useMtom && req.attachments && req.attachments.length > 0) {
        const processedAttachments = await convertAttachments(req.attachments)
        const mtomResult = createMTOMMessage(
          req.body,
          processedAttachments,
          req.soapVersion === "1.1" ? req.operation : undefined
        )
        
        headers = [...headers, ...mtomResult.headers]
        bodyContent = mtomResult.body
        
        // Don't add the Content-Type header as it's already in the MTOM headers
        contentType = ""
      } else if (req.soapVersion === "1.1") {
        // For SOAP 1.1 (not MTOM), add the SOAPAction header if operation is specified
        if (req.operation) {
          headers.push({
            key: "SOAPAction",
            value: `"${req.operation}"`,
            active: true,
          })
        }
      } else {
        // For SOAP 1.2 (not MTOM), add the action parameter to the Content-Type header
        if (req.operation) {
          contentType = `${contentType}; action="${req.operation}"`
        }
      }

      // Add Content-Type header if not already using MTOM
      if (contentType) {
        headers.push({
          key: "Content-Type", 
          value: contentType, 
          active: true
        })
      }

      // Create a REST request from the SOAP request
      const restRequest = {
        method: "POST",
        endpoint: req.endpoint,
        auth: req.auth,
        headers: headers.filter(h => h.active),
        body: bodyContent,
        params: req.params.filter(p => p.active),
        preRequestScript: req.preRequestScript,
        testScript: req.testScript,
      }

      // Use the kernel interceptor service to make the request
      const kernelService = getService(KernelInterceptorService)
      
      // Convert to Kernel request format and execute
      const kernelRequest = await RESTRequest.toRequest(restRequest as any)
      if (!kernelRequest) {
        throw new Error("Failed to create kernel request")
      }
      
      const result = await kernelService.execute(kernelRequest)
      
      result.response.then((res: E.Either<KernelInterceptorError, RelayResponse>) => {
        if (res._tag === "Right") {
          RESTResponse.toResponse(res.right, restRequest as any)
            .then((processedRes: HoppRESTResponse) => {
              if (processedRes.type === "success") {
                // Check for SOAP fault in response
                if (processedRes.body && typeof processedRes.body === "string") {
                  const parser = new DOMParser()
                  const doc = parser.parseFromString(processedRes.body, "text/xml")
                  const fault = doc.querySelector("Fault")
                  
                  if (fault) {
                    const faultResponse: HoppSOAPResponse = {
                      type: "fail",
                      req,
                      statusCode: processedRes.statusCode,
                      headers: processedRes.headers,
                      body: processedRes.body,
                      error: new Error("SOAP Fault received"),
                    }
                    response.next(faultResponse)
                    onHistoryUpdate?.(req, faultResponse)
                    response.complete()
                    cleanup()
                    return
                  }
                }

                const soapResponse: HoppSOAPResponse = {
                  type: "success",
                  req,
                  statusCode: processedRes.statusCode,
                  headers: processedRes.headers,
                  body: processedRes.body,
                }

                response.next(soapResponse)
                onHistoryUpdate?.(req, soapResponse)
              } else {
                const errorResponse = processedRes as HoppSOAPResponse
                response.next(errorResponse)
                
                if (errorResponse.type !== "loading") {
                  onHistoryUpdate?.(req, errorResponse)
                }
              }
              
              response.complete()
              cleanup()
            })
            .catch((error: unknown) => {
              handleError(error)
            })
        } else {
          handleError(res.left)
        }
      }).catch((error: unknown) => {
        handleError(error)
      })

    } catch (error) {
      handleError(error)
    }
  })()

  return [response.asObservable(), cleanup]
}
