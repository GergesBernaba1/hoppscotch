<template>
  <div class="flex flex-col flex-1">
    <div class="sticky z-10 flex items-center justify-between px-4 py-2 bg-primary top-upperRequestRect">
      <div class="flex items-center">
        <span class="inline-flex items-center px-2 font-semibold">
          {{ t("soap.collections") }}
        </span>
        <span class="inline-flex items-center ltr:ml-2 rtl:mr-2 px-2 py-0.5 text-tiny font-semibold rounded badge">
          {{ collections.length }}
        </span>
      </div>
      <div class="flex">
        <HoppButtonSecondary
          v-tippy="{ content: 'Create from WSDL' }"
          @click="showCreateFromWSDLModal = true"
          class="mr-2"
        >
          <IconFileText />
          <span>From WSDL</span>
        </HoppButtonSecondary>
        <HoppButtonSecondary
          v-tippy="{ content: 'Export' }"
          @click="exportCollections"
        >
          <IconDownload />
        </HoppButtonSecondary>
        <HoppButtonSecondary
          v-tippy="{ content: 'Import' }"
          @click="importCollections"
          class="ml-2"
        >
          <IconUpload />
        </HoppButtonSecondary>
        <HoppButtonSecondary
          class="ml-2"
          @click="addNewCollection"
        >
          <IconPlus />
          <span>Add</span>
        </HoppButtonSecondary>
      </div>
    </div>

    <div class="flex flex-col flex-1 overflow-auto divide-y divide-dividerLight bg-primary">
      <template v-if="collections.length > 0">
        <div 
          v-for="collection in collections" 
          :key="collection.id"
          class="flex flex-col"
        >
          <div 
            class="flex items-center px-4 py-2 bg-primary hover:bg-secondary group cursor-pointer"
            @click="toggleCollectionExpand(collection.id)"
          >
            <div class="flex flex-1 items-center">
              <span :class="{ 'transform rotate-90': expandedCollections.includes(collection.id) }">
                <IconChevronRight />
              </span>
              <span class="px-4 font-semibold truncate">{{ collection.name }}</span>
              <span class="px-2 py-0.5 text-tiny font-semibold rounded badge">
                {{ getCollectionRequestCount(collection) }}
              </span>
            </div>
            <div class="flex opacity-0 group-hover:opacity-100 transition-opacity">
              <button @click.stop="deleteCollection(collection.id)" class="p-1 text-red-500 hover:text-red-700">
                <IconTrash class="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <!-- Collection content when expanded -->
          <div v-if="expandedCollections.includes(collection.id)" class="px-4 py-2 bg-secondary">
            <div v-if="collection.requests.length > 0" class="space-y-2">
              <div v-for="request in collection.requests" :key="request.id" class="flex items-center p-2 hover:bg-primary rounded">
                <span class="flex-1">{{ request.name }}</span>
                <button @click="openRequest(request)" class="p-1 text-accent hover:text-accent-dark">
                  <IconPlay class="w-4 h-4" />
                </button>
              </div>
            </div>
            <div v-else class="text-secondaryLight text-sm">
              No requests in this collection
            </div>
          </div>
        </div>
      </template>
      <div v-else class="flex flex-col items-center justify-center flex-1 p-4">
        <span class="mb-4 text-secondaryLight">No collections found</span>
        <HoppButtonSecondary @click="addNewCollection">
          <IconPlus />
          <span>Create your first collection</span>
        </HoppButtonSecondary>
      </div>
    </div>

    <!-- Create from WSDL Modal -->    <HoppSmartModal
      v-model="showCreateFromWSDLModal"
      :title="t('soap.create_from_wsdl')"
      @close="showCreateFromWSDLModal = false"
    >
      <div class="flex flex-col space-y-4">
        <div>
          <label class="block text-sm font-medium mb-2">{{ t('soap.wsdl_url') }}</label>
          <input
            v-model="wsdlUrl"
            type="text"
            class="w-full px-3 py-2 border rounded bg-primary"
            :placeholder="t('soap.enter_wsdl_url')"
          />
        </div>
        
        <div>
          <label class="block text-sm font-medium mb-2">{{ t('soap.collection_name') }}</label>
          <input
            v-model="collectionName"
            type="text"
            class="w-full px-3 py-2 border rounded bg-primary"
            :placeholder="t('soap.enter_collection_name')"
          />
        </div>

        <div v-if="wsdlError" class="text-red-500 text-sm">
          {{ wsdlError }}
        </div>

        <div class="flex justify-end space-x-2">
          <HoppButtonSecondary @click="showCreateFromWSDLModal = false">
            {{ t('action.cancel') }}
          </HoppButtonSecondary>
          <HoppButtonPrimary 
            @click="createFromWSDL"
            :loading="creatingFromWSDL"
            :disabled="!wsdlUrl || !collectionName"
          >
            {{ t('soap.create_collection') }}
          </HoppButtonPrimary>
        </div>
      </div>
    </HoppSmartModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue"
