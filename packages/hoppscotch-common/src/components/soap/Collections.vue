<template>
  <div class="flex flex-col flex-1">
    <div
      class="sticky z-10 flex items-center justify-between px-4 py-2 bg-primary top-upperRequestRect"
    >
      <div class="flex items-center">
        <span class="inline-flex items-center px-2 font-semibold">
          {{ t("soap.collections") }}
        </span>
        <span
          class="inline-flex items-center ltr:ml-2 rtl:mr-2 px-2 py-0.5 text-tiny font-semibold rounded badge"
        >
          {{ collections.length }}
        </span>
      </div>
      <div class="flex">
        <HoppButtonSecondary
          v-tippy="{ content: 'Create from WSDL' }"
          class="mr-2"
          @click="showCreateFromWSDLModal = true"
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
          class="ml-2"
          @click="importCollections"
        >
          <IconUpload />
        </HoppButtonSecondary>
        <HoppButtonSecondary class="ml-2" @click="addNewCollection">
          <IconPlus />
          <span>Add</span>
        </HoppButtonSecondary>
      </div>
    </div>

    <div
      class="flex flex-col flex-1 overflow-auto divide-y divide-dividerLight bg-primary"
    >
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
              <span
                :class="{
                  'transform rotate-90': expandedCollections.includes(
                    collection.id
                  ),
                }"
              >
                <IconChevronRight />
              </span>
              <span class="px-4 font-semibold truncate">{{
                collection.name
              }}</span>
              <span class="px-2 py-0.5 text-tiny font-semibold rounded badge">
                {{ getCollectionRequestCount(collection) }}
              </span>
            </div>
            <div
              class="flex opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <button
                class="p-1 text-red-500 hover:text-red-700"
                @click.stop="deleteCollection(collection.id)"
              >
                <IconTrash class="w-4 h-4" />
              </button>
            </div>
          </div>

          <!-- Collection content when expanded -->
          <div
            v-if="expandedCollections.includes(collection.id)"
            class="px-4 py-2 bg-secondary"
          >
            <div v-if="collection.requests.length > 0" class="space-y-4">
              <!-- List of operations/requests -->
              <div
                v-for="request in collection.requests"
                :key="request.id"
                class="flex flex-col"
              >
                <div class="flex items-center p-2 hover:bg-primary rounded">
                  <span
                    class="flex-1 cursor-pointer"
                    @click="openRequest(request)"
                    >{{ request.name }}</span
                  >
                  <div class="flex space-x-2">
                    <button
                      v-tippy="{ content: 'Open in New Tab' }"
                      class="p-1 text-secondaryLight hover:text-secondaryDark"
                      @click="openRequestInNewTab(request)"
                    >
                      <IconExternalLink class="w-4 h-4" />
                    </button>
                    <button
                      v-tippy="{ content: 'Execute Request' }"
                      class="p-1 text-accent hover:text-accent-dark"
                      @click="executeRequest(request)"
                    >
                      <IconPlay class="w-4 h-4" />
                    </button>
                    <button
                      v-tippy="{ content: 'Edit URL' }"
                      class="p-1 text-secondaryLight hover:text-secondaryDark"
                      @click="toggleEditRequest(request.id)"
                    >
                      <IconEdit class="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <!-- Edit URL form (shown when editing) -->
                <div
                  v-if="editingRequestId === request.id"
                  class="mt-2 p-2 bg-primary rounded"
                >
                  <div class="flex items-center space-x-2">
                    <input
                      v-model="editingRequestUrl"
                      type="text"
                      class="flex-1 px-2 py-1 border rounded bg-secondary"
                      placeholder="Enter endpoint URL"
                    />
                    <button
                      v-tippy="{ content: 'Save URL' }"
                      class="p-1 text-accent hover:text-accent-dark"
                      @click="saveRequestUrl(request)"
                    >
                      <IconCheck class="w-4 h-4" />
                    </button>
                    <button
                      v-tippy="{ content: 'Cancel' }"
                      class="p-1 text-red-500 hover:text-red-700"
                      @click="cancelEditRequest"
                    >
                      <IconX class="w-4 h-4" />
                    </button>
                  </div>
                </div>
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

    <!-- Create from WSDL Modal -->
    <HoppSmartModal
      v-model="showCreateFromWSDLModal"
      :title="t('soap.create_from_wsdl')"
      @close="showCreateFromWSDLModal = false"
    >
      <div class="flex flex-col space-y-4">
        <!-- WSDL Source Selection -->
        <div>
          <label class="block text-sm font-medium mb-2">{{
            t("soap.wsdl_source")
          }}</label>
          <div class="flex space-x-2">
            <HoppButtonSecondary
              :class="{
                'bg-accentLight text-accent': wsdlSourceType === 'url',
              }"
              class="flex-1"
              @click="wsdlSourceType = 'url'"
            >
              {{ t("soap.from_url") }}
            </HoppButtonSecondary>
            <HoppButtonSecondary
              :class="{
                'bg-accentLight text-accent': wsdlSourceType === 'file',
              }"
              class="flex-1"
              @click="wsdlSourceType = 'file'"
            >
              {{ t("soap.from_file") }}
            </HoppButtonSecondary>
          </div>
        </div>

        <!-- URL Input -->
        <div v-if="wsdlSourceType === 'url'">
          <label class="block text-sm font-medium mb-2">{{
            t("soap.wsdl_url")
          }}</label>
          <input
            v-model="wsdlUrl"
            type="text"
            class="w-full px-3 py-2 border rounded bg-primary"
            :placeholder="t('soap.enter_wsdl_url')"
          />
        </div>

        <!-- File Upload -->
        <div v-if="wsdlSourceType === 'file'">
          <label class="block text-sm font-medium mb-2">{{
            t("soap.wsdl_file")
          }}</label>
          <div class="flex items-center space-x-2">
            <input
              ref="wsdlFileInput"
              type="file"
              accept=".wsdl,.xml"
              class="hidden"
              @change="handleWSDLFileUpload"
            />
            <HoppButtonSecondary class="flex-1" @click="clickWSDLFileInput">
              <IconUpload class="w-4 h-4 mr-2" />
              {{ wsdlFileName || t("soap.choose_wsdl_file") }}
            </HoppButtonSecondary>
            <HoppButtonSecondary
              v-if="wsdlFileName"
              class="px-2"
              @click="clearWSDLFile"
            >
              <IconX class="w-4 h-4" />
            </HoppButtonSecondary>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium mb-2">{{
            t("soap.collection_name")
          }}</label>
          <input
            v-model="collectionName"
            type="text"
            class="w-full px-3 py-2 border rounded bg-primary"
            :placeholder="t('soap.enter_collection_name')"
          />
        </div>

        <!-- Feature Options -->
        <div class="border-t pt-4">
          <label class="block text-sm font-medium mb-3">{{
            t("soap.import_options")
          }}</label>
          <div class="space-y-3">
            <div class="flex items-center">
              <input
                id="createSampleRequests"
                v-model="createSampleRequests"
                type="checkbox"
                class="w-4 h-4 text-accent bg-primary border-gray-300 rounded focus:ring-accent focus:ring-2"
              />
              <label for="createSampleRequests" class="ml-2 text-sm">
                {{ t("soap.create_sample_requests") }}
              </label>
            </div>
            <div class="flex items-center">
              <input
                id="createTestSuite"
                v-model="createTestSuite"
                type="checkbox"
                class="w-4 h-4 text-accent bg-primary border-gray-300 rounded focus:ring-accent focus:ring-2"
              />
              <label for="createTestSuite" class="ml-2 text-sm">
                {{ t("soap.create_test_suite") }}
              </label>
            </div>
            <div class="flex items-center">
              <input
                id="createSimulation"
                v-model="createSimulation"
                type="checkbox"
                class="w-4 h-4 text-accent bg-primary border-gray-300 rounded focus:ring-accent focus:ring-2"
              />
              <label for="createSimulation" class="ml-2 text-sm">
                {{ t("soap.create_simulation") }}
              </label>
            </div>
          </div>
        </div>

        <div v-if="wsdlError" class="text-red-500 text-sm">
          {{ wsdlError }}
        </div>

        <div class="flex justify-end space-x-2">
          <HoppButtonSecondary @click="showCreateFromWSDLModal = false">
            {{ t("action.cancel") }}
          </HoppButtonSecondary>
          <HoppButtonPrimary
            :loading="creatingFromWSDL"
            :disabled="!isWSDLSourceValid || !collectionName"
            @click="createFromWSDL"
          >
            {{ t("soap.create_collection") }}
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
import IconExternalLink from "~icons/lucide/external-link"
import IconEdit from "~icons/lucide/edit"
import IconCheck from "~icons/lucide/check"
import IconX from "~icons/lucide/x"
import {
  HoppButtonSecondary,
  HoppButtonPrimary,
  HoppSmartModal,
} from "@hoppscotch/ui"

