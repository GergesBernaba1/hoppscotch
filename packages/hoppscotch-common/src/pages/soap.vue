<template>
  <div class="soap-page flex flex-col flex-1 bg-primary">
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
           projects
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
            <div v-if="soapProjects.length > 0">
              <!-- Projects List with collapsible sections -->
              <div v-for="project in soapProjects" :key="project.id" class="mb-2">
                <!-- Project Header -->
                <div 
                  class="flex items-center justify-between p-2 bg-primaryLight rounded cursor-pointer"
                  @click="project.expanded = !project.expanded"
                >
                  <div class="flex items-center flex-1 truncate">
                    <svg class="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path :d="project.expanded ? 'M19 9l-7 7-7-7' : 'M9 5l7 7-7 7'" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <span class="font-medium truncate">{{ project.name }}</span>
                  </div>
                  <div class="flex items-center">
                    <span class="text-xs text-secondaryLight mr-2">{{ project.operations.length }} ops</span>
                    <button 
                      class="p-1 text-red-500 hover:text-red-700 rounded focus:outline-none"
                      @click.stop="removeProject(project.id)"
                      title="Remove project"
                    >
                      <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    </button>
                  </div>
                </div>
                
                <!-- Project Content (services and operations) -->
                <div v-if="project.expanded" class="pl-4 mt-1">
                  <!-- Services -->
                  <div v-for="service in project.services" :key="service.name" class="mb-1">
                    <!-- Service Header -->
                    <div 
                      class="flex items-center justify-between p-1.5 hover:bg-primaryLight rounded cursor-pointer"
                      @click="toggleService(service.name)"
                    >
                      <div class="flex items-center">
                        <svg class="w-4 h-4 mr-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path :d="isServiceExpanded(service.name) ? 'M19 9l-7 7-7-7' : 'M9 5l7 7-7 7'" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        <span class="text-sm font-medium">{{ service.name }}</span>
                      </div>
                    </div>
                    
                    <!-- Service Endpoints and Operations -->
                    <div v-if="isServiceExpanded(service.name)" class="pl-6">
                      <!-- Endpoint if available -->
                      <div v-if="service.port?.address" class="flex items-center p-1.5 text-xs">
                        <svg class="w-3.5 h-3.5 mr-1.5 text-secondaryLight" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c-1.657 0-3-4.03-3-9s1.343-9 3-9m0 18c1.657 0 3-4.03 3-9s-1.343-9-3-9" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        <span class="truncate text-secondaryLight">{{ service.port.address }}</span>
                      </div>
                      
                      <!-- Service Operations -->
                      <div v-for="op in getOperationsForService(project, service)" :key="op.name" 
                           class="group flex items-center justify-between p-1.5 pl-2 text-sm hover:bg-primaryLight rounded cursor-pointer ml-3"
                           @click="openOperationAsTabFromProject(project, op)">
                        <div class="flex items-center flex-1 min-w-0">
                          <svg class="flex-shrink-0 w-3.5 h-3.5 mr-1.5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" stroke-linecap="round" stroke-linejoin="round"/>
                          </svg>
                          <span class="truncate">{{ op.name }}</span>
                        </div>
                        <button 
                          class="p-1 text-red-500 hover:text-red-700 rounded opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none transition-opacity"
                          @click.stop="removeOperation(project.id, op.name)"
                          title="Remove operation"
                        >
                          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke-linecap="round" stroke-linejoin="round"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <!-- Operations without service association -->
                  <div v-if="getOperationsWithoutService(project).length > 0" class="mt-2">
                    <div class="text-xs font-medium text-secondaryLight p-1">Other Operations</div>
                    <div v-for="op in getOperationsWithoutService(project)" :key="op.name" 
                         class="group flex items-center justify-between p-1.5 pl-6 text-sm hover:bg-primaryLight rounded cursor-pointer"
                         @click="openOperationAsTabFromProject(project, op)">
                      <div class="flex items-center flex-1 min-w-0">
                        <svg class="flex-shrink-0 w-3.5 h-3.5 mr-1.5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        <span class="truncate">{{ op.name }}</span>
                      </div>
                      <button 
                        class="p-1 text-red-500 hover:text-red-700 rounded opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none transition-opacity"
                        @click.stop="removeOperation(project.id, op.name)"
                        title="Remove operation"
                      >
                        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
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
        <div v-else class="flex flex-col flex-1 overflow-auto p-4 space-y-4">
          <!-- Operation Cards -->
          <div v-for="tab in tabsList" :key="tab.id" class="mb-4">
            <ImprovedSoapUI 
              :request="tab.document.request"
              :response="convertResponseType(tab.document.response)"
              :loading="tab.document.response?.type === 'loading'"
              :initialExpanded="tabExpanded[tab.id] !== false"
              @update:body="updateRequestBody(tab.id, $event)"
              @update:expanded="updateTabExpanded(tab.id, $event)"
              @edit="editRequest(tab.id)"
              @send="sendRequest(tab.id)"
              @format-xml="formatXML(tab.id)"
              @format-response="formatResponseXML(tab.id)"
              @remove="removeTabOperation(tab)"
            />
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
          
          <!-- Add import options checkboxes -->
          <div class="mt-4 border-t border-dividerLight pt-4">
            <label class="block mb-2 font-semibold">Import Options</label>
            
            <div class="space-y-2">
              <div class="flex items-center">
                <input 
                  type="checkbox" 
                  id="createSampleRequests"
                  v-model="importOptions.createSampleRequests" 
                  class="mr-2 text-accent rounded focus:ring-accent"
                />
                <label for="createSampleRequests">Create sample requests for all operations</label>
              </div>
              
              <div class="flex items-center">
                <input 
                  type="checkbox" 
                  id="createTestSuite"
                  v-model="importOptions.createTestSuite" 
                  class="mr-2 text-accent rounded focus:ring-accent"
                />
                <label for="createTestSuite">Create a TestSuite for the imported WSDL</label>
              </div>
              
              <div class="flex items-center">
                <input 
                  type="checkbox" 
                  id="createSimulation"
                  v-model="importOptions.createSimulation" 
                  class="mr-2 text-accent rounded focus:ring-accent"
                />
                <label for="createSimulation">Create a web service simulation of the imported WSDL</label>
              </div>
            </div>
          </div>
        </div>
        
        <div class="flex justify-end space-x-2 mt-6">
          <button
            class="px-4 py-2 border border-dividerLight rounded hover:bg-primaryLight"
            @click="cancelNewProjectModal"
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
    
    <!-- Edit Request Modal -->
    <SoapEditRequestModal
      v-model="showEditModal"
      :request="currentEditingRequest || makeSOAPRequest({})"
      @save="saveEditedRequest"
    />
    
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
    
    <!-- Confirmation Dialog -->
    <div v-if="showConfirmDialog" class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div class="bg-primary w-full max-w-md p-6 rounded-lg shadow-lg">
        <div class="mb-6">
          <div class="flex items-center justify-center mb-4">
            <div class="bg-red-500 bg-opacity-10 p-3 rounded-full">
              <svg viewBox="0 0 24 24" class="w-8 h-8 text-red-500">
                <path fill="currentColor" d="M12,2C17.53,2 22,6.47 22,12C22,17.53 17.53,22 12,22C6.47,22 2,17.53 2,12C2,6.47 6.47,2 12,2M15.59,7L12,10.59L8.41,7L7,8.41L10.59,12L7,15.59L8.41,17L12,13.41L15.59,17L17,15.59L13.41,12L17,8.41L15.59,7Z" />
              </svg>
            </div>
          </div>
          <h3 class="text-xl font-bold text-center mb-2">Confirm Delete</h3>
          <p class="text-center text-secondaryLight">{{ confirmDialogMessage }}</p>
        </div>
        
        <div class="flex justify-center space-x-4">
          <button
            class="px-4 py-2 border border-dividerLight rounded hover:bg-primaryLight"
            @click="showConfirmDialog = false"
          >
            Cancel
          </button>
          <button
            class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            @click="confirmDelete"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue"
