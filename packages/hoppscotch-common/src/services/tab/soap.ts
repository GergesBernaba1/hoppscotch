import { Container } from "dioc"
import { isEqual, cloneDeep } from "lodash-es"
import { computed, nextTick } from "vue"
import { getDefaultSOAPRequest } from "~/helpers/soap/default"
import { HoppSOAPSaveContext, HoppSOAPTabDocument } from "~/helpers/soap/document"
import { getService } from "~/modules/dioc"
import { PersistenceService } from "../persistence/service"
import { STORE_KEYS } from "../persistence/constants"
import { TabService } from "./tab"
import { PersistableTabState, HoppTab } from "."
import { HoppSOAPRequest } from "@hoppscotch/data"
import { useSOAPHistoryStore } from "~/newstore/SOAPHistory"

export class SOAPTabService extends TabService<HoppSOAPTabDocument> {
  public static readonly ID = "SOAP_TAB_SERVICE"

  constructor(c: Container) {
    super(c)
    // Do not auto-create a default tab
    // this.ensureDefaultTab()
  }

  // override persistableTabState to remove response from the document
  public override persistableTabState = computed(() => ({
    lastActiveTabID: this.currentTabID.value,
    orderedDocs: this.tabOrdering.value
      .map((tabID) => {
        const tab = this.tabMap.get(tabID)
        // Skip undefined tabs
        if (!tab) return null
        
        return {
          tabID: tab.id,
          doc: {
            ...tab.document,
            response: null,
          },
        }
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
  }))

  // Override tabs computed to filter out undefined values
  public override tabs = computed(() => 
    this.tabOrdering.value
      .map((id) => this.tabMap.get(id))
      .filter((tab): tab is HoppTab<HoppSOAPTabDocument> => tab !== undefined)
  )

  protected async loadPersistedState(): Promise<PersistableTabState<HoppSOAPTabDocument> | null> {
    const persistenceService = getService(PersistenceService)
    const savedState = await persistenceService.getNullable(STORE_KEYS.SOAP_TABS)
    return savedState as PersistableTabState<HoppSOAPTabDocument> | null
  }

  public getTabRefWithSaveContext(ctx: HoppSOAPSaveContext) {
    for (const tab of this.tabMap.values()) {
      if (!tab || !tab.document) continue
      
      if (ctx?.originLocation === "team-collection") {
        if (
          tab.document.saveContext?.originLocation === "team-collection" &&
          tab.document.saveContext.requestID === ctx.requestID
        ) {
          return this.getTabRef(tab.id)
        }
      } else if (isEqual(ctx, tab.document.saveContext)) {
        return this.getTabRef(tab.id)
      }
    }

    return null
  }

  public getDirtyTabsCount() {
    let count = 0

    for (const tab of this.tabMap.values()) {
      if (tab && tab.document && tab.document.isDirty) count++
    }

    return count
  }

  public get activeTabID() {
    return this.currentTabID
  }
  
  public setResponse(tabID: string, response: any) {
    const tab = this.tabMap.get(tabID)
    if (!tab) return
    
    tab.document = {
      ...tab.document,
      response: response,
    }
    
    this.updateTab(tab)
    
    // If response type is 'loading', trigger the send request behavior
    if (response.type === 'loading' && response.req) {
      this.sendSoapRequest(tabID)
    }
  }

  public updateRequest(tabID: string, updatedRequest: Partial<HoppSOAPRequest>) {
    const tab = this.tabMap.get(tabID)
    if (!tab) return
    Object.assign(tab.document.request, updatedRequest)
    tab.document.isDirty = true
    this.updateTab(tab)
  }
  
  // Cancel an ongoing request
  public cancelRequest(tabID: string): void {
    const tab = this.tabMap.get(tabID)
    if (!tab || !tab.document.response || tab.document.response.type !== 'loading') return
    
    // Set response to cancelled
    this.setResponse(tabID, {
      type: 'network_fail',
      error: new Error('Request cancelled'),
    })
  }
  
  // Send a SOAP request
  public sendSoapRequest(tabID: string): void {
    const tab = this.tabMap.get(tabID)
    if (!tab) return

    const request = tab.document.request
    if (!request) return

    // Use the local sendRequest method
    this.sendRequest(request).then(result => {
      result.stream.subscribe({
        next: (response: any) => {
          this.setResponse(tabID, response)
        },
        error: (error: any) => {
          this.setResponse(tabID, {
            type: 'network_fail',
            error
          })
        }
      })
    }).catch(error => {
      this.setResponse(tabID, {
        type: 'network_fail',
        error
      })
    })
  }

  public getTabDocument(tabID: string) {
    return this.tabMap.get(tabID)?.document
  }

  public sendRequest(request: HoppSOAPRequest) {
    // Import the network stream creator
    return import("~/helpers/soap/soap-network").then(({ createSOAPNetworkRequestStream }) => {
      const [responseStream, cancelRequest] = createSOAPNetworkRequestStream(request, (req, res) => {
        // Update history when request completes
        const historyStore = useSOAPHistoryStore()
        historyStore.addSOAPRequestToHistory(req, res)
      })
      
      return {
        stream: responseStream,
        cancel: cancelRequest
      }
    })
  }

  public override createNewTab(document: HoppSOAPTabDocument, switchToIt = true) {
    const tab = super.createNewTab(document, switchToIt)
    console.log('[SOAPTabService] createNewTab called. Tab count:', this.tabMap.size)
    
    // Ensure tab is created with proper values
    if (tab) {
      // Force a watch update to ensure the UI updates
      this.updateTab(tab)
    }
    
    return tab
  }

  // Method to save a request as a sample
  public saveRequestAsSample(tabID: string, name: string) {
    const tab = this.tabMap.get(tabID)
    if (!tab) return

    // For now, just log the save action
    console.log(`Saving request as sample: ${name}`, tab.document.request)
    
    // In a real implementation, this would save to a samples store
    // For now, we'll just mark the tab as not dirty
    tab.document.isDirty = false
    this.updateTab(tab)
  }

  // Method to duplicate a tab
  public duplicateTab(tabID: string, newName?: string) {
    const originalTab = this.tabMap.get(tabID)
    if (!originalTab) return null

    const duplicatedDocument: HoppSOAPTabDocument = {
      ...originalTab.document,
      request: {
        ...originalTab.document.request,
        name: newName || `${originalTab.document.request.name} (Copy)`
      },
      isDirty: false,
      response: null
    }

    return this.createNewTab(duplicatedDocument, true)
  }

  public override updateTab(tabUpdateOrId: HoppTab<HoppSOAPTabDocument> | string, properties?: Partial<{ isDirty: boolean }>) {
    // Handle case where tabUpdateOrId is a tab object
    if (typeof tabUpdateOrId !== 'string') {
      super.updateTab(tabUpdateOrId)
    } else {
      // Handle case where tabUpdateOrId is a tabID and properties are provided
      const tab = this.tabMap.get(tabUpdateOrId)
      if (tab && properties) {
        if (properties.isDirty !== undefined) {
          tab.document.isDirty = properties.isDirty
        }
        super.updateTab(tab)
      }
    }
    
    // Ensure we always have at least one tab
    if (this.tabMap.size === 0) {
      // this.ensureDefaultTab()
    }
  }

  // Override closeTab to allow closing all tabs
  public override closeTab(tabID: string) {
    if (!this.tabMap.has(tabID)) {
      console.warn(
        `Tried to close a tab which does not exist (tab id: ${tabID})`
      )
      return
    }

    // Remove from ordering first
    this.tabOrdering.value.splice(this.tabOrdering.value.indexOf(tabID), 1)

    // Delete the tab synchronously
    this.tabMap.delete(tabID)
    // Do not auto-create a default tab
    // if (this.tabMap.size === 0) {
    //   console.log('[SOAPTabService] No tabs remaining, creating default tab')
    //   this.ensureDefaultTab()
    // }
  }

  // Add a public method to force a refresh of tabOrdering for reactivity
  public forceTabOrderingRefresh() {
    this.tabOrdering.value = [...this.tabOrdering.value]
  }
}