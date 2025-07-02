import { HoppSOAPRequest, HoppSOAPResponse } from "@hoppscotch/data"
import { cloneDeep } from "lodash-es"
import { defineStore } from "pinia"
import { ref } from "vue"

export type SOAPHistoryEntry = {
  v: 1
  request: HoppSOAPRequest
  response?: HoppSOAPResponse
  timestamp: string
  starred?: boolean
}

const MAX_HISTORY_COUNT = 50

/**
 * A store for managing the SOAP request history
 */
export const useSOAPHistoryStore = defineStore("soap-history", () => {
  const history = ref<SOAPHistoryEntry[]>([])
  const loadingHistory = ref(false)

  /**
   * Add a new entry to the history
   * @param entry The entry to add
   */
  function addEntry(entry: SOAPHistoryEntry) {
    history.value.unshift(entry)

    // Limit history size
    if (history.value.length > MAX_HISTORY_COUNT) {
      history.value.splice(MAX_HISTORY_COUNT)
    }
  }

  /**
   * Add a SOAP response to the history
   * @param request The request that was sent
   * @param response The response that was received
   */
  function addSOAPRequestToHistory(
    request: HoppSOAPRequest,
    response: HoppSOAPResponse
  ) {
    const entry: SOAPHistoryEntry = {
      v: 1,
      request: cloneDeep(request),
      response: cloneDeep(response),
      timestamp: new Date().toISOString(),
    }

    addEntry(entry)
  }

  /**
   * Toggle the starred status of a history entry
   * @param entryIndex Index of the history entry to toggle
   */
  function toggleStar(entryIndex: number) {
    if (entryIndex < 0 || entryIndex >= history.value.length) {
      return
    }

    const entry = history.value[entryIndex]
    entry.starred = !entry.starred
  }

  /**
   * Clear all history entries that are not starred
   */
  function clearHistory() {
    history.value = history.value.filter((entry) => entry.starred)
  }

  /**
   * Remove a specific history entry
   * @param entryIndex Index of the history entry to remove
   */
  function removeEntry(entryIndex: number) {
    if (entryIndex < 0 || entryIndex >= history.value.length) {
      return
    }

    history.value.splice(entryIndex, 1)
  }

  /**
   * Get a history entry
   * @param index Index of the entry to get
   */
  function getEntryAt(index: number): SOAPHistoryEntry | undefined {
    if (index < 0 || index >= history.value.length) {
      return undefined
    }

    return cloneDeep(history.value[index])
  }

  return {
    history,
    loadingHistory,
    addSOAPRequestToHistory,
    toggleStar,
    clearHistory,
    removeEntry,
    getEntryAt,
  }
})