import { getService } from "../modules/dioc"
import { HoppSOAPRequest, makeSOAPRequest, SOAP_VERSION_1_1, SOAP_VERSION_1_2 } from "@hoppscotch/data"
import { HoppSOAPTabDocument } from "../helpers/soap/document"
import { HoppTab } from "../services/tab"
import * as E from "fp-ts/Either"

// Import services and utilities
import { SOAPTabService } from "../services/tab/soap"
import { useToast } from "../composables/toast"
import SoapEditRequestModalImport from "../components/soap/EditRequestModal.vue"
import { defineAsyncComponent } from "vue"
import {
  WSDLOperation,
  WSDLService,
  parseWSDL
} from "../helpers/soap/wsdl-parser"

// Import the ImprovedSoapUI component asynchronously
const ImprovedSoapUI = defineAsyncComponent(() => import("../components/soap/ImprovedSoapUI.vue"))

// Define enhanced WSDLOperation type with additional properties needed for UI
interface EnhancedWSDLOperation extends WSDLOperation {
  service?: string
  endpoint?: string
  sampleBody?: string
  headers?: Array<{ key: string, value: string, active: boolean }>
  params?: Array<{ key: string, value: string, active: boolean }>
  soapVersion?: string
}

// Define SOAP project type
interface SOAPProject {
  id: string
  name: string
  wsdlUrl?: string
  endpoint?: string
  services: WSDLService[]
  operations: EnhancedWSDLOperation[]
  expanded: boolean
}