import { useI18n } from "vue-i18n"
import { useToast } from "../../composables/toast"
import { useSOAPCollectionStore } from "../../newstore/SOAPCollection"
import { makeSOAPRequest } from "@hoppscotch/data"
import { parseWSDL } from "../../helpers/soap/wsdl-parser"
import { getService } from "../../modules/dioc"
import { SOAPTabService } from "../../services/tab/soap"
import * as E from "fp-ts/Either"
import IconDownload from "~icons/lucide/download"
import IconUpload from "~icons/lucide/upload"
import IconPlus from "~icons/lucide/plus" 
import IconChevronRight from "~icons/lucide/chevron-right"
import IconTrash from "~icons/lucide/trash"
import IconPlay from "~icons/lucide/play"
import IconFileText from "~icons/lucide/file-text"
import { HoppButtonSecondary, HoppButtonPrimary, HoppSmartModal } from "@hoppscotch/ui"

const { t } = useI18n()
const toast = useToast()
const collectionStore = useSOAPCollectionStore()
const tabService = getService(SOAPTabService)

// Reactive data
const expandedCollections = ref<string[]>([])
const showCreateFromWSDLModal = ref(false)
const wsdlUrl = ref("")
const collectionName = ref("")
const wsdlError = ref("")
const creatingFromWSDL = ref(false)

// Computed
const collections = computed(() => collectionStore.collections)

// Methods
function addNewCollection() {
  const name = prompt("Enter collection name:")
  if (name) {
    collectionStore.createCollection(name)
    toast.success(t("soap.collection_created"))
  }
}

function toggleCollectionExpand(id: string) {
  const index = expandedCollections.value.indexOf(id)
  if (index === -1) {
    expandedCollections.value.push(id)
  } else {
    expandedCollections.value.splice(index, 1)
  }
}

function deleteCollection(id: string) {
  if (confirm("Are you sure you want to delete this collection?")) {
    collectionStore.deleteCollection(id)
    toast.success(t("soap.collection_deleted"))
  }
}

// Define the proper types to match the actual structure from the store
interface SOAPCollection {
  id: string
  name: string
  folders?: any[]  // Add if needed in the future
  requests: {
    id: string
    name: string
    request: {
      endpoint: string
      wsdlUrl?: string
      soapVersion: string
      operation?: string
      params: { key: string; value: string; active: boolean }[]
      headers: { key: string; value: string; active: boolean }[]
      body: string
      auth: { authType: string; authActive: boolean; [key: string]: any }
      name: string
      preRequestScript: string
      testScript: string
      attachments?: { 
        name: string; 
        contentType: string; 
        contentId: string; 
        content: any; // Using any to accommodate both File and serialized content
        active: boolean 
      }[]
      useMtom?: boolean
    }
    documentation?: string
  }[]
}

function getCollectionRequestCount(collection: SOAPCollection) {
  return collection.requests.length
}

function openRequest(collectionRequest: { id: string; name: string; request: any }) {
  try {
    // Create a new tab using SOAPTabService with the request from the collection
    const newTab = tabService.createNewTab({
      type: "request",
      request: { ...collectionRequest.request }, // Clone the request object to avoid reference issues
      response: null,
      isDirty: false,
      optionTabPreference: "params", // Set a default preference
    })
    
    // Set the new tab as active
    if (newTab) {
      tabService.setActiveTab(newTab.id)
      
      // Inform user
      toast.success(t("soap.request_opened_in_tab"))
    } else {
      toast.error(t("soap.failed_to_open_request"))
    }
  } catch (error) {
    console.error("Error opening request:", error instanceof Error ? error.message : String(error))
    toast.error(t("soap.failed_to_open_request"))
  }
}

function validateWSDLContent(content: string): boolean {
  if (!content || content.trim() === '') {
    return false
  }
  
  // Check for basic WSDL elements
  const hasDefinitions = content.includes('<wsdl:definitions') || 
                        content.includes('<definitions') ||
                        content.includes(':definitions')
                        
  const hasOperations = content.includes('<wsdl:operation') || 
                       content.includes('<operation') ||
                       content.includes(':operation')
                       
  const hasBinding = content.includes('<wsdl:binding') || 
                    content.includes('<binding') ||
                    content.includes(':binding')
  
  console.log("WSDL validation:", { hasDefinitions, hasOperations, hasBinding })
  
  // Require at least definitions and either operations or bindings
  return hasDefinitions && (hasOperations || hasBinding)
}

