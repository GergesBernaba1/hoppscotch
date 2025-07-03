import * as E from "fp-ts/Either"

import { Observable, BehaviorSubject, Subscription } from "rxjs"
import { cloneDeep } from "lodash-es"
import { KernelInterceptorService, KernelInterceptorError } from "~/services/kernel-interceptor.service"
import { getService } from "~/modules/dioc"
import { RESTRequest } from "~/helpers/kernel/rest/request"
import { RESTResponse } from "~/helpers/kernel/rest/response"
import { RelayResponse, RelayError } from "@hoppscotch/kernel/src/relay/v/1"
import { HoppRESTResponse } from "~/helpers/types/HoppRESTResponse"
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

// Enhanced SOAP response processing with better error handling
function checkForSOAPFault(responseBody: string): { isFault: boolean, faultCode?: string, faultString?: string } {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(responseBody, "text/xml")
    
    // Look for SOAP fault in either SOAP 1.1 or 1.2 format
    const fault = doc.querySelector("Fault") || 
                  doc.querySelector("soap\\:Fault") || 
                  doc.querySelector("soapenv\\:Fault") ||
                  doc.querySelector("SOAP-ENV\\:Fault")
    
    if (fault) {
      // Try to extract fault details for better error reporting
      const faultCode = fault.querySelector("faultcode")?.textContent || 
                        fault.querySelector("soap\\:Code")?.textContent ||
                        "Unknown fault code"
      
      const faultString = fault.querySelector("faultstring")?.textContent || 
                          fault.querySelector("soap\\:Reason")?.textContent ||
                          "SOAP Fault received"
      
      return {
        isFault: true,
        faultCode,
        faultString
      }
    }
    
    return { isFault: false }
  } catch (e) {
    console.error("Error checking for SOAP fault:", e)
    return { isFault: false }
  }
}

