import { HoppModule } from "."
import { getService } from "~/modules/dioc"
import { SOAPTabService } from "~/services/tab/soap"
import { PersistenceService } from "~/services/persistence/service"
import { STORE_KEYS } from "~/services/persistence/constants"
import { watch } from "vue"
import { useSOAPHistoryStore } from "~/newstore/SOAPHistory"
import { createPinia } from "pinia"
import * as E from "fp-ts/Either"

export default <HoppModule>{
  id: "soap",
  onVueAppInit(app) {
    try {
      console.log('[SOAP Module] Initializing Vue app...')
      
      // Initialize Pinia
      const pinia = createPinia()
      app.use(pinia)

      // Get the persistence service to save SOAP requests
      const persistenceService = getService(PersistenceService)
      
      // Set up persistence for SOAP tabs with error handling
      try {
        const soapTabService = getService(SOAPTabService)
        
        // Initialize the tab service with error handling
        soapTabService.init().catch(error => {
          console.error('[SOAP Module] Error initializing SOAP tab service:', error)
        })
        
        // Add defensive programming to the watch
        watch(
          () => {
            try {
              return soapTabService.persistableTabState.value
            } catch (error) {
              console.error('[SOAP Module] Error accessing persistableTabState:', error)
              return null
            }
          },
          (state) => {
            if (state) {
              persistenceService.set(STORE_KEYS.SOAP_TABS, state)
            }
          },
          { deep: true }
        )
      } catch (error) {
        console.error('[SOAP Module] Error setting up SOAP tab service:', error)
      }
      
      console.log('[SOAP Module] Vue app initialization complete')
    } catch (error) {
      console.error('[SOAP Module] Error during Vue app initialization:', error)
    }
  },

  onRootSetup() {
    try {
      console.log('[SOAP Module] Setting up root...')
      
      // Get the persistence service to save SOAP requests
      const persistenceService = getService(PersistenceService)
      
      // Initialize SOAP History from storage
      initSOAPHistory(persistenceService)
      
      // Set up persistence for SOAP history with error handling
      try {
        const historyStore = useSOAPHistoryStore()
        watch(
          () => {
            try {
              return historyStore.history
            } catch (error) {
              console.error('[SOAP Module] Error accessing history:', error)
              return []
            }
          },
          (history) => {
            if (history) {
              persistenceService.set(STORE_KEYS.SOAP_HISTORY, history)
            }
          },
          { deep: true }
        )
      } catch (error) {
        console.error('[SOAP Module] Error setting up SOAP history:', error)
      }
      
      console.log('[SOAP Module] Root setup complete')
    } catch (error) {
      console.error('[SOAP Module] Error during root setup:', error)
    }
  }
}

async function initSOAPHistory(persistenceService: PersistenceService) {
  try {
    console.log('[SOAP Module] Initializing SOAP history...')
    
    // Load history from store
    const historyResult = await persistenceService.get(STORE_KEYS.SOAP_HISTORY)

    const historyStore = useSOAPHistoryStore()
    let history: any[] = []
    if (E.isRight(historyResult)) {
      history = Array.isArray(historyResult.right) ? historyResult.right : []
    }
    historyStore.$patch({ history })
    
    console.log('[SOAP Module] SOAP history initialized with', history.length, 'entries')
  } catch (e) {
    console.error("[SOAP Module] Failed to load SOAP history:", e)
  }
}