// Initialize services
const tabService = getService(SOAPTabService)
const toast = useToast()

// Use components directly
const SoapEditRequestModal = SoapEditRequestModalImport

// State for UI
const sidebarTab = ref<"operations" | "history">("operations") // Initial tab
const showNewProjectModal = ref(false)
const showEditModal = ref(false)
const showRequestDetails = ref(false)
const showConfirmDialog = ref(false)
const confirmDialogMessage = ref("")
const confirmDialogAction = ref<() => void>(() => {})
const confirmDialogType = ref<"project" | "operation">("project")
const confirmDialogEntityName = ref("")
const isCreating = ref(false)
const currentEditingTab = ref<string | null>(null)
const currentEditingRequest = ref<HoppSOAPRequest | null>(null)
const selectedRequest = ref<HoppSOAPRequest | null>(null)

// Project and operation state
const soapProjects = ref<SOAPProject[]>([])
const expandedOperationCards = ref<Record<string, boolean>>({})
const expandedServices = ref<Record<string, boolean>>({})
const tabExpanded = ref<Record<string, boolean>>({})
const tabsList = computed(() => tabService.tabs.value)

// Form fields
const projectName = ref("")
const wsdlSource = ref<"url" | "file">("url")
const wsdlUrl = ref("")
const selectedFile = ref<File | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const parsedEndpoints = ref<{ address: string; label: string }[]>([])
const selectedEndpoint = ref("")
const importOptions = ref({
  createSampleRequests: true,
  createTestSuite: false,
  createSimulation: false
})

// State for UI elements are managed within their respective components

// Toggle service expansion
const toggleService = (serviceName: string) => {
  expandedServices.value[serviceName] = !expandedServices.value[serviceName]
}

// Check if a service is expanded
const isServiceExpanded = (serviceName: string) => {
  return expandedServices.value[serviceName] ?? false
}

// Get operations for a specific service
const getOperationsForService = (project: SOAPProject, service: WSDLService) => {
  return project.operations.filter((op) => op.service === service.name)
}

// Get operations that don't have service association
const getOperationsWithoutService = (project: SOAPProject) => {
  return project.operations.filter((op) => !op.service)
}

// Open an operation from a project as a new tab
const openOperationAsTabFromProject = (project: SOAPProject, operation: EnhancedWSDLOperation) => {
  const request = makeSOAPRequest({
    name: operation.name,
    endpoint: operation.endpoint || project.endpoint || "",
    operation: operation.name,
    body: operation.sampleBody || "",
    headers: operation.headers || [],
    params: operation.params || [],
    wsdlUrl: project.wsdlUrl || "",
    soapVersion: operation.soapVersion === "1.2" ? SOAP_VERSION_1_2 : SOAP_VERSION_1_1
  })
  
  // Create a tab document from the request
  const document: HoppSOAPTabDocument = {
    type: "request",
    request: request,
    isDirty: false,
    response: null,
  }
  
  const newTab = tabService.createNewTab(document)
  
  // Set this tab to be expanded by default
  tabExpanded.value[newTab.id] = true
  localStorage.setItem('hoppscotch-soap-tab-expanded', JSON.stringify(tabExpanded.value))
}

