/**
 * DEPRECATED - This file is kept for backward compatibility
 * Use services/tab/soap.ts instead
 */

// Import required dependencies
import { Container } from "dioc"
import { getService } from "~/modules/dioc"
import { makeSOAPRequest, HoppSOAPRequest } from "@hoppscotch/data"
import { useSOAPHistoryStore } from "~/newstore/SOAPHistory"
import { createSOAPNetworkRequestStream } from "~/helpers/soap/soap-network"
import { PersistenceService } from "./persistence/service"
import { STORE_KEYS } from "./persistence/constants"
import { TabService } from "./tab/tab"

// Re-export from the new location
export * from "./tab/soap"

// Local type definitions to match the network helper
type HoppSOAPHeader = {
  key: string
  value: string
  active: boolean
}

type LocalHoppSOAPRequest = {
  endpoint: string
  wsdlUrl?: string
  operation?: string
  soapVersion: string
  params: { key: string; value: string; active: boolean }[]
  headers: HoppSOAPHeader[]
  body: string
  auth: any
  preRequestScript?: string
  testScript?: string
  attachments?: {
    name: string
    contentType: string
    contentId: string
    content: File | ArrayBuffer | null
    active: boolean
  }[]
  useMtom?: boolean
}

type SOAPTabDocument = {
  request: LocalHoppSOAPRequest
  isDirty: boolean
}

// Convert local request to data request
function convertToDataRequest(request: LocalHoppSOAPRequest): HoppSOAPRequest {
  return makeSOAPRequest({
    name: request.operation || "",
    endpoint: request.endpoint,
    wsdlUrl: request.wsdlUrl,
    soapVersion: request.soapVersion as "1.1" | "1.2",
    auth: request.auth,
    headers: request.headers,
    params: request.params,
    operation: request.operation,
    body: request.body,
    preRequestScript: request.preRequestScript,
    testScript: request.testScript,
    attachments: request.attachments?.map((att) => ({
      ...att,
      content: att.content instanceof File ? null : att.content,
    })),
    useMtom: request.useMtom,
  })
}

export class SOAPTabService extends TabService<SOAPTabDocument> {
  public static readonly ID = "SOAP_TAB_SERVICE"

  constructor(container: Container) {
    super(container)
  }

  public async init() {
    await super.init()
    
    // Create a default tab if no tabs exist
    if (this.tabMap.size === 0) {
      this.createNewTab({
        request: {
          endpoint: "",
          wsdlUrl: "",
          soapVersion: "1.1",
          auth: { authType: "none", authActive: true },
          headers: [],
          params: [],
          operation: "",
          body: "",
          preRequestScript: "",
          testScript: "",
          attachments: [],
          useMtom: false,
        },
        isDirty: false,
      })
    }
  }

  protected async loadPersistedState(): Promise<any | null> {
    const persistenceService = getService(PersistenceService)
    const savedState = await persistenceService.getNullable(STORE_KEYS.SOAP_TABS)
    return savedState
  }

  async sendRequest(request: LocalHoppSOAPRequest) {
    const historyStore = useSOAPHistoryStore()

    // Convert to the correct type for the network helper
    const dataRequest = convertToDataRequest(request)

    const [stream, cancel] = createSOAPNetworkRequestStream(
      dataRequest,
      (req, res) => {
        if (res.type !== "loading") {
          try {
            historyStore.addSOAPRequestToHistory(
              req,
              res
            )
          } catch (error) {
            console.error("Failed to add request to history:", error)
          }
        }
      }
    )

    // Add timeout handling
    const timeout = setTimeout(() => {
      cancel()
    }, 30000) // 30 second timeout

    return {
      stream,
      cancel: () => {
        clearTimeout(timeout)
        cancel()
      },
    }
  }
  
  /**
   * Update a request in a tab
   * @param tabID ID of the tab to update
   * @param updatedRequest Updated request data
   */
  updateRequest(tabID: string, updatedRequest: Partial<LocalHoppSOAPRequest>) {
    const tab = this.tabMap.get(tabID)
    if (!tab) return
    
    // Update the request while keeping the same reference
    const request = tab.document.request
    
    // Apply updates
    Object.assign(request, updatedRequest)
    
    // Mark the tab as dirty
    tab.document.isDirty = true
    // Update tab state
    this.updateTab(tab)
  }
  
  /**
   * Get a tab's document
   * @param tabID ID of the tab
   */
  getTabDocument(tabID: string) {
    return this.tabMap.get(tabID)?.document
  }
}
