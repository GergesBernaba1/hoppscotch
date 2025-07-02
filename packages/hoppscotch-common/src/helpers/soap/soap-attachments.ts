// Local type definition to avoid import issues
export type HoppSOAPHeader = {
  key: string
  value: string
  active: boolean
}

/**
 * SOAP Attachment type
 */
export type SOAPAttachment = {
  name: string
  contentType: string
  contentId: string
  content: string | ArrayBuffer | null
  active: boolean
}

/**
 * Convert ArrayBuffer to base64 string
 */
function arrayBufferToBase64(buffer: string | ArrayBuffer | null): string {
  if (!buffer) return ""
  if (typeof buffer === "string") return buffer
  
  const bytes = new Uint8Array(buffer)
  let binary = ""
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

/**
 * Generate the MIME multipart message for SOAP with attachments (MTOM/XOP)
 * @param soapEnvelope The SOAP envelope XML string
 * @param attachments List of attachments to include
 * @param soapAction Optional SOAPAction for SOAP 1.1
 * @returns Object with headers and body for the request
 */
export const createMTOMMessage = (
  soapEnvelope: string,
  attachments: SOAPAttachment[],
  soapAction?: string
): { headers: HoppSOAPHeader[]; body: string } => {
  // Generate a boundary for the multipart message
  const boundary = `----=_hoppscotch_soap_mtom_${Date.now().toString(16)}`
  
  // Create headers for the request
  const headers: HoppSOAPHeader[] = [
    {
      key: "Content-Type",
      value: `multipart/related; type="application/xop+xml"; boundary="${boundary}"; start="<soap-envelope>"; start-info="text/xml"`,
      active: true,
    }
  ]
  
  // Add SOAPAction header for SOAP 1.1 if provided
  if (soapAction) {
    headers.push({
      key: "SOAPAction",
      value: soapAction,
      active: true,
    })
  }
  
  // Start building the multipart body
  let body = ""
  
  // Add the SOAP envelope part
  body += `--${boundary}\r\n`
  body += 'Content-Type: application/xop+xml; charset=UTF-8; type="text/xml"\r\n'
  body += 'Content-Transfer-Encoding: 8bit\r\n'
  body += 'Content-ID: <soap-envelope>\r\n\r\n'
  body += soapEnvelope
  body += '\r\n'
  
  // Add each attachment
  attachments.filter(att => att.active).forEach(attachment => {
    body += `--${boundary}\r\n`
    body += `Content-Type: ${attachment.contentType}\r\n`
    body += 'Content-Transfer-Encoding: base64\r\n'
    body += `Content-ID: <${attachment.contentId}>\r\n\r\n`
    
    if (attachment.content) {
      // Convert binary content to base64
      body += arrayBufferToBase64(attachment.content)
    } else {
      body += '[No content]'
    }
    body += '\r\n'
  })
  
  // Close the multipart message
  body += `--${boundary}--\r\n`
  
  return { headers, body }
}

/**
 * Creates an XOP (XML-binary Optimized Packaging) Include reference for an attachment
 * @param contentId The content ID of the attachment
 * @returns XML string with the XOP Include element
 */
export const createXOPInclude = (contentId: string): string => {
  return `<xop:Include xmlns:xop="http://www.w3.org/2004/08/xop/include" href="cid:${contentId}"/>`
}