// Edit a request in a tab
const editRequest = (tabId: string) => {
  currentEditingTab.value = tabId
  const tabDoc = tabService.getTabDocument(tabId)
  if (tabDoc && tabDoc.type === "request") {
    currentEditingRequest.value = tabDoc.request
    showEditModal.value = true
  }
}

// Format XML in the request body
const formatXML = (tabId: string) => {
  const tabDoc = tabService.getTabDocument(tabId)
  if (!tabDoc || tabDoc.type !== "request" || !tabDoc.request.body) return
  
  try {
    const parser = new DOMParser()
    const xmlDoc = parser.parseFromString(tabDoc.request.body, "text/xml")
    
    if (xmlDoc.querySelector("parsererror")) {
      toast.error("Cannot format: Invalid XML")
      return
    }
    
    // Convert DOM back to formatted string
    const serializer = new XMLSerializer()
    const formattedXml = formatXmlString(serializer.serializeToString(xmlDoc))
    
    // Update the request with formatted XML
    updateRequestBody(tabId, formattedXml)
    toast.success("XML formatted successfully")
  } catch (error) {
    toast.error("Failed to format XML")
    console.error("Error formatting XML:", error)
  }
}

// Format XML in the response body
const formatResponseXML = (tabId: string) => {
  const tabDoc = tabService.getTabDocument(tabId)
  if (!tabDoc || tabDoc.type !== "request" || !tabDoc.response?.body) return
  
  try {
    // Convert response body to string if it's an ArrayBuffer
    const responseText = typeof tabDoc.response.body === 'string' 
      ? tabDoc.response.body 
      : new TextDecoder().decode(tabDoc.response.body as ArrayBuffer)
      
    // Try to parse response as XML
    const parser = new DOMParser()
    const xmlDoc = parser.parseFromString(responseText, "text/xml")
    
    if (xmlDoc.querySelector("parsererror")) {
      toast.error("Cannot format: Response is not valid XML")
      return
    }
    
    // Convert DOM back to formatted string
    const serializer = new XMLSerializer()
    const formattedXml = formatXmlString(serializer.serializeToString(xmlDoc))
    
    // Update the response with formatted XML
    const updatedResponse = { ...tabDoc.response, body: formattedXml }
    tabService.setResponse(tabId, updatedResponse)
    
    toast.success("Response XML formatted successfully")
  } catch (error) {
    toast.error("Failed to format response XML")
    console.error("Error formatting response XML:", error)
  }
}

// Copying response is handled by the ImprovedSoapUI component

// Helper function to convert response type for ImprovedSoapUI component
const convertResponseType = (response: any) => {
  return response
}

// Update tab expanded state
const updateTabExpanded = (tabId: string, expanded: boolean) => {
  tabExpanded.value[tabId] = expanded
  // Save tab expanded states to local storage
  localStorage.setItem('hoppscotch-soap-tab-expanded', JSON.stringify(tabExpanded.value))
}

// Remove operation from tab and find its source project
const removeTabOperation = (tab: HoppTab<HoppSOAPTabDocument>) => {
  if (!tab.document.request?.name) return
  
  const operationName = tab.document.request.name
  const wsdlUrl = tab.document.request.wsdlUrl
  
  // Find the project containing this operation
  const project = soapProjects.value.find(p => 
    p.wsdlUrl === wsdlUrl && 
    p.operations.some(op => op.name === operationName)
  )
  
  if (project) {
    // Found the project, now remove the operation
    removeOperation(project.id, operationName)
  } else {
    // Set up confirmation for just closing the tab
    confirmDialogType.value = "operation"
    confirmDialogEntityName.value = operationName
    confirmDialogMessage.value = `Are you sure you want to close the "${operationName}" tab? The operation wasn't found in any project.`
    
    // Define action
    confirmDialogAction.value = () => {
      tabService.closeTab(tab.id)
      toast.info(`Operation tab closed, but couldn't find the source project`)
    }
    
    // Show confirmation
    showConfirmDialog.value = true
  }
}

