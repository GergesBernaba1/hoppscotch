import { computed } from "vue"
import { useSOAPHistoryStore } from "../newstore/SOAPHistory"

/**
 * A composable that returns a list of unique endpoints from the SOAP history
 * @returns A computed ref that contains an array of unique endpoint URLs from the history
 */
export function useSOAPEndpointHistory() {
  const historyStore = useSOAPHistoryStore()

  return computed(() => {
    // Extract all URLs from history
    const urls = historyStore.history.map((entry) => entry.request.endpoint)

    // Filter out duplicates and empty strings
    const uniqueUrls = [...new Set(urls)].filter((url) => !!url)

    return uniqueUrls
  })
}