async function createFromWSDL() {
  if (!wsdlUrl.value || !collectionName.value) return

  creatingFromWSDL.value = true
  wsdlError.value = ""
  
  // Define types for operations and services
  type WSDLOperation = {
    name: string
    soapAction?: string
    input?: string
    output?: string
    inputElement?: string
    outputElement?: string
    documentation?: string
  }
  
  type WSDLService = {
    name: string
    port?: {
      address: string
      binding?: string
      name?: string
    }
    documentation?: string
  }
  
  let operations: WSDLOperation[] = [];
  let services: WSDLService[] = [];
  
  try {
    console.log(`Starting WSDL parse process for URL: ${wsdlUrl.value}`)
    
    // Fetch WSDL content directly
    const response = await fetch(wsdlUrl.value)
    if (!response.ok) {
      throw new Error(`Failed to fetch WSDL: ${response.statusText}`)
    }
    
    const wsdlContent = await response.text()
    console.log(`Fetched WSDL content length: ${wsdlContent.length} bytes`)
    console.log(`WSDL content preview: ${wsdlContent.substring(0, 200)}...`)
    
    // Parse the WSDL directly, ALWAYS passing the URL as baseUrl for resolving imports
    console.log(`Calling parseWSDL with baseUrl: ${wsdlUrl.value}`)
    const result = await parseWSDL(wsdlContent, wsdlUrl.value);
    
    if (E.isLeft(result)) {
      const error = result.left;
      console.error("WSDL parse error:", error)
      wsdlError.value = error instanceof Error ? error.message : String(error);
      toast.error(error instanceof Error ? error.message : String(error));
      return
    }    console.log("WSDL parse succeeded, result:", result.right)
    
    // Extract the parsed data
    const parsedData = result.right;
    operations = parsedData.operations || [];
    services = parsedData.services || [];

    // Create the collection
    const collection = collectionStore.createCollection(collectionName.value)

    // Add operations as requests
// Check if there are operations in the WSDL
if (!operations || operations.length === 0) {
  console.error("No operations found in the WSDL file");
  wsdlError.value = "No operations found in the WSDL file. The WSDL may be invalid or in an unsupported format.";
  toast.error("No operations found in the WSDL file");
  creatingFromWSDL.value = false;
  return;
}

console.log(`Found ${operations.length} operations in the WSDL:`, 
  operations.map(op => op.name).join(', '));

operations.forEach((operation) => {
  // Get endpoint from services
  const endpoint = services.length > 0 && services[0]?.port?.address ? services[0].port.address : ""
  
  // Create more detailed documentation
  let documentationParts = [`Operation: ${operation.name}`]
  
  // Add SOAP Action if available
  if (operation.soapAction) {
    documentationParts.push(`SOAP Action: ${operation.soapAction}`)
  }
  
  // Add input information
  if (operation.input || operation.inputElement) {
    documentationParts.push(`Input Message: ${operation.input || ''}`)
    documentationParts.push(`Input Element: ${operation.inputElement || ''}`)
  }
  
  // Add output information
  if (operation.output || operation.outputElement) {
    documentationParts.push(`Output Message: ${operation.output || ''}`)
    documentationParts.push(`Output Element: ${operation.outputElement || ''}`)
  }
  
  // Add operation documentation if available
  if (operation.documentation) {
    documentationParts.push(`Description: ${operation.documentation}`)
  }
  
  const operationDoc = documentationParts.join('\n')
  
  // Create standard SOAP request with operation
  const soapRequest = makeSOAPRequest({
    name: operation.name,
    endpoint: endpoint,
    wsdlUrl: wsdlUrl.value,
    soapVersion: "1.1",
    auth: { authType: "none", authActive: true },
    headers: [],
    params: [],
    operation: operation.name,
    body: "",
    preRequestScript: "",
    testScript: "",
    attachments: [],
    useMtom: false,
  })

  console.log(`Creating request for operation: ${operation.name}`)
  
  // Add request with documentation
  const newRequest = collectionStore.addRequest(collection.id, soapRequest, operation.name)
  
  // If request was added successfully, update its documentation
  if (newRequest && operationDoc) {
    newRequest.documentation = operationDoc
    console.log(`Added documentation for operation: ${operation.name}`)
    // Trigger save to persist the documentation
    collectionStore.saveCollections()
  } else if (!newRequest) {
    console.error(`Failed to add request for operation: ${operation.name}`)
  }
})

    showCreateFromWSDLModal.value = false
    wsdlUrl.value = ""
    collectionName.value = ""
    
    toast.success(t("soap.collection_created_from_wsdl", { count: operations.length }))
  } catch (error) {
    wsdlError.value = error instanceof Error ? error.message : "Unknown error"
    toast.error(wsdlError.value)
  } finally {
    creatingFromWSDL.value = false
  }
}

function exportCollections() {
  const data = JSON.stringify(collections.value, null, 2)
  const blob = new Blob([data], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = "soap-collections.json"
  link.click()
  URL.revokeObjectURL(url)
  toast.success(t("soap.collections_exported"))
}

function importCollections() {
  const input = document.createElement("input")
  input.type = "file"
  input.accept = "application/json"
  input.onchange = (e) => {
    const target = e.target as HTMLInputElement
    if (target && target.files && target.files.length > 0) {
      const file = target.files[0]
      
      const reader = new FileReader()
      reader.onload = () => {
        try {
          if (typeof reader.result === 'string') {
            const importedCollections = JSON.parse(reader.result)
            if (Array.isArray(importedCollections)) {
              importedCollections.forEach(collection => {
                collectionStore.importCollection(collection)
              })
              toast.success(t("soap.collections_imported"))
            }
          }
        } catch (error) {
          console.error("Error importing collections:", error)
          toast.error(t("soap.import_error"))
        }
      }
      reader.readAsText(file)
    }
  }
  input.click()
}
</script>

<style scoped>
.badge {
  background-color: rgba(var(--accent-color), 0.2);
  color: rgb(var(--accent-color));
}
</style>
