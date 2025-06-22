<template>
  <div class="flex flex-col flex-1 bg-primary">
    <div class="flex items-center justify-between p-4 border-b border-dividerLight">
      <h1 class="text-xl font-bold">SOAP API</h1>
      <button
        class="px-4 py-2 bg-accent text-white rounded hover:bg-accentDark flex items-center"
        @click="showNewProjectModal = true"
      >
        <svg viewBox="0 0 24 24" class="w-5 h-5 mr-2">
          <path fill="currentColor" d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z" />
        </svg>
        New Project
      </button>
    </div>
    
    <div class="flex flex-1 overflow-hidden">
      <!-- Sidebar -->
      <div class="w-72 border-r border-dividerLight flex flex-col">
        <div class="flex border-b border-dividerLight">
          <button
            class="flex-1 py-2 text-center"
            :class="{ 'bg-primaryLight border-b-2 border-accent': sidebarTab === 'operations' }"
            @click="sidebarTab = 'operations'"
          >
            Operations
          </button>
          <button
            class="flex-1 py-2 text-center"
            :class="{ 'bg-primaryLight border-b-2 border-accent': sidebarTab === 'history' }"
            @click="sidebarTab = 'history'"
          >
            History
          </button>
        </div>
        
        <div class="flex-1 overflow-y-auto p-2">
          <div v-if="sidebarTab === 'operations'">
            <div v-if="parsedOperations.length > 0">
              <div v-for="op in parsedOperations" :key="op.name"
                  class="flex items-center p-2 cursor-pointer hover:bg-primaryLight rounded"
                  @click="openOperationAsTab(op)">
                <span class="truncate">{{ op.name }}</span>
              </div>
            </div>
            <p v-else class="text-secondaryLight p-4 text-center">
              Create a new project to see operations.
            </p>
          </div>
          <div v-if="sidebarTab === 'history'">
            <p class="text-secondaryLight p-4 text-center">History is not yet implemented.</p>
          </div>
        </div>
      </div>
      
      <!-- Main Content -->
      <div class="flex flex-col flex-1 overflow-hidden">
        <div v-if="tabsList.length === 0" class="flex flex-col items-center justify-center h-full text-secondaryLight">
          <img src="/logo.svg" alt="Hoppscotch" class="w-24 h-24 mb-4 opacity-25" />
          <h2 class="text-lg font-semibold">SOAP Request Tabs</h2>
          <p>Select an operation from the sidebar to start a request.</p>
        </div>
        <div v-else>
          <!-- Placeholder for tabbed request/response views -->
          <div v-for="tab in tabsList" :key="tab.id" class="p-4">
            <h3 class="font-semibold">{{ tab.document.request.name }}</h3>
            <pre class="bg-primaryLight p-2 rounded mt-2 text-xs overflow-auto">{{ tab.document.request.body }}</pre>
          </div>
        </div>
      </div>
    </div>
    
    <!-- New Project Modal -->
    <div v-if="showNewProjectModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div class="bg-primary w-full max-w-md p-6 rounded-lg shadow-lg">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-bold">New SOAP Project</h2>
          <button @click="showNewProjectModal = false" class="text-secondary hover:text-accent">
            <svg viewBox="0 0 24 24" class="w-6 h-6">
              <path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
            </svg>
          </button>
        </div>
        
        <div class="space-y-4">
          <div>
            <label for="projectName" class="block mb-2 font-semibold">Project Name</label>
            <input 
              id="projectName"
              v-model="projectName"
              type="text"
              class="w-full p-2 bg-primaryLight border border-dividerLight rounded"
              placeholder="Enter project name"
            />
          </div>
          
          <div>
            <label class="block mb-2 font-semibold">WSDL Source</label>
            <div class="space-y-2">
              <div class="flex items-center space-x-2">
                <input 
                  type="radio" 
                  id="wsdlUrl"
                  v-model="wsdlSource" 
                  value="url"
                  class="text-accent"
                />
                <label for="wsdlUrl" class="text-sm">WSDL URL</label>
              </div>
              <div class="flex items-center space-x-2">
                <input 
                  type="radio" 
                  id="wsdlFile" 
                  v-model="wsdlSource" 
                  value="file"
                  class="text-accent"
                />
                <label for="wsdlFile" class="text-sm">Upload WSDL File</label>
              </div>
            </div>
          </div>
          
          <div v-if="wsdlSource === 'url'">
            <label for="wsdlUrlInput" class="block mb-2 font-semibold">WSDL URL</label>
            <input 
              id="wsdlUrlInput"
              v-model="wsdlUrl"
              type="text"
              class="w-full p-2 bg-primaryLight border border-dividerLight rounded"
              placeholder="Enter WSDL URL"
            />
          </div>
            
          <div v-if="wsdlSource === 'file'">
            <label for="wsdlFileInput" class="block mb-2 font-semibold">WSDL File</label>
            <div class="border-2 border-dashed border-dividerLight rounded-lg p-4 text-center">
              <input 
                id="wsdlFileInput"
                ref="fileInput"
                type="file"
                accept=".wsdl,.xml"
                @change="handleFileUpload"
                class="hidden"
              />
              <div v-if="!selectedFile" @click="fileInput?.click()" class="cursor-pointer">
                <svg viewBox="0 0 24 24" class="w-8 h-8 mx-auto mb-2 text-secondaryLight">
                  <path fill="currentColor" d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                </svg>
                <p class="text-secondaryLight">Click to select WSDL file</p>
                <p class="text-xs text-secondaryLight mt-1">Supports .wsdl and .xml files</p>
              </div>
              <div v-else class="text-left">
                <div class="flex items-center justify-between">
                  <div>
                    <p class="font-medium">{{ selectedFile.name }}</p>
                    <p class="text-sm text-secondaryLight">{{ formatFileSize(selectedFile.size) }}</p>
                  </div>
                  <button 
                    @click="removeFile" 
                    class="text-red-500 hover:text-red-700"
                    type="button"
                  >
                    <svg viewBox="0 0 24 24" class="w-5 h-5">
                      <path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div v-if="parsedEndpoints.length > 0" class="mt-4">
            <label class="block mb-2 font-semibold">Select Endpoint</label>
            <select v-model="selectedEndpoint" class="w-full p-2 bg-primaryLight border border-dividerLight rounded">
              <option v-for="ep in parsedEndpoints" :key="ep.address" :value="ep.address">{{ ep.label }}</option>
            </select>
          </div>
        </div>
        
        <div class="flex justify-end space-x-2 mt-6">
          <button
            class="px-4 py-2 border border-dividerLight rounded hover:bg-primaryLight"
            @click="showNewProjectModal = false"
          >
            Cancel
          </button>
          <button
            class="px-4 py-2 bg-accent text-white rounded hover:bg-accentDark"
            @click="createProject"
            :disabled="!projectName.trim() || isCreating"
          >
            <span v-if="isCreating">Creating...</span>
            <span v-else>Create</span>
          </button>
        </div>
      </div>
    </div>
    
    <!-- Request Details Modal -->
    <div v-if="showRequestDetails" class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div class="bg-primary w-full max-w-4xl max-h-[90vh] p-6 rounded-lg shadow-lg overflow-y-auto">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-bold">Request Details</h2>
          <button @click="showRequestDetails = false" class="text-secondary hover:text-accent">
            <svg viewBox="0 0 24 24" class="w-6 h-6">
              <path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
            </svg>
          </button>
        </div>
        
        <div v-if="selectedRequest" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block mb-2 font-semibold">Request Name</label>
              <div class="p-3 bg-primaryLight border border-dividerLight rounded">
                {{ selectedRequest.name || 'Untitled Request' }}
              </div>
            </div>
            
            <div>
              <label class="block mb-2 font-semibold">SOAP Version</label>
              <div class="p-3 bg-primaryLight border border-dividerLight rounded">
                {{ selectedRequest.soapVersion }}
              </div>
            </div>
            
            <div class="md:col-span-2">
              <label class="block mb-2 font-semibold">Endpoint URL</label>
              <div class="p-3 bg-primaryLight border border-dividerLight rounded break-all">
                {{ selectedRequest.endpoint || 'No endpoint set' }}
              </div>
            </div>
            
            <div v-if="selectedRequest.operation">
              <label class="block mb-2 font-semibold">Operation</label>
              <div class="p-3 bg-primaryLight border border-dividerLight rounded">
                {{ selectedRequest.operation }}
              </div>
            </div>
            
            <div v-if="selectedRequest.wsdlUrl">
              <label class="block mb-2 font-semibold">WSDL URL</label>
              <div class="p-3 bg-primaryLight border border-dividerLight rounded break-all">
                {{ selectedRequest.wsdlUrl }}
              </div>
            </div>
          </div>
          
          <div v-if="selectedRequest.body">
            <label class="block mb-2 font-semibold">SOAP Body</label>
            <div class="p-3 bg-primaryLight border border-dividerLight rounded">
              <pre class="text-sm overflow-x-auto">{{ selectedRequest.body }}</pre>
            </div>
          </div>
          
          <div v-if="selectedRequest.headers && selectedRequest.headers.length > 0">
            <label class="block mb-2 font-semibold">Headers</label>
            <div class="p-3 bg-primaryLight border border-dividerLight rounded">
              <div v-for="header in selectedRequest.headers" :key="header.key" class="mb-1">
                <span class="font-medium">{{ header.key }}:</span> {{ header.value }}
              </div>
            </div>
          </div>
          
          <div v-if="selectedRequest.params && selectedRequest.params.length > 0">
            <label class="block mb-2 font-semibold">Parameters</label>
            <div class="p-3 bg-primaryLight border border-dividerLight rounded">
              <div v-for="param in selectedRequest.params" :key="param.key" class="mb-1">
                <span class="font-medium">{{ param.key }}:</span> {{ param.value }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue"
import { getService } from "../modules/dioc"
import { useI18n } from "vue-i18n"
import * as E from "fp-ts/Either"
import shortid from "shortid"
import { HoppSOAPRequest, makeSOAPRequest } from "@hoppscotch/data"
import { useService } from "dioc/vue"
import { TabService } from "~/services/tab"

// Import services and utilities
import { SOAPTabService } from "../services/tab/soap"
import { getDefaultSOAPRequest } from "../helpers/soap/default"
import { useToast } from "../composables/toast"
import {
  parseWSDL,
  WSDLOperation,
  WSDLService,
  fetchWSDL,
  generateRequestFromWSDL,
  WSDLParseResult,
} from "../helpers/soap/wsdl-parser"

const { t } = useI18n()
const toast = useToast()

const tabService = getService(SOAPTabService)
const sidebarTab = ref("operations")

// Modal state
const showNewProjectModal = ref(false)
const showRequestDetails = ref(false)
const selectedRequest = ref<any>(null)

// Create a computed property that always reflects the current tabs
const tabsList = computed(() => {
  try {
    return tabService.tabs.value
  } catch (error) {
    console.error('[SOAP Page] Error accessing tabs:', error)
    return []
  }
})

// SOAP Project modal state and functions
const projectName = ref("")
const wsdlUrl = ref("")
const wsdlSource = ref("url")
const selectedFile = ref<File | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const isCreating = ref(false)
const parsedOperations = ref<WSDLOperation[]>([])
const parsedEndpoints = ref<{ label: string, address: string }[]>([])
const selectedEndpoint = ref("")
const targetNamespace = ref<string | undefined>("")
const wsdlOperations = ref<WSDLOperation[]>([])
const wsdlServices = ref<WSDLService[]>([])
const selectedService = ref<WSDLService | null>(null)
const parsedWSDLResult = ref<WSDLParseResult | null>(null)

// Format file size helper
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Create SOAP project
const createProject = async () => {
  isCreating.value = true
  wsdlOperations.value = []
  wsdlServices.value = []
  selectedService.value = null
  parsedWSDLResult.value = null

  let wsdlContent: string | null = null
  let baseUrl: string | undefined

  try {
    if (wsdlSource.value === "file" && selectedFile.value) {
      wsdlContent = await selectedFile.value.text()
      baseUrl = undefined
    } else if (wsdlSource.value === "url" && wsdlUrl.value) {
      baseUrl = wsdlUrl.value
      const wsdlContentEither = await fetchWSDL(wsdlUrl.value)
      if (E.isLeft(wsdlContentEither)) {
        toast.error(wsdlContentEither.left.message)
        isCreating.value = false
        return
      }
      wsdlContent = wsdlContentEither.right
    } else {
      toast.error("No WSDL source provided.")
      isCreating.value = false
      return
    }

    if (!wsdlContent) {
      toast.error("Failed to load WSDL content.")
      isCreating.value = false
      return
    }

    const parseResult = await parseWSDL(wsdlContent, baseUrl)
    if (E.isLeft(parseResult)) {
      toast.error(parseResult.left.message)
      isCreating.value = false
      return
    }

    parsedWSDLResult.value = parseResult.right
    const parsedWSDL = parsedWSDLResult.value

    console.log("Parsed WSDL Details:", {
      operations: parsedWSDL.operations,
      services: parsedWSDL.services,
      schemas: Object.fromEntries(parsedWSDL.schemas),
      targetNamespace: parsedWSDL.targetNamespace,
    })

    if (parsedWSDL.operations.length === 0) {
      toast.error("No operations found in the WSDL.")
      isCreating.value = false
      return
    }

    wsdlOperations.value = parsedWSDL.operations
    wsdlServices.value = parsedWSDL.services
    selectedService.value = parsedWSDL.services[0] ?? null
    parsedEndpoints.value = parsedWSDL.services
      .filter((service: any) => service.port && service.port.address)
      .map((service: any) => ({
        label: `${service.name} / ${service.port.name} - ${service.port.address}`,
        address: service.port.address,
      }))
    selectedEndpoint.value = parsedEndpoints.value[0]?.address || ""
    targetNamespace.value = parsedWSDL.targetNamespace
    parsedOperations.value = parsedWSDL.operations // Populate the sidebar

    toast.success("WSDL parsed successfully")
    showNewProjectModal.value = false // Close modal on success
  } catch (err) {
    const error = err instanceof Error ? err.message : "An unknown error occurred"
    toast.error(`Failed to process WSDL: ${error}`)
  } finally {
    isCreating.value = false
  }
}

// Operation Handling
const openOperationAsTab = (operation: WSDLOperation) => {
  if (!parsedWSDLResult.value) {
    toast.error("WSDL not parsed correctly. Cannot open operation.")
    return
  }

  const requestBody = generateRequestFromWSDL(parsedWSDLResult.value, operation.name)
  const finalBody = requestBody || `<tns:${operation.name}></tns:${operation.name}>`
  
  const soapBody = generateSoapEnvelope(
    finalBody,
    parsedWSDLResult.value.targetNamespace
  )

  const soapRequest: HoppSOAPRequest = {
    ...makeSOAPRequest({}),
    name: operation.name,
    endpoint: selectedEndpoint.value,
    wsdlUrl: wsdlUrl.value,
    body: soapBody,
    headers: operation.soapAction ? [{ key: 'SOAPAction', value: operation.soapAction, active: true }] : [],
  }
  
  const existingTab = tabService.tabs.value.find(t => t.document.request.name === operation.name)
  if (existingTab) {
    tabService.setActiveTab(existingTab.id)
  } else {
    tabService.createNewTab({
      type: "request",
      request: soapRequest,
      response: null,
      isDirty: false,
    })
  }
}

const generateSoapEnvelope = (bodyContent: string, tns?: string): string => {
  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tns="${tns || ''}">
  <soap:Header />
  <soap:Body>
    ${bodyContent}
  </soap:Body>
</soap:Envelope>`
}

const handleFileUpload = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    selectedFile.value = file
    wsdlUrl.value = URL.createObjectURL(file)
  }
}

const removeFile = () => {
  selectedFile.value = null
  if (wsdlSource.value === "file") {
    wsdlUrl.value = ""
  }
}

watch(selectedService, (newService) => {
  if (newService) {
    // ... existing code ...
  }
})

onMounted(() => {
  try {
    console.log('[SOAP Page] Component mounted')
    console.log('[SOAP Page] Current tabs:', tabsList.value)
  } catch (error) {
    console.error('[SOAP Page] Error during mount:', error)
  }
})
</script>

<route lang="yaml">
meta:
  title: "SOAP"
  layout: default
</route>