// Update request body when edited
const updateRequestBody = (tabId: string, newBody: string) => {
  const tab = tabsList.value.find(tab => tab.id === tabId)
  if (!tab || tab.document.type !== "request") return
  
  try {
    if (tab.document.request.body !== newBody) {
      // Update the request body directly using the updateRequest method
      tabService.updateRequest(tabId, {
        ...tab.document.request,
        body: newBody
      })
    }
  } catch (error) {
    console.error("Error updating request body:", error)
    toast.error("Failed to update request body")
  }
}

// Save edited request
const saveEditedRequest = (updatedRequest: HoppSOAPRequest) => {
  if (currentEditingTab.value) {
    tabService.updateRequest(currentEditingTab.value, updatedRequest)
    
    currentEditingTab.value = null
    currentEditingRequest.value = null
    showEditModal.value = false
  }
}

// Send a SOAP request
const sendRequest = async (tabId: string) => {
  tabService.setActiveTab(tabId)
  const tabDoc = tabService.getTabDocument(tabId)
  
  if (!tabDoc || tabDoc.type !== "request") return

  toast.info("Sending request...")

  try {
    const request = tabDoc.request
    const { stream, cancel } = await tabService.sendRequest(request)
    
    const subscription = stream.subscribe((response) => {
      if (response.type !== "loading") {
        // Use the setResponse method instead of updateTabDocument
        tabService.setResponse(tabId, response)
      }
    })
    
    return () => {
      subscription.unsubscribe()
      cancel()
    }
  } catch (error) {
    console.error("Error sending SOAP request:", error)
    toast.error("Something went wrong")
  }
}

// Generate a sample SOAP request body for an operation
const generateSampleRequestBody = (operation: WSDLOperation, soapVersion: string = "1.1"): string => {
  const envelope = soapVersion === "1.2" 
    ? 'xmlns:soap="http://www.w3.org/2003/05/soap-envelope"'
    : 'xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"';
  
  const operationName = operation.name;
  const inputElement = operation.inputElement || operationName;
  
  return `<soap:Envelope ${envelope}>
  <soap:Header>
    <!-- Add any required headers here -->
  </soap:Header>
  <soap:Body>
    <${inputElement}>
      <!-- Add operation parameters here -->
    </${inputElement}>
  </soap:Body>
</soap:Envelope>`;
}

// Helper function to format file size
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B'
  else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
  else return (bytes / 1048576).toFixed(1) + ' MB'
}

// Handle file upload
const handleFileUpload = (event: Event) => {
  const input = event.target as HTMLInputElement
  if (input.files && input.files.length > 0) {
    selectedFile.value = input.files[0]
    
    // Preview parse to extract endpoints
    previewParseWSDLFile(selectedFile.value)
    
    toast.info(`File selected: ${input.files[0].name}`)
  }
}

// Preview parse WSDL file to extract endpoints
const previewParseWSDLFile = async (file: File) => {
  try {
    // Read the file contents
    const reader = new FileReader()
    const wsdlContent = await new Promise<string>((resolve, reject) => {
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsText(file)
    })
    
    // Parse the WSDL
    const parseResult = await parseWSDL(wsdlContent)
    
    if (E.isLeft(parseResult)) {
      toast.error(`WSDL preview parse error: ${parseResult.left.message}`)
      return
    }
    
    const wsdlData = parseResult.right
    
    // Extract endpoints from services
    parsedEndpoints.value = wsdlData.services
      .filter(service => service.port?.address)
      .map(service => ({
        address: service.port?.address || '',
        label: `${service.name} (${service.port?.address || 'no address'})`
      }))
    
    if (parsedEndpoints.value.length > 0) {
      selectedEndpoint.value = parsedEndpoints.value[0].address
    }
    
    // Set the project name from the file if not already set
    if (!projectName.value.trim()) {
      projectName.value = file.name.replace(/\.(wsdl|xml)$/i, '')
    }
    
  } catch (error) {
    toast.error(`WSDL preview parse error: ${error instanceof Error ? error.message : String(error)}`)
  }
}

