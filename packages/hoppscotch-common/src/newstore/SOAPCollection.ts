import { HoppSOAPRequest } from "@hoppscotch/data"
import { defineStore } from "pinia"
import { computed, ref } from "vue"
import { uniqueID } from "~/helpers/utils/uniqueID"
import { getService } from "~/modules/dioc"
import { PersistenceService } from "~/services/persistence/service"
import { Store as RefStore } from "./store"
import { STORE_KEYS } from "~/services/persistence/constants"

const STORE_KEY = STORE_KEYS.SOAP_TABS

// Collection type definitions
export type SOAPCollection = {
  id: string
  name: string
  folders: SOAPFolder[]
  requests: SOAPCollectionRequest[]
  documentation?: string
}

export type SOAPFolder = {
  id: string
  name: string
  folders: SOAPFolder[]
  requests: SOAPCollectionRequest[]
  documentation?: string
}

export type SOAPCollectionRequest = {
  id: string
  name: string
  request: HoppSOAPRequest
  documentation?: string
}

// Store definition
export const useSOAPCollectionStore = defineStore("soapCollection", () => {
  const collections = ref<SOAPCollection[]>([])
  const collectionsRefStore = new RefStore<SOAPCollection[]>([])
  const persistenceService = getService(PersistenceService)

  // Load collections from persistence
  async function loadCollections() {
    const loadedCollections =
      await persistenceService.getLocalConfig<SOAPCollection[]>(STORE_KEY)

    if (loadedCollections) {
      collections.value = loadedCollections
      collectionsRefStore.setValue(loadedCollections)
    } else {
      // Initialize with empty collection
      collections.value = []
      collectionsRefStore.setValue([])
      await persistenceService.setLocalConfig(STORE_KEY, [])
    }
  }

  // Save collections to persistence
  async function saveCollections() {
    await persistenceService.setLocalConfig(STORE_KEY, collections.value)
  }

  // Create a new collection
  function createCollection(name: string) {
    const newCollection: SOAPCollection = {
      id: uniqueID(),
      name,
      folders: [],
      requests: [],
    }

    collections.value.push(newCollection)
    collectionsRefStore.setValue(collections.value)

    saveCollections()
    return newCollection
  }

  // Delete a collection
  function deleteCollection(collectionID: string) {
    const collectionIndex = collections.value.findIndex(
      (col) => col.id === collectionID
    )

    if (collectionIndex === -1) return

    collections.value.splice(collectionIndex, 1)
    collectionsRefStore.setValue(collections.value)

    saveCollections()
  }

  // Add a request to a collection
  function addRequest(
    collectionID: string,
    request: HoppSOAPRequest,
    name = "New Request"
  ) {
    const collection = collections.value.find((col) => col.id === collectionID)
    if (!collection) return null

    const newRequest: SOAPCollectionRequest = {
      id: uniqueID(),
      name,
      request,
    }

    collection.requests.push(newRequest)
    collectionsRefStore.setValue(collections.value)

    saveCollections()
    return newRequest
  }

  // Create a folder in a collection
  function createFolder(
    collectionID: string,
    name: string,
    path: string[] = []
  ) {
    const collection = collections.value.find((col) => col.id === collectionID)
    if (!collection) return null

    // If path is empty, create folder at root level
    if (path.length === 0) {
      const newFolder: SOAPFolder = {
        id: uniqueID(),
        name,
        folders: [],
        requests: [],
      }

      collection.folders.push(newFolder)
      collectionsRefStore.setValue(collections.value)

      saveCollections()
      return newFolder
    }

    // Otherwise navigate the path
    let currentFolders = collection.folders
    let targetFolder = null

    for (let i = 0; i < path.length; i++) {
      const folderID = path[i]
      targetFolder = currentFolders.find((folder) => folder.id === folderID)

      if (!targetFolder) return null

      currentFolders = targetFolder.folders
    }

    if (!targetFolder) return null

    const newFolder: SOAPFolder = {
      id: uniqueID(),
      name,
      folders: [],
      requests: [],
    }

    targetFolder.folders.push(newFolder)
    collectionsRefStore.setValue(collections.value)

    saveCollections()
    return newFolder
  }

  // Computed value for collection references
  const collectionsRef = computed(() => collectionsRefStore.getValue())

  // Initialize the store by loading data
  loadCollections()
  // Import a collection
  function importCollection(collectionData: SOAPCollection) {
    // Check if collection with same ID exists
    const existingIndex = collections.value.findIndex(
      (col) => col.id === collectionData.id
    )

    if (existingIndex !== -1) {
      // Replace existing collection
      collections.value.splice(existingIndex, 1, collectionData)
    } else {
      // Add as new collection
      collections.value.push(collectionData)
    }

    collectionsRefStore.setValue(collections.value)
    saveCollections()

    return collectionData
  }

  return {
    collections,
    collectionsRef,
    createCollection,
    deleteCollection,
    addRequest,
    createFolder,
    saveCollections,
    importCollection,
  }
})