// Process SOAP response and check for faults
function processSOAPResponse(res: HoppRESTResponse, req: HoppSOAPRequest): HoppSOAPResponse {
  // Convert headers safely with proper typing
  const convertHeaders = (headers: any[]) => {
    return headers.map((h: {key: string, value: string}) => ({ 
      key: h.key, 
      value: h.value, 
      active: true 
    }))
  }
  
  console.log("Processing SOAP response:", {
    type: res.type,
    statusCode: res.type === "success" ? res.statusCode : undefined,
    bodyType: res.body ? (typeof res.body) : "empty"
  })
  
  // If it's not a success response, return the error with as much info as possible
  if (res.type !== "success") {
    const errorResponse: HoppSOAPResponse = {
      type: "fail",
      req,
      error: new Error(res.type === "fail" ? res.error.message : "Network failure"),
      // Also include any status code and headers if available
      statusCode: res.statusCode,
      // Include the body if available (may contain error details)
      body: res.body || "Error: " + (res.type === "fail" ? res.error.message : "Network failure")
    }
    
    // If we have headers, include them in the error response
    if (res.headers) {
      errorResponse.headers = convertHeaders(res.headers)
    }
    
    console.log("Returning error response with details:", errorResponse)
    return errorResponse
  }

  // It's a success response, check for SOAP faults
  if (res.body && typeof res.body === "string") {
    const faultCheck = checkForSOAPFault(res.body)
    
    if (faultCheck.isFault) {
      console.log("SOAP Fault detected:", faultCheck)
      
      // Create a formatted fault message to highlight in the body
      const faultMessage = `SOAP Fault: ${faultCheck.faultCode} - ${faultCheck.faultString}`;
      
      // Enhance the body with a comment to make the error more visible in the UI
      // but preserve the original SOAP response for reference
      let enhancedBody = res.body;
      
      // Add comment at the top to highlight the error
      enhancedBody = `<!-- ${faultMessage} -->\n\n${enhancedBody}`;
      
      return {
        type: "fail",
        req,
        statusCode: res.statusCode,
        headers: convertHeaders(res.headers),
        body: enhancedBody,
        error: new Error(faultMessage),
      }
    }
  }

  // Handle empty response bodies
  if (!res.body) {
    console.warn("Empty SOAP response body received")
  }
  
  // Convert ArrayBuffer responses to string if needed
  let processedBody = res.body
  if (res.body instanceof ArrayBuffer) {
    try {
      processedBody = new TextDecoder().decode(res.body)
      console.log("Converted ArrayBuffer response to string")
    } catch (error) {
      console.warn("Failed to convert ArrayBuffer response to string:", error)
      // Keep the original ArrayBuffer if conversion fails
    }
  }
  
  // Handle proxy responses
  if (typeof processedBody === 'string') {
    // If we used a proxy, the response might be wrapped or have different formatting
    // Let's try to extract the actual SOAP response if it's there
    try {
      if (req.endpoint.includes('allorigins.win') || req.endpoint.includes('corsproxy.io')) {
        // Check if the response contains a SOAP envelope
        if (processedBody.includes('<soap:Envelope') || 
            processedBody.includes('<soapenv:Envelope') || 
            processedBody.includes('<SOAP-ENV:Envelope')) {
          console.log("Found SOAP envelope in proxy response");
        } 
        // If we can't find a SOAP envelope but have XML, it might still be valid
        else if (processedBody.trim().startsWith('<')) {
          console.log("Found XML in proxy response, assuming it's a valid SOAP response");
        } 
        // Handle JSON response from certain proxies that wrap the content
        else if (processedBody.includes('"contents":"')) {
          try {
            const jsonResponse = JSON.parse(processedBody);
            if (jsonResponse.contents) {
              processedBody = jsonResponse.contents;
              console.log("Extracted contents from proxy JSON wrapper");
            }
          } catch (e) {
            console.warn("Failed to parse proxy JSON response", e);
          }
        }
      }
    } catch (error) {
      console.warn("Error processing proxy response:", error);
    }
  }

  // It's a valid SOAP response with no faults
  return {
    type: "success",
    req,
    statusCode: res.statusCode,
    headers: convertHeaders(res.headers),
    body: processedBody,
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
  let isCancelled = false

  const cleanup = () => {
    isCancelled = true
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
    // Get a proper error message
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Create a more detailed error response with information for the UI
    const errorResponse: HoppSOAPResponse = {
      type: "network_fail",
      req,
      error: error instanceof Error ? error : new Error(String(error)),
      // Add a body with XML formatted error details for better display in the UI
      body: `<error-response>\n  <message>${errorMessage}</message>\n  <request-url>${req.endpoint}</request-url>\n  <operation>${req.operation || "unknown"}</operation>\n</error-response>`,
      statusCode: 0 // Indicating network/processing error
    }
    
    console.error("SOAP request failed with error:", errorMessage);
    
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
          // Special handling for Calculator service (dneonline)
          if (req.endpoint.includes('dneonline.com/calculator')) {
            // Calculator service requires a specific format: http://tempuri.org/[Operation]
            headers.push({
              key: "SOAPAction",
              value: `"http://tempuri.org/${req.operation}"`,
              active: true,
            })
            console.log("Added special SOAPAction header for Calculator service:", `"http://tempuri.org/${req.operation}"`)
          } else {
            headers.push({
              key: "SOAPAction",
              value: `"${req.operation}"`,
              active: true,
            })
          }
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

      // Check if we're likely to encounter CORS issues and try to apply proxy if needed
      if (req.endpoint.includes('dneonline.com') || 
          (!req.endpoint.includes('localhost') && !req.endpoint.startsWith(window.location.origin))) {
        console.warn("Potential CORS issue detected with endpoint:", req.endpoint)
        
        // For the calculator service, we know we'll hit CORS issues, so let's implement a special proxy approach
        // This is a simple way to demonstrate proxy support - in production, you'd want a more configurable solution
        if (req.endpoint.includes('dneonline.com/calculator')) {
          const originalEndpoint = req.endpoint;
          
          // Check for user-provided proxy in preRequestScript
          if (!req.preRequestScript || !req.preRequestScript.includes('PROXY_MODE')) {
            // Try to use a public CORS proxy (for demonstration purposes only)
            // In a real app, you'd want to use your own proxy or a configurable one
            const proxyOptions = [
              "https://api.allorigins.win/raw?url=",
              "https://corsproxy.io/?",
              "https://cors-anywhere.herokuapp.com/"
            ];
            
            // Use the first proxy option for simplicity
            // In a real implementation, you'd want to have a proxy selection UI
            req.endpoint = proxyOptions[0] + encodeURIComponent(req.endpoint);
            
            console.log(`Using proxy for Calculator service: Original endpoint "${originalEndpoint}" changed to "${req.endpoint}"`);
          }
        }
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
      
      // Log the final request details for debugging
      console.log("SOAP Request Details:", {
        endpoint: req.endpoint,
        operation: req.operation,
        headers: headers.filter(h => h.active),
        bodyLength: bodyContent?.length || 0,
        bodyPreview: bodyContent?.substring(0, 100) + "..."
      })

      // Use the kernel interceptor service to make the request
      const kernelService = getService(KernelInterceptorService)
      
      // Convert to Kernel request format and execute
      const kernelRequest = await RESTRequest.toRequest(restRequest as any)
      if (!kernelRequest) {
        throw new Error("Failed to create kernel request")
      }
      
      console.log("Executing SOAP request:", {
        endpoint: req.endpoint,
        operation: req.operation,
        soapVersion: req.soapVersion
      })
      
      const result = await kernelService.execute(kernelRequest)
      
      // Set a timeout to ensure we don't wait forever
      timeoutId = setTimeout(() => {
        if (!isCancelled) {
          console.warn("SOAP request timed out after 60 seconds")
          handleError(new Error("Request timed out after 60 seconds"))
        }
      }, 60000)  // 60 second timeout
      
      // Handle the response promise separately from the subscription
      result.response.then((res: E.Either<KernelInterceptorError, RelayResponse>) => {
        if (isCancelled) return // Don't proceed if request was cancelled
        
        if (res._tag === "Right") {
          console.log("SOAP request successful, processing response")
          return RESTResponse.toResponse(res.right, restRequest as any)
            .then((processedRes: HoppRESTResponse) => {
              if (isCancelled) return // Check again after async operation
              
              console.log("SOAP response processed:", {
                status: processedRes.statusCode,
                bodyLength: typeof processedRes.body === 'string' ? processedRes.body.length : 'binary data'
              })
              
              // Special handling for CORS errors that might be hidden
              if (processedRes.statusCode === 0 || 
                  (typeof processedRes.body === 'string' && processedRes.body.includes('Access-Control-Allow-Origin'))) {
                console.error("Detected CORS issue with response")
                
                // For the calculator service, give specific guidance
                let errorMessage = "CORS error detected. The server doesn't allow requests from your browser. " +
                                   "Try using a CORS proxy or make the request server-side.";
                                   
                if (req.endpoint.includes('dneonline.com')) {
                  errorMessage = "CORS error detected. The dneonline.com Calculator service doesn't support direct browser requests. " +
                                 "Please use a CORS proxy or try accessing through a server-side request.";
                }
                
                // Define a helper function to convert headers
                const safeConvertHeaders = (headers: any[] = []) => {
                  return headers.map((h: {key: string, value: string}) => ({ 
                    key: h.key, 
                    value: h.value, 
                    active: true 
                  }))
                };
                
                // Create an error response that will be displayed in the UI
                const errorResponse: HoppSOAPResponse = {
                  type: "fail",
                  req,
                  error: new Error(errorMessage),
                  statusCode: processedRes.statusCode || 0,
                  headers: safeConvertHeaders(processedRes.headers),
                  // Include the actual response body plus our error message for context
                  body: typeof processedRes.body === 'string' ? 
                         `<!-- ${errorMessage} -->\n\n${processedRes.body}` : 
                         `<!-- ${errorMessage} -->`
                };
                
                response.next(errorResponse);
                onHistoryUpdate?.(req, errorResponse);
                response.complete();
                cleanup();
                return;
              }
              
              const soapResponse = processSOAPResponse(processedRes, req)

              response.next(soapResponse)
              onHistoryUpdate?.(req, soapResponse)
              
              response.complete()
              cleanup()
            })
            .catch((error: unknown) => {
              if (isCancelled) return
              
              // Improve error messages for common issues
              let enhancedError = error
              const errorMsg = error instanceof Error ? error.message : String(error)
              let friendlyErrorMsg = errorMsg
              
              if (errorMsg.includes('NetworkError') || errorMsg.includes('Failed to fetch')) {
                friendlyErrorMsg = "Network error: Could not connect to the SOAP service. " +
                  "This might be due to CORS restrictions, network connectivity, or the server being unavailable."
                enhancedError = new Error(friendlyErrorMsg)
              }
              
              console.error("Error processing SOAP response:", enhancedError)
              
              // Create a proper error response for the UI
              const errorResponse: HoppSOAPResponse = {
                type: "fail",
                req,
                error: enhancedError instanceof Error ? enhancedError : new Error(String(enhancedError)),
                // Include a body with the error message for better visibility in the UI
                body: `<!-- ERROR: ${friendlyErrorMsg} -->\n\n<error>\n  <message>${friendlyErrorMsg}</message>\n  <details>${errorMsg}</details>\n</error>`,
                statusCode: 0 // Indicating network/processing error
              }
              
              // Send the error to the response stream and history
              response.next(errorResponse)
              onHistoryUpdate?.(req, errorResponse)
              response.complete()
              cleanup()
            })
        } else {
          if (isCancelled) return
          
          // Enhanced error message for interceptor errors
          let enhancedMessage = "Request failed"
          
          // Handle the different error types
          if (res.left === "cancellation") {
            enhancedMessage = "Request was cancelled"
          } else if (typeof res.left === 'object' && res.left && 'error' in res.left) {
            // This is an object with error details
            const errorObj = res.left as {
              error: RelayError,
              humanMessage: { heading: Function, description: Function }
            }
            
            enhancedMessage = "Request failed: " + errorObj.error.message
            
            // Check for CORS errors in the message
            if (errorObj.error.message && 
               (errorObj.error.message.includes('CORS') || 
                errorObj.error.message.includes('origin') ||
                errorObj.error.message.includes('blocked') ||
                errorObj.error.message.includes('cross'))) {
              
              // Specific message for the Calculator service
              if (req.endpoint.includes('dneonline.com/calculator')) {
                enhancedMessage = "CORS policy error with the Calculator service: " +
                                "The dneonline.com Calculator service doesn't allow direct browser requests. " +
                                "Try using a CORS proxy or access through a server-side request. " +
                                "You can also use another SOAP calculator service that allows CORS.";
              } else {
                enhancedMessage = "CORS policy error: The SOAP service doesn't allow requests from your browser. " +
                               "Consider using a CORS proxy or making the request from a server."
              }
            }
          }
          
          console.error("SOAP request failed:", {
            original: res.left,
            enhanced: enhancedMessage
          })
          
          // Create a detailed error response with formatted XML for the UI
          const errorResponse: HoppSOAPResponse = {
            type: "fail",
            req,
            error: new Error(enhancedMessage),
            // Add a formatted body with error details
            body: `<soap-error>\n  <message>${enhancedMessage}</message>\n  <details>${JSON.stringify(res.left, null, 2)}</details>\n</soap-error>`,
            statusCode: 0
          }
          
          // Send directly to response stream instead of using handleError
          response.next(errorResponse)
          onHistoryUpdate?.(req, errorResponse)
          response.complete()
          cleanup()
        }
      }).catch((error: unknown) => {
        if (isCancelled) return
        console.error("SOAP request exception:", error)
        handleError(error)
      })

    } catch (error) {
      handleError(error)
    }
  })()

  return [response.asObservable(), cleanup]
}