// Remove selected file
const removeFile = () => {
  selectedFile.value = null
  if (fileInput.value) fileInput.value.value = ''
}

// Create a new project
const createProject = async () => {
  if (!projectName.value.trim()) return
  
  isCreating.value = true
  
  try {
    // Create a new project
    const newProject: SOAPProject = {
      id: `project-${Date.now()}`,
      name: projectName.value.trim(),
      wsdlUrl: wsdlSource.value === 'url' ? wsdlUrl.value : undefined,
      endpoint: selectedEndpoint.value || undefined,
      services: [],
      operations: [],
      expanded: true,
    }
    
    // Parse the WSDL based on source (URL or file)
    if (wsdlSource.value === 'url' && wsdlUrl.value) {
      try {
        toast.info(`Fetching WSDL from ${wsdlUrl.value}...`)
        
        // Fetch the WSDL content from the URL
        const response = await fetch(wsdlUrl.value, {
          headers: { 'Accept': 'text/xml, application/xml, application/soap+xml' }
        })
        
        if (!response.ok) {
          throw new Error(`Failed to fetch WSDL: ${response.statusText}`)
        }
        
        const wsdlContent = await response.text()
        
        // Parse the WSDL
        toast.info(`Parsing WSDL...`)
        const parseResult = await parseWSDL(wsdlContent, wsdlUrl.value)
        
        if (E.isLeft(parseResult)) {
          throw new Error(`Failed to parse WSDL: ${parseResult.left.message}`)
        }
        
        // Extract operations and services from the parse result
        const wsdlData = parseResult.right
        newProject.services = wsdlData.services || []
        
        // Process operations and add sample bodies if needed
        newProject.operations = (wsdlData.operations || []).map(op => {
          const enhancedOp: EnhancedWSDLOperation = { 
            ...op,
            service: findServiceForOperation(wsdlData.services, op),
            endpoint: selectedEndpoint.value || wsdlUrl.value,
            soapVersion: '1.1' // Default to SOAP 1.1
          };
          
          // Generate sample body if the import option is set
          if (importOptions.value.createSampleRequests) {
            enhancedOp.sampleBody = generateSampleRequestBody(op);
          }
          
          return enhancedOp;
        });
        
        toast.success(`WSDL parsed successfully. Found ${newProject.operations.length} operations.`)
      } catch (error) {
        toast.error(`WSDL parsing error: ${error instanceof Error ? error.message : String(error)}`)
        // Add a sample operation for demonstration in case of error
        newProject.operations = [{ 
          name: "SampleOperation",
          soapAction: "http://example.org/sample",
          documentation: "Sample operation created due to WSDL parsing error"
        }]
      }
    } else if (wsdlSource.value === 'file' && selectedFile.value) {
      try {
        // Read the file contents
        const reader = new FileReader()
        const wsdlContent = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = () => reject(new Error('Failed to read file'))
          reader.readAsText(selectedFile.value as File)
        })
        
        // Parse the WSDL
        toast.info(`Parsing WSDL file...`)
        const parseResult = await parseWSDL(wsdlContent)
        
        if (E.isLeft(parseResult)) {
          throw new Error(`Failed to parse WSDL: ${parseResult.left.message}`)
        }
        
        // Extract operations and services from the parse result
        const wsdlData = parseResult.right
        newProject.services = wsdlData.services || []
        
        // Process operations and add sample bodies if needed
        newProject.operations = (wsdlData.operations || []).map(op => {
          const enhancedOp: EnhancedWSDLOperation = { 
            ...op,
            service: findServiceForOperation(wsdlData.services, op),
            endpoint: selectedEndpoint.value || '',
            soapVersion: '1.1' // Default to SOAP 1.1
          };
          
          // Generate sample body if the import option is set
          if (importOptions.value.createSampleRequests) {
            enhancedOp.sampleBody = generateSampleRequestBody(op);
          }
          
          return enhancedOp;
        });
        
        toast.success(`WSDL parsed successfully. Found ${newProject.operations.length} operations.`)
      } catch (error) {
        toast.error(`WSDL parsing error: ${error instanceof Error ? error.message : String(error)}`)
      }
    }
    
    soapProjects.value.push(newProject)
    toast.success("Project created successfully")
    showNewProjectModal.value = false
    resetNewProjectForm()
  } catch (error) {
    toast.error(`Failed to create project: ${error instanceof Error ? error.message : String(error)}`)
  } finally {
    isCreating.value = false
  }
}