const { t } = useI18n()
const toast = useToast()
const collectionStore = useSOAPCollectionStore()
const tabService = getService(SOAPTabService)

// Reactive data
const expandedCollections = ref<string[]>([])
const showCreateFromWSDLModal = ref(false)
const wsdlUrl = ref("")
const wsdlSourceType = ref<"url" | "file">("url")
const wsdlFileContent = ref("")
const wsdlFileName = ref("")
const collectionName = ref("")
const wsdlError = ref("")
const creatingFromWSDL = ref(false)
const editingRequestId = ref<string | null>(null)
const editingRequestUrl = ref("")

// WSDL Import Options
const createSampleRequests = ref(true)
const createTestSuite = ref(false)
const createSimulation = ref(false)

// Computed
const collections = computed(() => collectionStore.collections)

const isWSDLSourceValid = computed(() => {
  if (wsdlSourceType.value === "url") {
    return wsdlUrl.value.trim() !== ""
  }
  return wsdlFileContent.value.trim() !== ""
})

// File Upload Methods
function handleWSDLFileUpload(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]

  if (!file) return

  if (!file.name.toLowerCase().match(/\.(wsdl|xml)$/)) {
    toast.error(t("soap.invalid_wsdl_file"))
    return
  }

  const reader = new FileReader()
  reader.onload = (e) => {
    wsdlFileContent.value = e.target?.result as string
    wsdlFileName.value = file.name
    // Auto-generate collection name from file name
    if (!collectionName.value) {
      collectionName.value = file.name.replace(/\.(wsdl|xml)$/i, "")
    }
  }
  reader.onerror = () => {
    toast.error(t("soap.error_reading_file"))
  }
  reader.readAsText(file)
}

