import { getService } from "~/modules/dioc"
import { SOAPTabService } from "~/services/tab/soap"
import { HoppSOAPRequest } from "@hoppscotch/data"

export function useSOAPTabService() {
  const tabService = getService(SOAPTabService)

  /**
   * Get the ID of the active tab
   */
  function getActiveTab(): string | null {
    return tabService.activeTabID.value
  }

  /**
   * Update the request in a tab
   * @param tabID ID of the tab to update
   * @param request The SOAP request to update with
   */
  function updateRequest(tabID: string, request: HoppSOAPRequest) {
    tabService.updateRequest(tabID, {
      endpoint: request.endpoint,
      wsdlUrl: request.wsdlUrl,
      operation: request.name,
      soapVersion: request.soapVersion,
      params: request.params || [],
      headers: request.headers || [],
      body: request.body || "",
      auth: request.auth,
      preRequestScript: request.preRequestScript || "",
      testScript: request.testScript || "",
      attachments: request.attachments || [],
    })
  }

  /**
   * Send the request in a tab
   * @param tabID ID of the tab to send the request for
   */
  function sendRequest(tabID: string) {
    const request = tabService.getTabDocument(tabID)?.request
    if (!request) return null

    return tabService.sendRequest(request)
  }

  return {
    getActiveTab,
    updateRequest,
    sendRequest,
    // Export the original service for direct access
    service: tabService,
  }
}