// Cancel new project modal
const cancelNewProjectModal = () => {
  showNewProjectModal.value = false
  resetNewProjectForm()
}

// Reset the new project form
const resetNewProjectForm = () => {
  projectName.value = ""
  wsdlUrl.value = ""
  selectedEndpoint.value = ""
  selectedFile.value = null
  if (fileInput.value) fileInput.value.value = ''
}

// Handle confirmation dialog delete action
const confirmDelete = () => {
  // Execute the stored action function
  confirmDialogAction.value()
  
  // Hide the dialog
  showConfirmDialog.value = false
}

// Helper function to format XML string with proper indentation
const formatXmlString = (xml: string): string => {
  let formatted = ''
  let indent = ''
  const tab = '  ' // 2 spaces for indentation
  
  xml.split(/>\s*</).forEach(node => {
    if (node.match(/^\/\w/)) {
      // Closing tag
      indent = indent.substring(tab.length)
    }
    
    formatted += indent + '<' + node + '>\n'
    
    if (node.match(/^<?\w[^>]*[^\/]$/) && !node.startsWith("?")) {
      // Opening tag
      indent += tab
    }
  })
  
  return formatted.substring(1, formatted.length - 2)
}

// Remove a project from the list
const removeProject = (projectId: string) => {
  const index = soapProjects.value.findIndex(p => p.id === projectId)
  if (index !== -1) {
    const projectName = soapProjects.value[index].name
    const operationsCount = soapProjects.value[index].operations.length
    
    // Set up the confirmation dialog
    confirmDialogType.value = "project"
    confirmDialogEntityName.value = projectName
    confirmDialogMessage.value = `Are you sure you want to remove project "${projectName}"? This will delete ${operationsCount} operation(s) and cannot be undone.`
    
    // Define the action to perform when confirmed
    confirmDialogAction.value = () => {
      soapProjects.value.splice(index, 1)
      toast.success(`Project "${projectName}" removed`)
    }
    
    // Show the confirmation dialog
    showConfirmDialog.value = true
  }
}

// Remove an operation from a project
const removeOperation = (projectId: string, operationName: string) => {
  const projectIndex = soapProjects.value.findIndex(p => p.id === projectId)
  if (projectIndex !== -1) {
    const project = soapProjects.value[projectIndex]
    const operationIndex = project.operations.findIndex(op => op.name === operationName)
    
    if (operationIndex !== -1) {
      // Count how many tabs will be closed
      const tabsWithOperation = tabsList.value.filter(tab => 
        tab.document.request.name === operationName && 
        tab.document.request.wsdlUrl === project.wsdlUrl
      )
      
      const tabsCount = tabsWithOperation.length
      
      // Set up confirmation dialog
      confirmDialogType.value = "operation"
      confirmDialogEntityName.value = operationName
      
      let message = `Are you sure you want to remove operation "${operationName}"?`
      if (tabsCount > 0) {
        message += ` This will also close ${tabsCount} open tab(s) related to this operation.`
      }
      message += " This action cannot be undone."
      
      confirmDialogMessage.value = message
      
      // Define the action to perform when confirmed
      confirmDialogAction.value = () => {
        // Close any matching tabs
        tabsWithOperation.forEach(tab => {
          tabService.closeTab(tab.id)
        })
        
        // Remove operation
        project.operations.splice(operationIndex, 1)
        toast.success(`Operation "${operationName}" removed`)
        
        // Update project in the list
        soapProjects.value[projectIndex] = { ...project }
      }
      
      // Show the confirmation dialog
      showConfirmDialog.value = true
    }
  }
}

