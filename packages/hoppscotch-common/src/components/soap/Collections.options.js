import { ref } from "vue"
import { useI18n } from "vue-i18n"
import { exportSOAPCollection, importSOAPCollection } from "../helpers/soap/soap-import-export"
import { SOAPCollection, SOAPCollectionRequest, useSOAPCollectionStore } from "../newstore/SOAPCollection"
import { useSOAPTabService } from "../composables/useSOAPTab"
import { makeSOAPRequest } from "@hoppscotch/data"
import { HoppButtonSecondary, HoppButtonPrimary, HoppSmartModal } from "@hoppscotch/ui"

export default {
  name: "SoapCollections",
  setup() {
    const { t } = useI18n()
    const collectionsStore = useSOAPCollectionStore()
    const tabService = useSOAPTabService()

    const collections = collectionsStore.collections
    const expandedCollections = ref([])
    const showNewCollectionModal = ref(false)
    const showDeleteCollectionModal = ref(false)
    const newCollectionName = ref("")
    const editingCollectionID = ref(null)
    const collectionToDelete = ref(null)
    const importFileInput = ref(null)

    // Toggle collection expand state
    function toggleCollectionExpand(collectionID) {
      const index = expandedCollections.value.indexOf(collectionID)
      if (index === -1) {
        expandedCollections.value.push(collectionID)
      } else {
        expandedCollections.value.splice(index, 1)
      }
    }

    // Get total item count (requests + folders) in a collection
    function getCollectionItemCount(collection) {
      return collection.requests.length + collection.folders.length
    }

    // Handle adding a new collection
    function addNewCollection() {
      newCollectionName.value = ""
      editingCollectionID.value = null
      showNewCollectionModal.value = true
    }

    // Handle editing a collection
    function editCollection(collectionID) {
      const collection = collections.value.find(c => c.id === collectionID)
      if (collection) {
        newCollectionName.value = collection.name
        editingCollectionID.value = collectionID
        showNewCollectionModal.value = true
      }
    }

    // Save new or edited collection
    function saveCollection() {
      if (!newCollectionName.value.trim()) return
      
      if (editingCollectionID.value) {
        // Edit existing collection
        const collection = collections.value.find(c => c.id === editingCollectionID.value)
        if (collection) {
          collection.name = newCollectionName.value.trim()
          collectionsStore.saveCollections()
        }
      } else {
        // Create new collection
        collectionsStore.createCollection(newCollectionName.value.trim())
      }
      
      showNewCollectionModal.value = false
    }

    // Initialize delete collection flow
    function confirmDeleteCollection(collectionID) {
      collectionToDelete.value = collectionID
      showDeleteCollectionModal.value = true
    }

    // Delete the selected collection
    function deleteSelectedCollection() {
      if (collectionToDelete.value) {
        collectionsStore.deleteCollection(collectionToDelete.value)
        showDeleteCollectionModal.value = false
        collectionToDelete.value = null
      }
    }

    // Add new folder to collection
    function addNewFolderToCollection(collectionID) {
      // Simplified for now - will show a modal in full implementation
      collectionsStore.createFolder(collectionID, "New Folder")
    }

    // Add new request to collection
    function addNewRequestToCollection(collectionID) {
      // Create an empty SOAP request
      const newRequest = makeSOAPRequest({
        name: "New Request",
        endpoint: "",
        soapVersion: "1.1"
      })
      
      // Add to collection
      collectionsStore.addRequest(collectionID, newRequest, "New Request")
    }

    // Select folder
    function selectFolder(collectionID, folderID) {
      // Implementation for folder selection
      // Will expand/navigate into folder
    }

    // Load request into active tab
    function loadRequest(request) {
      // Get active tab ID
      const activeTabID = tabService.getActiveTab()
      if (activeTabID) {
        // Update the request in the active tab
        tabService.updateRequest(activeTabID, request.request)
      }
    }

    // Export collections
    function exportCollections() {
      if (collections.value.length === 0) {
        return
      }
      
      // Create a download for the collection JSON
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(
        JSON.stringify(collections.value, null, 2)
      )
      
      const downloadAnchor = document.createElement("a")
      downloadAnchor.setAttribute("href", dataStr)
      downloadAnchor.setAttribute("download", "soap_collections.json")
      document.body.appendChild(downloadAnchor)
      downloadAnchor.click()
      downloadAnchor.remove()
    }

    // Import collections
    function importCollections() {
      const fileInput = document.createElement("input")
      fileInput.type = "file"
      fileInput.accept = "application/json"
      
      fileInput.onchange = (e) => {
        const file = e.target.files[0]
        if (!file) return
        
        const reader = new FileReader()
        reader.onload = (e) => {
          try {
            const importedData = JSON.parse(e.target.result)
            
            if (Array.isArray(importedData)) {
              // Handle array of collections
              importedData.forEach(collection => {
                collectionsStore.importCollection(collection)
              })
            } else if (typeof importedData === "object" && importedData !== null) {
              // Handle single collection
              collectionsStore.importCollection(importedData)
            }
          } catch (error) {
            console.error("Error importing collections:", error)
            // Show error notification or modal
          }
        }
        reader.readAsText(file)
      }
      
      fileInput.click()
    }

    return {
      t,
      collections,
      expandedCollections,
      showNewCollectionModal,
      showDeleteCollectionModal,
      newCollectionName,
      editingCollectionID,
      collectionToDelete,
      toggleCollectionExpand,
      getCollectionItemCount,
      addNewCollection,
      editCollection,
      saveCollection,
      confirmDeleteCollection,
      deleteSelectedCollection,
      addNewFolderToCollection,
      addNewRequestToCollection,
      selectFolder,
      loadRequest,
      exportCollections,
      importCollections
    }
  }
}