function clearWSDLFile() {
  wsdlFileContent.value = ""
  wsdlFileName.value = ""
  const fileInput = document.querySelector(
    'input[type="file"]'
  ) as HTMLInputElement
  if (fileInput) {
    fileInput.value = ""
  }
}

// File input click handler
function clickWSDLFileInput() {
  const fileInput = document.querySelector(
    'input[type="file"][accept=".wsdl,.xml"]'
  ) as HTMLInputElement
  if (fileInput) {
    fileInput.click()
  }
}

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
  folders?: any[] // Add if needed in the future
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
        name: string
        contentType: string
        contentId: string
        content: any // Using any to accommodate both File and serialized content
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

function openRequest(collectionRequest: {
  id: string
  name: string
  request: any
}) {
  try {
    // Create a new tab using SOAPTabService with the request from the collection
    const newTab = tabService.createNewTab({
      type: "request",
      request: { ...collectionRequest.request }, // Clone the request object to avoid reference issues
      response: null,
      isDirty: false,
      optionTabPreference: "operation", // Set to operation tab by default
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
    console.error(
      "Error opening request:",
      error instanceof Error ? error.message : String(error)
    )
    toast.error(t("soap.failed_to_open_request"))
  }
}

function openRequestInNewTab(collectionRequest: {
  id: string
  name: string
  request: any
}) {
  try {
    // Create a new tab using SOAPTabService with the request from the collection
    const newTab = tabService.createNewTab({
      type: "request",
      request: { ...collectionRequest.request }, // Clone the request object to avoid reference issues
      response: null,
      isDirty: false,
      optionTabPreference: "operation", // Set to operation tab by default when opening from collections
    })

    // Set the new tab as active
    if (newTab) {
      tabService.setActiveTab(newTab.id)

      // Inform user
      toast.success(`${collectionRequest.name} opened in new tab`)
    } else {
      toast.error(t("soap.failed_to_open_request"))
    }
  } catch (error) {
    console.error(
      "Error opening request in new tab:",
      error instanceof Error ? error.message : String(error)
    )
    toast.error(t("soap.failed_to_open_request"))
  }
}

async function executeRequest(collectionRequest: {
  id: string
  name: string
  request: any
}) {
  try {
    // Create and open a new tab with this request
    const newTab = tabService.createNewTab({
      type: "request",
      request: { ...collectionRequest.request },
      response: null,
      isDirty: false,
      optionTabPreference: "operation",
    })

    if (newTab) {
      // Set the new tab as active
      tabService.setActiveTab(newTab.id)
      toast.info(`Executing ${collectionRequest.name}...`)
      // Get the active tab
      const activeTab = tabService.getActiveTab()

      if (activeTab) {
        // Use the SOAPTabService's method to send the request
        // Note: Since we don't have direct access to the execute method,
        // we're using the tab navigation to open the request and letting
        // the user manually execute it

        toast.info(
          `Request ${collectionRequest.name} ready to execute. Click the Send button to run it.`
        )
      } else {
        toast.error("Could not determine active tab")
      }
    } else {
      throw new Error("Failed to create new tab")
    }
  } catch (error) {
    console.error(
      "Error executing request:",
      error instanceof Error ? error.message : String(error)
    )
    toast.error(
      `Failed to execute request: ${error instanceof Error ? error.message : "Unknown error"}`
    )
  }
}

function validateWSDLContent(content: string): boolean {
  if (!content || content.trim() === "") {
    return false
  }

  // Check for basic WSDL elements
  const hasDefinitions =
    content.includes("<wsdl:definitions") ||
    content.includes("<definitions") ||
    content.includes(":definitions")

  const hasOperations =
    content.includes("<wsdl:operation") ||
    content.includes("<operation") ||
    content.includes(":operation")

  const hasBinding =
    content.includes("<wsdl:binding") ||
    content.includes("<binding") ||
    content.includes(":binding")

  console.log("WSDL validation:", { hasDefinitions, hasOperations, hasBinding })

  // Require at least definitions and either operations or bindings
  return hasDefinitions && (hasOperations || hasBinding)
}

async function createFromWSDL() {
  if (!isWSDLSourceValid.value || !collectionName.value) return

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

  let operations: WSDLOperation[] = []
  let services: WSDLService[] = []
  let wsdlContent: string = ""
  let baseUrl: string = ""

  try {
    // Get WSDL content based on source type
    if (wsdlSourceType.value === "url") {
      console.log(`Starting WSDL parse process for URL: ${wsdlUrl.value}`)

      // Fetch WSDL content from URL
      const response = await fetch(wsdlUrl.value)
      if (!response.ok) {
        throw new Error(`Failed to fetch WSDL: ${response.statusText}`)
      }
      wsdlContent = await response.text()
      baseUrl = wsdlUrl.value

      console.log(`Fetched WSDL content length: ${wsdlContent.length} bytes`)
    } else {
      // Use file content
      wsdlContent = wsdlFileContent.value
      baseUrl = "" // No base URL for file uploads

      console.log(
        `Using uploaded WSDL file content length: ${wsdlContent.length} bytes`
      )
    }

    console.log(`WSDL content preview: ${wsdlContent.substring(0, 200)}...`)

    // Validate the WSDL content before parsing
    if (!validateWSDLContent(wsdlContent)) {
      const errorMsg = "The provided content does not contain valid WSDL"
      console.error(errorMsg)
      wsdlError.value = errorMsg
      toast.error(errorMsg)
      creatingFromWSDL.value = false
      return
    }

    // Parse the WSDL content
    console.log(`Calling parseWSDL with baseUrl: ${baseUrl}`)
    const result = await parseWSDL(wsdlContent, baseUrl)

    if (E.isLeft(result)) {
      const error = result.left
      console.error("WSDL parse error:", error)
      wsdlError.value = error instanceof Error ? error.message : String(error)
      toast.error(error instanceof Error ? error.message : String(error))
      return
    }

    console.log("WSDL parse succeeded, result:", result.right)

    // Extract the parsed data
    const parsedData = result.right
    operations = parsedData.operations || []
    services = parsedData.services || []

    // Check if there are operations in the WSDL
    if (!operations || operations.length === 0) {
      console.error("No operations found in the WSDL file")
      wsdlError.value =
        "No operations found in the WSDL file. The WSDL may be invalid or in an unsupported format."
      toast.error("No operations found in the WSDL file")
      creatingFromWSDL.value = false
      return
    }

    console.log(
      `Found ${operations.length} operations in the WSDL:`,
      operations.map((op) => op.name).join(", ")
    )

    // Create the main collection
    const collection = collectionStore.createCollection(collectionName.value)

    // Get endpoint from services
    const serviceEndpoint =
      services.length > 0 && services[0]?.port?.address
        ? services[0].port.address
        : ""

    // Process each feature based on user selection
    let createdRequests = 0

    // Feature 1: Create sample requests for all operations
    if (createSampleRequests.value) {
      operations.forEach((operation) => {
        const sampleBody = generateSampleSOAPEnvelope(
          operation,
          parsedData.schemas
        )

        // Create detailed documentation
        const documentationParts = [`Operation: ${operation.name}`]

        if (operation.soapAction) {
          documentationParts.push(`SOAP Action: ${operation.soapAction}`)
        }

        if (operation.input || operation.inputElement) {
          documentationParts.push(`Input Message: ${operation.input || ""}`)
          documentationParts.push(
            `Input Element: ${operation.inputElement || ""}`
          )
        }

        if (operation.output || operation.outputElement) {
          documentationParts.push(`Output Message: ${operation.output || ""}`)
          documentationParts.push(
            `Output Element: ${operation.outputElement || ""}`
          )
        }

        if (operation.documentation) {
          documentationParts.push(`Description: ${operation.documentation}`)
        }

        const operationDoc = documentationParts.join("\n")

        // Create SOAP request with sample data
        const soapRequest = makeSOAPRequest({
          name: `${operation.name} (Sample)`,
          endpoint: serviceEndpoint,
          wsdlUrl: wsdlSourceType.value === "url" ? wsdlUrl.value : "",
          soapVersion: "1.1",
          auth: { authType: "none", authActive: true },
          headers: [
            {
              key: "Content-Type",
              value: "text/xml; charset=utf-8",
              active: true,
            },
            {
              key: "SOAPAction",
              value: operation.soapAction || `"${operation.name}"`,
              active: true,
            },
          ],
          params: [],
          operation: operation.name,
          body: sampleBody,
          preRequestScript: "",
          testScript: "",
          attachments: [],
          useMtom: false,
        })

        console.log(`Creating sample request for operation: ${operation.name}`)

        const newRequest = collectionStore.addRequest(
          collection.id,
          soapRequest,
          `${operation.name} (Sample)`
        )

        if (newRequest && operationDoc) {
          newRequest.documentation = operationDoc
          createdRequests++
        }
      })
    }

    // Feature 2: Create TestSuite for the imported WSDL
    if (createTestSuite.value) {
      const testSuiteCollection = collectionStore.createCollection(
        `${collectionName.value} - Test Suite`
      )

      operations.forEach((operation) => {
        const testBody = generateSampleSOAPEnvelope(
          operation,
          parsedData.schemas
        )
        const testScript = generateTestScript(operation)

        const testRequest = makeSOAPRequest({
          name: `Test: ${operation.name}`,
          endpoint: serviceEndpoint,
          wsdlUrl: wsdlSourceType.value === "url" ? wsdlUrl.value : "",
          soapVersion: "1.1",
          auth: { authType: "none", authActive: true },
          headers: [
            {
              key: "Content-Type",
              value: "text/xml; charset=utf-8",
              active: true,
            },
            {
              key: "SOAPAction",
              value: operation.soapAction || `"${operation.name}"`,
              active: true,
            },
          ],
          params: [],
          operation: operation.name,
          body: testBody,
          preRequestScript: "",
          testScript: testScript,
          attachments: [],
          useMtom: false,
        })

        console.log(`Creating test request for operation: ${operation.name}`)

        const newRequest = collectionStore.addRequest(
          testSuiteCollection.id,
          testRequest,
          `Test: ${operation.name}`
        )

        if (newRequest) {
          newRequest.documentation = `Automated test for ${operation.name} operation`
          createdRequests++
        }
      })
    }

    // Feature 3: Create web service simulation
    if (createSimulation.value) {
      const simulationCollection = collectionStore.createCollection(
        `${collectionName.value} - Simulation`
      )

      operations.forEach((operation) => {
        const mockResponse = generateMockSOAPResponse(
          operation,
          parsedData.schemas
        )
        const simulationScript = generateSimulationScript(
          operation,
          mockResponse
        )

        const simulationRequest = makeSOAPRequest({
          name: `Mock: ${operation.name}`,
          endpoint: `http://localhost:8080/mock/${operation.name}`, // Mock endpoint
          wsdlUrl: wsdlSourceType.value === "url" ? wsdlUrl.value : "",
          soapVersion: "1.1",
          auth: { authType: "none", authActive: true },
          headers: [
            {
              key: "Content-Type",
              value: "text/xml; charset=utf-8",
              active: true,
            },
            {
              key: "SOAPAction",
              value: operation.soapAction || `"${operation.name}"`,
              active: true,
            },
          ],
          params: [],
          operation: operation.name,
          body: generateSampleSOAPEnvelope(operation, parsedData.schemas),
          preRequestScript: simulationScript,
          testScript: "",
          attachments: [],
          useMtom: false,
        })

        console.log(
          `Creating simulation request for operation: ${operation.name}`
        )

        const newRequest = collectionStore.addRequest(
          simulationCollection.id,
          simulationRequest,
          `Mock: ${operation.name}`
        )

        if (newRequest) {
          newRequest.documentation = `Mock simulation for ${operation.name} operation.\n\nExpected Response:\n${mockResponse}`
          createdRequests++
        }
      })
    }

    // Trigger save to persist all changes
    collectionStore.saveCollections()

    // Reset form
    showCreateFromWSDLModal.value = false
    wsdlUrl.value = ""
    wsdlFileContent.value = ""
    wsdlFileName.value = ""
    collectionName.value = ""

    // Reset checkboxes to defaults
    createSampleRequests.value = true
    createTestSuite.value = false
    createSimulation.value = false

    const features = []
    if (createSampleRequests.value) features.push("sample requests")
    if (createTestSuite.value) features.push("test suite")
    if (createSimulation.value) features.push("simulation")

    toast.success(
      `Collection created from WSDL with ${createdRequests} requests` +
        (features.length > 0 ? ` (${features.join(", ")})` : "")
    )
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
          if (typeof reader.result === "string") {
            const importedCollections = JSON.parse(reader.result)
            if (Array.isArray(importedCollections)) {
              importedCollections.forEach((collection) => {
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

// Functions for URL editing
function toggleEditRequest(requestId: string) {
  // If we're already editing this request, cancel editing
  if (editingRequestId.value === requestId) {
    cancelEditRequest()
    return
  }

  // Find the request to get its current endpoint
  const collection = collections.value.find((coll) =>
    coll.requests.some((req) => req.id === requestId)
  )

  if (collection) {
    const request = collection.requests.find((req) => req.id === requestId)
    if (request) {
      editingRequestUrl.value = request.request.endpoint || ""
      editingRequestId.value = requestId
    }
  }
}

function saveRequestUrl(collectionRequest: {
  id: string
  name: string
  request: any
}) {
  // Update the endpoint in the request
  if (editingRequestId.value === collectionRequest.id) {
    // Find the collection that contains this request
    const collection = collections.value.find((coll) =>
      coll.requests.some((req) => req.id === collectionRequest.id)
    )

    if (collection) {
      // Update the request directly in the collection
      for (const req of collection.requests) {
        if (req.id === collectionRequest.id) {
          // Update the endpoint
          req.request.endpoint = editingRequestUrl.value
          break
        }
      }

      // Save the collections
      collectionStore.saveCollections()

      // Notify the user
      toast.success(`Endpoint URL updated for ${collectionRequest.name}`)

      // Clean up
      cancelEditRequest()
    }
  }
}

function cancelEditRequest() {
  editingRequestId.value = null
  editingRequestUrl.value = ""
}

// Helper functions for WSDL import features

function generateSampleSOAPEnvelope(
  operation: any,
  schemas: Map<string, any>
): string {
  const soapVersion: string = "1.1"
  const soapNS =
    soapVersion === "1.2"
      ? "http://www.w3.org/2003/05/soap-envelope"
      : "http://schemas.xmlsoap.org/soap/envelope/"

  // Create a basic SOAP envelope with sample data
  let envelope = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="${soapNS}">`

  // Add namespaces if available
  if (operation.inputElement) {
    envelope += `
  xmlns:tns="http://tempuri.org/">
  <soap:Header/>
  <soap:Body>
    <tns:${operation.inputElement || operation.name}>`

    // Generate sample input parameters based on schema
    const sampleParams = generateSampleParameters(operation, schemas)
    envelope += sampleParams

    envelope += `
    </tns:${operation.inputElement || operation.name}>
  </soap:Body>
</soap:Envelope>`
  } else {
    envelope += `>
  <soap:Header/>
  <soap:Body>
    <${operation.name}>
      <!-- Add your parameters here -->
    </${operation.name}>
  </soap:Body>
</soap:Envelope>`
  }

  return envelope
}

function generateSampleParameters(
  operation: any,
  schemas: Map<string, any>
): string {
  // This is a simplified sample parameter generation
  // In a real implementation, you would parse the WSDL schema to generate accurate sample data
  return `
      <!-- Sample parameters for ${operation.name} -->
      <parameter1>sample_value_1</parameter1>
      <parameter2>sample_value_2</parameter2>
      <!-- Add more parameters based on WSDL schema -->`
}

function generateTestScript(operation: any): string {
  return `// Test script for ${operation.name} operation

// Check if the response is successful
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

// Check if response is valid XML
pm.test("Response is valid XML", function () {
    const responseText = pm.response.text();
    pm.expect(responseText).to.include('<?xml');
    pm.expect(responseText).to.include('soap:Envelope');
});

// Check for SOAP fault
pm.test("No SOAP fault", function () {
    const responseText = pm.response.text();
    pm.expect(responseText).to.not.include('soap:Fault');
    pm.expect(responseText).to.not.include('faultcode');
});

// Check response contains expected operation result
pm.test("Response contains operation result", function () {
    const responseText = pm.response.text();
    pm.expect(responseText).to.include('${operation.name}Response');
});

// Performance test
pm.test("Response time is less than 5000ms", function () {
    pm.expect(pm.response.responseTime).to.be.below(5000);
});

// Log response for debugging
console.log("SOAP Response for ${operation.name}:", pm.response.text());`
}

function generateMockSOAPResponse(
  operation: any,
  schemas: Map<string, any>
): string {
  const soapVersion: string = "1.1"
  const soapNS =
    soapVersion === "1.2"
      ? "http://www.w3.org/2003/05/soap-envelope"
      : "http://schemas.xmlsoap.org/soap/envelope/"

  let mockResponse = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="${soapNS}" xmlns:tns="http://tempuri.org/">
  <soap:Header/>
  <soap:Body>
    <tns:${operation.name}Response>`

  // Generate mock response data
  mockResponse += generateMockResponseData(operation, schemas)

  mockResponse += `
    </tns:${operation.name}Response>
  </soap:Body>
</soap:Envelope>`

  return mockResponse
}

function generateMockResponseData(
  operation: any,
  schemas: Map<string, any>
): string {
  // Generate sample response data based on operation
  return `
      <result>
        <status>success</status>
        <message>Mock response for ${operation.name}</message>
        <data>
          <id>12345</id>
          <timestamp>${new Date().toISOString()}</timestamp>
          <value>mock_data_value</value>
        </data>
      </result>`
}

function generateSimulationScript(
  operation: any,
  mockResponse: string
): string {
  return `// Simulation script for ${operation.name} operation
// This script sets up a mock response for testing

// Set mock response data
const mockResponseData = \`${mockResponse.replace(/`/g, "\\`")}\`;

// Override the request to return mock data
pm.sendRequest = function(request, callback) {
    // Log the mock simulation
    console.log("🎭 Mock simulation for ${operation.name}");
    console.log("Original request would be sent to:", request.url);
    
    // Create mock response
    const mockResponse = {
        status: 200,
        headers: {
            'Content-Type': 'text/xml; charset=utf-8'
        },
        body: mockResponseData,
        responseTime: 100 + Math.random() * 200 // Random response time between 100-300ms
    };
    
    // Call the callback with mock response
    callback(null, mockResponse);
};

// Set environment variables for simulation
pm.environment.set("simulation_mode", "true");
pm.environment.set("mock_operation", "${operation.name}");

console.log("✅ Mock simulation ready for ${operation.name}");`
}
</script>

<style scoped>
.badge {
  background-color: rgba(var(--accent-color), 0.2);
  color: rgb(var(--accent-color));
}
</style>