// Find the service associated with an operation
const findServiceForOperation = (services: WSDLService[], operation: WSDLOperation): string | undefined => {
  // This is a simplified approach - in a full implementation, you would need to check
  // bindings and port types to properly associate operations with services
  if (services.length === 1) {
    return services[0].name; // If there's only one service, use it
  }
  
  // Otherwise, return undefined and let the operation be "unassociated"
  return undefined;
}

// Load projects from local storage on mount
onMounted(() => {
  try {
    console.log('[SOAP Page] Component mounted')
    
    // Load saved projects from local storage
    const savedProjects = localStorage.getItem('hoppscotch-soap-projects')
    if (savedProjects) {
      try {
        const parsed = JSON.parse(savedProjects)
        soapProjects.value = parsed
      } catch (e) {
        console.error('Failed to parse saved SOAP projects:', e)
      }
    }
    
    // Load saved expanded operation cards state
    const savedExpandedCards = localStorage.getItem('hoppscotch-soap-expanded-cards')
    if (savedExpandedCards) {
      try {
        expandedOperationCards.value = JSON.parse(savedExpandedCards)
      } catch (e) {
        console.error('Failed to parse saved expanded operation cards:', e)
      }
    }
    
    // Load expanded services state
    const savedExpandedServices = localStorage.getItem('hoppscotch-soap-expanded-services')
    if (savedExpandedServices) {
      try {
        expandedServices.value = JSON.parse(savedExpandedServices)
      } catch (e) {
        console.error('Failed to parse saved expanded services:', e)
      }
    }
    
    // Set all current tabs to expanded by default if not in saved state
    tabsList.value.forEach(tab => {
      if (expandedOperationCards.value[tab.id] === undefined) {
        expandedOperationCards.value[tab.id] = true
      }
    })
    
    console.log('[SOAP Page] Current tabs:', tabsList.value)
  } catch (error) {
    console.error('[SOAP Page] Error during mount:', error)
  }
})

// Save projects to local storage when they change
watch(soapProjects, (newProjects) => {
  try {
    localStorage.setItem('hoppscotch-soap-projects', JSON.stringify(newProjects))
  } catch (e) {
    console.error('Failed to save SOAP projects to localStorage:', e)
  }
}, { deep: true })

// Save operation card expansion state when it changes
watch(expandedOperationCards, (newState) => {
  try {
    localStorage.setItem('hoppscotch-soap-expanded-cards', JSON.stringify(newState))
  } catch (e) {
    console.error('Failed to save operation card state to localStorage:', e)
  }
}, { deep: true })

// Save expanded services state when it changes
watch(expandedServices, (newState) => {
  try {
    localStorage.setItem('hoppscotch-soap-expanded-services', JSON.stringify(newState))
  } catch (e) {
    console.error('Failed to save expanded services to localStorage:', e)
  }
}, { deep: true })

// Watch tabs list for changes to update expansion state for new tabs
watch(tabsList, (newTabs) => {
  newTabs.forEach(tab => {
    // Set newly created tabs to expanded by default
    if (expandedOperationCards.value[tab.id] === undefined) {
      expandedOperationCards.value[tab.id] = true
    }
    
    // Make sure the tab is expanded by default in tabExpanded tracking
    if (tabExpanded.value[tab.id] === undefined) {
      tabExpanded.value[tab.id] = true
    }
  })
  
  // Clean up expansion state for closed tabs
  Object.keys(expandedOperationCards.value).forEach(tabId => {
    if (!newTabs.some(tab => tab.id === tabId)) {
      delete expandedOperationCards.value[tabId]
      delete tabExpanded.value[tabId]
    }
  })
  
  // Save tab expanded states to local storage
  localStorage.setItem('hoppscotch-soap-tab-expanded', JSON.stringify(tabExpanded.value))
})

// Test script and simulation script generation is handled by the test script editor component
</script>

<route lang="yaml">
meta:
  title: "SOAP"
  layout: default
</route>
