import * as E from "fp-ts/Either"

import { Observable, BehaviorSubject, Subscription } from "rxjs"
import { cloneDeep } from "lodash-es"
import { KernelInterceptorService, KernelInterceptorError } from "~/services/kernel-interceptor.service"
import { getService } from "~/modules/dioc"
import { RESTRequest } from "~/helpers/kernel/rest/request"
import { RESTResponse } from "~/helpers/kernel/rest/response"
import { RelayResponse } from "@hoppscotch/kernel/src/relay/v/1"
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
function validateSOAPEnvelope(body: string | undefined, soapVersion: string | undefined): boolean {
  try {
    // Extra safety checks
    if (typeof body !== 'string') {
      console.error("SOAP envelope validation failed: Body is not a string:", body);
      return false;
    }
    
    if (!soapVersion) {
      console.error("SOAP envelope validation failed: Missing SOAP version");
      // Default to SOAP 1.1 instead of failing
      soapVersion = "1.1";
    }
    
    if (body.trim() === "") {
      console.error("SOAP envelope validation failed: Empty body");
      return false;
    }
    
    const parser = new DOMParser()
    const doc = parser.parseFromString(body, "text/xml")
    
    // Check for XML parsing errors
    const parserError = doc.querySelector("parsererror")
    if (parserError) {
      const errorText = parserError.textContent || 'Unknown parse error';
      console.error("SOAP envelope XML parsing error:", errorText);
      return false
    }

    // Check for SOAP envelope with various namespace prefixes
    const envelope = doc.querySelector("Envelope") || 
                    doc.querySelector("soap\\:Envelope") ||
                    doc.querySelector("soapenv\\:Envelope") ||
                    doc.querySelector("SOAP-ENV\\:Envelope")
                    
    if (!envelope) {
      console.error("SOAP envelope validation failed: No Envelope element found");
      return false
    }

    // Check for SOAP version by inspecting namespaces
    // We look at various attributes since different implementations use different prefixes
    const namespaces = [
      envelope.getAttribute("xmlns:soap"),
      envelope.getAttribute("xmlns:soapenv"),
      envelope.getAttribute("xmlns:SOAP-ENV"),
      envelope.getAttribute("xmlns")
    ].filter(Boolean);
    
    if (namespaces.length === 0) {
      console.error("SOAP envelope validation failed: No namespace attributes found");
      return false
    }
    
    // Check if any namespace matches the expected one for the SOAP version
    const soap11NS = "http://schemas.xmlsoap.org/soap/envelope/";
    const soap12NS = "http://www.w3.org/2003/05/soap-envelope";
    
    if (soapVersion === "1.1") {
      const hasValidNS = namespaces.some(ns => ns === soap11NS);
      if (!hasValidNS) {
        console.error("SOAP 1.1 envelope validation failed: Invalid namespace", { foundNamespaces: namespaces });
      }
      return hasValidNS;
    } else if (soapVersion === "1.2") {
      const hasValidNS = namespaces.some(ns => ns === soap12NS);
      if (!hasValidNS) {
        console.error("SOAP 1.2 envelope validation failed: Invalid namespace", { foundNamespaces: namespaces });
      }
      return hasValidNS;
    }

    console.error("SOAP envelope validation failed: Invalid SOAP version specified", { version: soapVersion });
    return false;
  } catch (error) {
    console.error("Error validating SOAP envelope:", error);
    console.error("SOAP request failed with error:", error instanceof Error ? error.message : String(error));
    return false;
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
  const convertHeaders = (headers: any[] | undefined) => {
    if (!headers || !Array.isArray(headers)) {
      console.warn("No headers provided or headers is not an array");
      return [];
    }
    
    return headers.map((h: {key: string, value: string}) => {
      if (!h || typeof h !== 'object') {
        console.warn("Invalid header item:", h);
        return { key: "invalid-header", value: "invalid-header", active: true };
      }
      
      return { 
        key: h.key || "unnamed-header", 
        value: h.value || "", 
        active: true 
      };
    });
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
      // Log the SOAP Fault details for debugging
      console.log("SOAP Fault detected:", faultCheck)
      
      // Always log this specific error message format for consistency
      console.error("SOAP request failed with error:", `SOAP Fault: ${faultCheck.faultCode || 'Unknown'} - ${faultCheck.faultString || 'Unknown error'}`);
      
      // Create a formatted fault message to highlight in the body
      const faultMessage = `SOAP Fault: ${faultCheck.faultCode} - ${faultCheck.faultString}`;
      
      // Enhance the body with a comment to make the error more visible in the UI
      // but preserve the original SOAP response for reference
      let enhancedBody = res.body;
      
      // Add comment at the top to highlight the error
      enhancedBody = `<!-- ${faultMessage} -->\n\n${enhancedBody}`;
      
      // Return a structured error response with the fault details
      // Use type assertion to add the meta property that's not in the original type
      return {
        type: "fail",
        req,
        statusCode: res.statusCode,
        headers: convertHeaders(res.headers),
        body: enhancedBody,
        error: new Error(faultMessage)
      } as HoppSOAPResponse & { 
        meta: {
          isSoapFault: true,
          faultCode?: string,
          faultString?: string
        }
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
    // Generic function to extract SOAP envelope from any response
    const extractSoapEnvelope = (content: string): string | null => {
      // Try to find a SOAP envelope with any namespace prefix
      const envelopeMatch = content.match(/<(?:\w+:)?Envelope[^>]*>[\s\S]*<\/(?:\w+:)?Envelope>/i);
      return envelopeMatch ? envelopeMatch[0] : null;
    };
    
    // Generic function to extract operation result from any response
    const extractOperationResult = (content: string, operation: string): string | null => {
      if (!operation) return null;
      
      // Look for <OperationResponse> or <OperationResult> patterns
      const responseRegex = new RegExp(`<(?:\\w+:)?${operation}Response[^>]*>([\\s\\S]*?)</(?:\\w+:)?${operation}Response>`, 'i');
      const resultRegex = new RegExp(`<(?:\\w+:)?${operation}Result[^>]*>([\\s\\S]*?)</(?:\\w+:)?${operation}Result>`, 'i');
      
      const responseMatch = content.match(responseRegex);
      const resultMatch = content.match(resultRegex);
      
      return responseMatch ? responseMatch[1] : (resultMatch ? resultMatch[1] : null);
    };
    
    try {
      // Safe check for endpoint existing and including specific strings
      const isUsingProxy = req && req.endpoint && 
                         (req.endpoint.includes('allorigins.win') || 
                          req.endpoint.includes('corsproxy.io') ||
                          req.endpoint.includes('cors-anywhere'));
                          
      if (isUsingProxy) {
        console.log("Processing response from known CORS proxy");
        
        // Check if the response already contains a SOAP envelope
        const extractedEnvelope = extractSoapEnvelope(processedBody);
        if (extractedEnvelope) {
          console.log("Found SOAP envelope in proxy response");
          processedBody = extractedEnvelope;
        } 
        // If we can't find a SOAP envelope but have XML, it might still be valid
        else if (processedBody.trim().startsWith('<')) {
          console.log("Found XML in proxy response, assuming it's a valid SOAP response");
          
          // Look for operation results without envelope
          if (req.operation) {
            const extractedResult = extractOperationResult(processedBody, req.operation);
            if (extractedResult) {
              console.log(`Found result for operation ${req.operation} without envelope`);
            }
          }
        } 
        // Handle JSON response from certain proxies that wrap the content
        else if (processedBody.includes('"contents"') || processedBody.includes('"data"') || 
                 processedBody.includes('{"status":') || processedBody.includes('{')) {
          
          console.log("Processing proxy JSON response content:", processedBody.substring(0, 200));
          
          // Clean and parse the JSON
          // Remove any BOM or non-printable characters
          const cleanedBody = processedBody.replace(/^\s+|\s+$/g, '').replace(/^\ufeff/g, '');
          
          let jsonResponse;
          try {
            jsonResponse = JSON.parse(cleanedBody);
          } catch (parseError) {
            console.warn("Failed to parse proxy JSON response:", parseError);
            // If we can't parse JSON, try one more approach - regex extraction
            const xmlMatch = processedBody.match(/<(?:\w+:)?Envelope[^>]*>[\s\S]*<\/(?:\w+:)?Envelope>/i);
            if (xmlMatch && xmlMatch[0]) {
              processedBody = xmlMatch[0];
              console.log("Extracted SOAP envelope using regex after JSON parse failure");
            }
            // Continue with what we have
          }
          
          // Only proceed with JSON processing if we successfully parsed JSON
          if (jsonResponse && typeof jsonResponse === 'object') {
            // Extract content based on known proxy response formats
            let extractedContent = null;
            
            if (jsonResponse.contents && typeof jsonResponse.contents === 'string') {
              extractedContent = jsonResponse.contents;
              console.log("Extracted 'contents' from proxy JSON wrapper");
            }
            else if (jsonResponse.data && typeof jsonResponse.data === 'string') {
              extractedContent = jsonResponse.data;
              console.log("Extracted 'data' from proxy JSON wrapper");
            }
            else if (jsonResponse.data && typeof jsonResponse.data === 'object') {
              const dataStr = JSON.stringify(jsonResponse.data);
              extractedContent = dataStr;
              console.log("Extracted data object from proxy JSON wrapper");
            }
            
            if (extractedContent) {
              // Try to find a SOAP envelope in the extracted content
              const soapEnvelope = extractSoapEnvelope(extractedContent);
              if (soapEnvelope) {
                processedBody = soapEnvelope;
                console.log("Extracted SOAP envelope from proxy content");
              } else {
                processedBody = extractedContent;
                console.log("Using extracted content from proxy (no SOAP envelope found)");
              }
            }
          }
        }
      }
    } catch (error) {
      console.warn("Error processing proxy response:", error);
      console.log("Continuing with original response due to error in proxy processing");
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
    const errorStack = error instanceof Error && error.stack ? error.stack : 'No stack trace';
    
    // Create a more detailed error response with information for the UI
    const errorResponse: HoppSOAPResponse = {
      type: "network_fail",
      req,
      error: error instanceof Error ? error : new Error(String(error)),
      // Add a body with XML formatted error details for better display in the UI
      body: `<error-response>\n  <message>${errorMessage}</message>\n  <request-url>${req.endpoint || "unknown-endpoint"}</request-url>\n  <operation>${req.operation || "unknown"}</operation>\n  <timestamp>${new Date().toISOString()}</timestamp>\n</error-response>`,
      statusCode: 0 // Indicating network/processing error
    }
    
    // Enhanced error logging with full context
    console.error("SOAP request failed with error:", errorMessage);
    console.error("Detailed SOAP error context:", {
      errorMessage,
      errorStack,
      endpoint: req.endpoint,
      operation: req.operation,
      soapVersion: req.soapVersion,
      headersCount: req.headers?.length || 0,
      bodyLength: req.body?.length || 0,
      errorObject: error
    });
    
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

      // Ensure headers is always a valid array, even if req.headers is undefined
      let headers = req.headers ? [...req.headers] : []
      let bodyContent = req.body
      let contentType = req.soapVersion === "1.2" 
        ? "application/soap+xml;charset=UTF-8"
        : "text/xml;charset=UTF-8"
        
      // Check if operation-specific SOAP action header should be added
      // This approach can be used for any service, not just Calculator
      if (req.endpoint && req.operation) {
        console.log(`Checking if SOAPAction header is needed for operation: ${req.operation}`);
        // Check if there's already a SOAPAction header
        const hasSoapAction = headers.some(h => 
          h && h.key && h.key.toLowerCase() === 'soapaction' && h.active
        );
        
        if (!hasSoapAction) {
          // No need for hard-coded values - the header will be added below in the SOAP version sections
          console.log("No SOAPAction header present, will be added based on SOAP version");
        }
      }
      
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
          // Determine the appropriate SOAPAction based on the endpoint pattern
          // For SOAP 1.1, the SOAPAction header is required
          let soapActionValue = req.operation;
          
          // Common pattern for .NET services (like Calculator)
          if (req.endpoint && (
              req.endpoint.includes('tempuri.org') || 
              req.endpoint.includes('calculator.asmx') || 
              req.endpoint.includes('dneonline.com')
          )) {
            soapActionValue = `http://tempuri.org/${req.operation}`;
          }
          
          // Add the SOAPAction header with the appropriate value
          headers.push({
            key: "SOAPAction",
            value: `"${soapActionValue}"`,
            active: true,
          })
          console.log(`Added SOAPAction header for operation ${req.operation}:`, `"${soapActionValue}"`)
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
      if (req?.endpoint && typeof req.endpoint === 'string') {
        if (req.endpoint.includes('dneonline.com') || 
            (!req.endpoint.includes('localhost') && !req.endpoint.startsWith(window.location.origin))) {
          console.warn("Potential CORS issue detected with endpoint:", req.endpoint)
          
          // For the calculator service, we know we'll hit CORS issues, so let's implement a special proxy approach
          // This is a simple way to demonstrate proxy support - in production, you'd want a more configurable solution
          if (req.endpoint.includes('dneonline.com/calculator')) {
            const originalEndpoint = req.endpoint;
            
            // Check for user-provided proxy in preRequestScript
            if (!req.preRequestScript || typeof req.preRequestScript !== 'string' || !req.preRequestScript.includes('PROXY_MODE')) {
              // Try to use a public CORS proxy (for demonstration purposes only)
              // In a real app, you'd want to use your own proxy or a configurable one
              const proxyOptions = [
                // Changed default order - corsproxy.io works better with SOAP
                "https://corsproxy.io/?",
                "https://api.allorigins.win/raw?url=",
                "https://cors-anywhere.herokuapp.com/"
              ];
              
              // Use corsproxy.io by default since it works better with SOAP services
              try {
                req.endpoint = proxyOptions[0] + encodeURIComponent(req.endpoint);
                console.log("Using corsproxy.io as the default proxy for Calculator service");
              } catch (encodeError) {
                console.error("Error using corsproxy.io:", encodeError);
                // Fallback to allorigins if encoding fails
                try {
                  req.endpoint = proxyOptions[1] + encodeURIComponent(req.endpoint);
                } catch (error) {
                  console.error("Error using allorigins:", error);
                  // Final fallback without encoding
                  req.endpoint = proxyOptions[2] + req.endpoint;
                }
              }
              
              console.log(`Using proxy for Calculator service: Original endpoint "${originalEndpoint}" changed to "${req.endpoint}"`);
            }
          }
        }
      } else {
        console.error("Request endpoint is undefined or not a string");
      }
      
      // Extra safety checks for all request properties that might cause "Cannot read properties of undefined" errors
      if (!req.endpoint) {
        console.error("SOAP request endpoint is undefined");
        throw new Error("SOAP request endpoint is undefined");
      }
      
      // Make sure all arrays have a valid default value
      const safeHeaders = headers || [];
      const safeParams = req.params || [];
      
      // Special handling for Calculator service when using allorigins.win proxy
      // The issue is that allorigins doesn't always handle POST parameters correctly
      if (req.endpoint && req.endpoint.includes('allorigins.win') && req.endpoint.includes('calculator.asmx')) {
        console.log("Detected Calculator service with allorigins proxy - using special handling");
        
        // For Calculator with allorigins, we might need to switch to another proxy
        // or add extra headers to make it work properly
        try {
          // Switch to corsproxy.io which works better with SOAP
          const originalUrl = decodeURIComponent(req.endpoint.replace('https://api.allorigins.win/raw?url=', ''));
          req.endpoint = "https://corsproxy.io/?" + encodeURIComponent(originalUrl);
          console.log("Switched proxy from allorigins to corsproxy.io for Calculator service");
        } catch (proxyError) {
          console.error("Error switching proxy:", proxyError);
          // Continue with allorigins but add a special header that might help
          safeHeaders.push({
            key: "X-Requested-With",
            value: "XMLHttpRequest",
            active: true
          });
        }
      }
      
      // Create a REST request from the SOAP request
      const restRequest = {
        method: "POST",
        endpoint: req.endpoint,
        auth: req.auth || null,
        headers: Array.isArray(safeHeaders) ? safeHeaders.filter(h => h && typeof h === 'object' && 'active' in h && h.active) : [],
        body: bodyContent,
        params: Array.isArray(safeParams) ? safeParams.filter(p => p && typeof p === 'object' && 'active' in p && p.active) : [],
        preRequestScript: req.preRequestScript,
        testScript: req.testScript,
      }
      
      // Log the final request details for debugging - with extra null/undefined checks
      try {
        console.log("SOAP Request Details:", {
          endpoint: req?.endpoint || "undefined",
          operation: req?.operation || "undefined",
          headers: Array.isArray(headers) ? headers.filter(h => h && typeof h === 'object' && 'active' in h && h.active) : [],
          bodyLength: bodyContent?.length || 0,
          bodyPreview: bodyContent ? bodyContent.substring(0, 100) + "..." : "empty body"
        });
      } catch (logError) {
        console.error("Error logging SOAP request details:", logError);
      }

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
      
      // Add debugging to log each step of the process
      console.log("Converting to kernel request and executing...", {
        endpoint: kernelRequest.url,
        method: kernelRequest.method,
        headersCount: kernelRequest.headers?.length || 0,
        bodySize: kernelRequest.data ? kernelRequest.data.length : 0
      })

      const result = await kernelService.execute(kernelRequest)
      console.log("Kernel request execution started, waiting for response...")
      
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
        
        // Log the raw response first
        console.log("Raw response received:", {
          responseType: res._tag,
          isError: res._tag === "Left",
          isSuccess: res._tag === "Right",
          endpoint: req.endpoint,
          operation: req.operation
        })
        
        if (res._tag === "Right") {
          console.log("SOAP request successful, processing response")
          RESTResponse.toResponse(res.right, restRequest as any)
            .then((processedRes: HoppRESTResponse) => {
              if (isCancelled) return // Check again after async operation
                
              console.log("SOAP response processed:", {
                status: processedRes.statusCode,
                bodyLength: typeof processedRes.body === 'string' ? processedRes.body.length : 'binary data',
                bodyPreview: typeof processedRes.body === 'string' ? processedRes.body.substring(0, 100) : 'binary data'
              })
              
              // Special handling for potential issues
              
              // 1. Check for CORS errors that might be hidden
              if (processedRes.statusCode === 0 || 
                  (typeof processedRes.body === 'string' && 
                   (processedRes.body.includes('Access-Control-Allow-Origin') || 
                    processedRes.body.includes('cross-origin')))) {
                    
                console.error("Detected CORS issue with response")
                
                // Define a helper function to convert headers with extra safeguards
                const safeConvertHeaders = (headers: any[] = []) => {
                  if (!Array.isArray(headers)) {
                    console.warn("Headers is not an array in safeConvertHeaders:", headers);
                    return [];
                  }
                  
                  return headers.map((h: any) => {
                    // Extra safety for header objects
                    if (!h || typeof h !== 'object') {
                      console.warn("Invalid header item:", h);
                      return { key: "invalid-header", value: "invalid-value", active: true };
                    }
                    return { 
                      key: h.key || "unknown-header", 
                      value: h.value || "", 
                      active: true 
                    }
                  });
                };
                
                // Create response body for UI
                const corsMessage = req?.endpoint && typeof req.endpoint === 'string' && req.endpoint.includes('dneonline.com') ?
                  "Calculator service has CORS restrictions. Enable the CORS proxy in the UI." :
                  "This service has CORS restrictions. Enable a CORS proxy in the UI."
                
                // Return a successful response with CORS metadata
                // We use type assertion to add meta property that's not in the original type
                return {
                  type: "success", // Change from "fail" to "success" to not trigger error UI
                  req,
                  statusCode: 0,
                  headers: safeConvertHeaders(processedRes.headers),
                  body: typeof processedRes.body === 'string' ? 
                    processedRes.body : 
                    '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><CORSDetected>true</CORSDetected></soap:Body></soap:Envelope>',
                  meta: {
                    corsDetected: true,
                    corsMessage: corsMessage
                  }
                } as HoppSOAPResponse & { meta: { corsDetected: boolean, corsMessage: string } };
              }
              
              // 2. Check for empty responses that should have content
              if (processedRes.statusCode > 0 && (!processedRes.body || processedRes.body === "")) {
                console.warn("Response status indicates success but body is empty")
                
                // Create a warning message
                const warningMessage = "Response status indicates success but no body was received. " +
                                      "This could indicate a server issue or incorrect Content-Type handling.";
                
                // Convert the empty response to a warning response
                processedRes.body = `<warning>\n  <message>${warningMessage}</message>\n  <statusCode>${processedRes.statusCode}</statusCode>\n</warning>`;
              }
              
              // 3. Check for non-XML responses to SOAP requests
              if (processedRes.statusCode > 0 && typeof processedRes.body === 'string' && 
                  !processedRes.body.trim().startsWith('<') && !processedRes.body.includes('Envelope')) {
                console.warn("Response doesn't appear to be XML/SOAP")
                
                // Wrap non-XML responses in XML for better display
                if (processedRes.body.trim().startsWith('{') || processedRes.body.trim().startsWith('[')) {
                  // Looks like JSON, preserve it but wrap in XML
                  processedRes.body = `<non-soap-response>\n  <content-type>Appears to be JSON</content-type>\n  <raw-content><![CDATA[${processedRes.body}]]></raw-content>\n</non-soap-response>`;
                } else {
                  // Some other format, wrap it generically
                  processedRes.body = `<non-soap-response>\n  <content-type>Unknown</content-type>\n  <raw-content><![CDATA[${processedRes.body}]]></raw-content>\n</non-soap-response>`;
                }
              }
              
              // Process the final response
              const soapResponse = processSOAPResponse(processedRes, req)
              
              console.log("Final SOAP response ready to send to UI:", {
                type: soapResponse.type,
                statusCode: soapResponse.statusCode,
                hasHeaders: !!soapResponse.headers,
                hasError: !!soapResponse.error,
                bodyLength: soapResponse.body ? (typeof soapResponse.body === 'string' ? soapResponse.body.length : 'binary') : 0
              });

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
        } else if (res._tag === "Left") {
          if (isCancelled) return
          
          // Enhanced error message for interceptor errors
          let enhancedMessage = "Request failed"
          const errorValue = res.left
          
          // Log the raw error to help with debugging
          console.error("SOAP request interceptor error:", {
            errorType: typeof errorValue,
            errorValue: errorValue,
            endpoint: req.endpoint,
            operation: req.operation
          });
          
          // Always log this specific error message for consistency with other error handlers
          console.error("SOAP request failed with error:", 
            typeof errorValue === 'string' ? errorValue : JSON.stringify(errorValue));
          
          // Handle the different error types
          if (errorValue === "cancellation") {
            enhancedMessage = "Request was cancelled"
          } else if (typeof errorValue === 'object' && errorValue !== null && 'error' in errorValue) {
            // This is an object with error details
            const errorObj = errorValue as unknown as {
              error: { message?: string },
              humanMessage?: { heading?: Function, description?: Function }
            }
            
            enhancedMessage = "Request failed: " + 
              (errorObj.error && errorObj.error.message ? errorObj.error.message : "Unknown error")
            
            // Check for CORS errors in the message
            const errorMessage = errorObj.error && errorObj.error.message ? errorObj.error.message : ""
            if (errorMessage && 
               (errorMessage.includes('CORS') || 
                errorMessage.includes('origin') ||
                errorMessage.includes('blocked') ||
                errorMessage.includes('cross'))) {
              
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
            errorType: typeof errorValue,
            enhanced: enhancedMessage
          })
          
          // Create a detailed error response with formatted XML for the UI
          const errorResponse: HoppSOAPResponse = {
            type: "fail",
            req,
            error: new Error(enhancedMessage),
            // Add a formatted body with error details
            body: `<soap-error>\n  <message>${enhancedMessage}</message>\n  <details>${JSON.stringify(String(errorValue), null, 2)}</details>\n</soap-error>`,
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
