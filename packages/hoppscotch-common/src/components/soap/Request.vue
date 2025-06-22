<template>
  <div class="flex flex-col flex-1">
    <div v-if="!request" class="p-4">
      <span style="color: red;">No request data found for this tab.</span>
    </div>
    <div v-else class="flex flex-col flex-1">
      <!-- Request URL bar -->
      <div class="sticky z-10 flex flex-col bg-primary top-upperRequestRect">
        <div class="flex items-center px-4 py-2">
          <div class="flex items-center flex-1">
            <!-- Method indicator (always POST for SOAP) -->
            <div class="px-2 py-1">
              <div class="px-2 py-1 rounded bg-primaryLight text-secondaryDark">
                POST
              </div>
            </div>
            <!-- URL / Endpoint Input with autocomplete dropdown -->
            <div class="flex flex-1 relative ml-2">
              <input
                v-model="endpoint"
                type="text"
                autocomplete="off"
                spellcheck="false"
                class="flex flex-1 px-4 py-2 overflow-x-hidden rounded bg-primaryLight border border-divider"
                :placeholder="t('endpoint')"
                @focus="showEndpointSuggestions = true"
                @blur="hideEndpointSuggestions"
              />
              <!-- URL suggestions dropdown -->
              <div 
                v-if="showEndpointSuggestions && endpointSuggestions.length > 0" 
                class="absolute left-0 right-0 top-full mt-1 bg-primary border rounded shadow-lg z-20"
              >
                <ul class="max-h-60 overflow-y-auto">
                  <li 
                    v-for="(suggestion, index) in endpointSuggestions" 
                    :key="index"
                    class="px-4 py-2 hover:bg-primaryLight cursor-pointer"
                    @click="endpoint = suggestion"
                  >
                    {{ suggestion }}
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <!-- Send and Save Buttons -->
          <div class="flex ml-2 space-x-2">
            <div class="flex">
              <button 
                class="px-5 py-2 bg-accent hover:bg-accentDark text-white rounded-md font-semibold transition-colors"
                @click="loading ? cancelRequest() : sendRequest()"
              >
                {{ t(loading ? 'cancel' : 'send') }}
                <svg v-if="!loading" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 ml-2 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
            </div>
            
            <div class="flex">
              <button 
                class="flex items-center px-4 py-2 bg-primaryLight hover:bg-primaryDark border border-divider rounded-md text-secondaryDark transition-colors"
                @click="saveRequest"
              >
                <span>{{ t('save') }}</span>
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 ml-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
      <div class="flex flex-col flex-1">
        <!-- Tabs for request configuration -->
        <HoppSmartTabs 
          v-model="activeTab" 
          styles="sticky bg-primary z-10 border-b border-dividerLight"
        >
          <HoppSmartTab
            id="wsdl"
            :label="t('soap.wsdl')"
            :info="hasWSDL ? '1' : '0'"
          />
          <HoppSmartTab
            id="operation"
            :label="t('soap.operation')"
          />
          <HoppSmartTab
            id="params"
            :label="t('params')"
            :info="params.length ? String(params.length) : '0'"
          />
          <HoppSmartTab
            id="headers"
            :label="t('headers')"
            :info="headers.length ? String(headers.length) : '0'"
          />
          <HoppSmartTab
            id="body"
            :label="t('body')"
          />
          <HoppSmartTab
            id="attachments"
            :label="t('soap.attachments')"
            :info="attachments.length ? String(attachments.length) : '0'"
          />
          <HoppSmartTab
            id="auth"
            :label="t('authorization')"
          />
          <HoppSmartTab
            id="pre-request-script"
            :label="t('preRequestScript')"
          />
          <HoppSmartTab
            id="tests"
            :label="t('tests')"
          />
        </HoppSmartTabs>
        
        <!-- Tab content -->
        <div class="flex flex-col flex-1 p-4" v-if="activeTab === 'wsdl'">
          <div class="flex flex-col pb-4 border-b">
            <label class="pb-1 font-semibold">{{ t('soap.wsdl_url') }}</label>
            <div class="flex">
              <input
                v-model="wsdlUrl"
                type="text"
                class="flex-1 px-4 py-2 bg-primary border rounded"
                :placeholder="t('soap.enter_wsdl_url')"
              />
              <HoppButtonPrimary
                :label="t('soap.fetch_wsdl')"
                class="ml-2"
                @click="fetchWSDLDetails"
                :loading="fetchingWSDL"
              />
            </div>
            <span v-if="wsdlError" class="mt-1 text-red-500">{{ wsdlError }}</span>
          </div>
          
          <div class="flex flex-col mt-4">
            <label class="pb-1 font-semibold">{{ t('soap.soap_version') }}</label>
            <div class="flex">
              <select
                v-model="soapVersion"
                class="flex-1 px-4 py-2 bg-primary border rounded"
              >
                <option value="1.1">SOAP 1.1</option>
                <option value="1.2">SOAP 1.2</option>
              </select>
            </div>
          </div>
        </div>
        
        <div class="flex flex-col flex-1 p-4" v-else-if="activeTab === 'operation'">
          <div class="flex flex-col">
            <label class="pb-1 font-semibold">{{ t('soap.operation') }}</label>
            <select
              v-model="operation"
              class="flex-1 px-4 py-2 bg-primary border rounded"
              :disabled="!wsdlOperations.length"
            >
              <option v-if="!wsdlOperations.length" value="">{{ t('soap.fetch_wsdl_first') }}</option>
              <option v-else v-for="op in wsdlOperations" :key="op.name" :value="op.name">
                {{ op.name }}
              </option>
            </select>
          </div>
          
          <div v-if="selectedOperation" class="mt-4 p-4 border rounded">
            <div class="font-semibold">{{ t('soap.operation_details') }}</div>
            <div class="mt-2">
              <div v-if="selectedOperation.input"><span class="font-semibold">{{ t('soap.input') }}:</span> {{ selectedOperation.input }}</div>
              <div v-if="selectedOperation.output"><span class="font-semibold">{{ t('soap.output') }}:</span> {{ selectedOperation.output }}</div>
              <div v-if="selectedOperation.soapAction"><span class="font-semibold">{{ t('soap.action') }}:</span> {{ selectedOperation.soapAction }}</div>
            </div>
          </div>

          <div v-if="wsdlServiceEndpoint" class="mt-4 p-4 border rounded">
            <div class="font-semibold">{{ t('soap.service_details') }}</div>
            <div class="mt-2">
              <div><span class="font-semibold">{{ t('soap.service_endpoint') }}:</span> {{ wsdlServiceEndpoint }}</div>
              <HoppButtonSecondary
                :label="t('soap.use_endpoint')"
                class="mt-2"
                @click="useServiceEndpoint"
              />
            </div>
          </div>
        </div>
        
        <div class="flex flex-col flex-1 p-4" v-else-if="activeTab === 'params'">
          <!-- Params editor component -->
          <ParametersComponent v-model="params" />
        </div>      
        
        <div class="flex flex-col flex-1 p-4" v-else-if="activeTab === 'headers'">
          <!-- Headers editor - custom implementation for SOAP -->
          <div class="flex flex-col">
            <div class="flex items-center justify-between pb-4">
              <span class="font-semibold">{{ t('headers') }}</span>
              <HoppButtonSecondary
                :label="t('add')"
                outlined
                @click="addNewHeader"
              />
            </div>
            <div v-if="!headers.length" class="flex flex-col items-center justify-center p-4 text-secondaryLight">
              <span>{{ t('state.nothing_found') }}</span>
              <span class="mt-2">{{ t('soap.add_headers') }}</span>
            </div>
            <div v-else class="divide-y divide-dividerLight border">
              <div v-for="(header, index) in headers" :key="`header-${index}`" class="flex p-2 hover:bg-primaryLight">
                <div class="flex items-center mr-2">
                  <input 
                    type="checkbox" 
                    :checked="header.active" 
                    @change="toggleHeader(index)"
                  />
                </div>
                <div class="flex-1 grid grid-cols-12 gap-2">
                  <input
                    v-model="header.key"
                    type="text"
                    class="col-span-5 px-2 py-1 bg-primaryLight border"
                    :placeholder="t('name')"
                  />
                  <input
                    v-model="header.value"
                    type="text"
                    class="col-span-6 px-2 py-1 bg-primaryLight border"
                    :placeholder="t('value')"
                  />
                  <button @click="removeHeader(index)" class="col-span-1">
                    <IconTrash class="w-5 h-5 text-red-500" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="flex flex-col flex-1 p-4" v-else-if="activeTab === 'body'">
          <div class="flex items-center justify-between mb-4">
            <span class="font-semibold">{{ t('soap.soap_body') }}</span>
            <div class="flex space-x-2">
              <HoppButtonSecondary
                v-if="operation"
                :label="t('soap.generate_envelope')"
                @click="generateEnvelope"
              />
              <HoppButtonSecondary
                :label="t('state.pretty')"
                @click="formatBody"
              />
            </div>
          </div>
          <SmartCodeEditor
            v-model="body"
            language="xml"
            class="flex-1 border"
          />
        </div>
        
        <div class="flex flex-col flex-1 p-4" v-else-if="activeTab === 'attachments'">
          <div class="flex items-center justify-between pb-4">
            <span class="font-semibold">{{ t('soap.attachments') }}</span>
            <div class="flex">
              <HoppButtonSecondary
                :class="{ 'bg-accent text-white': useMtom }"
                :label="t('soap.mtom')"
                @click="toggleMtomMode"
                class="mr-2"
              />
              <HoppButtonSecondary
                :label="t('add')"
                outlined
                @click="addAttachment"
              />
            </div>
          </div>
          <div v-if="!attachments.length" class="flex flex-col items-center justify-center p-4 text-secondaryLight">
            <span>{{ t('state.nothing_found') }}</span>
            <span class="mt-2">{{ t('soap.add_attachments') }}</span>
          </div>
          <div v-else class="divide-y divide-dividerLight border">
            <div v-for="(attachment, index) in attachments" :key="`attachment-${index}`" class="flex p-4 hover:bg-primaryLight">
              <div class="flex items-center mr-2">
                <input 
                  type="checkbox" 
                  :checked="attachment.active" 
                  @change="toggleAttachment(index)"
                />
              </div>
              <div class="flex-1 grid grid-cols-12 gap-2">
                <div class="col-span-12 grid grid-cols-12 gap-2 pb-2">
                  <input
                    v-model="attachment.name"
                    type="text"
                    class="col-span-5 px-2 py-1 bg-primaryLight border"
                    :placeholder="t('name')"
                  />
                  <input
                    v-model="attachment.contentId"
                    type="text"
                    class="col-span-6 px-2 py-1 bg-primaryLight border"
                    :placeholder="t('soap.content_id')"
                  />
                  <button @click="removeAttachment(index)" class="col-span-1">
                    <IconTrash class="w-5 h-5 text-red-500" />
                  </button>
                </div>
                <div class="col-span-12 flex items-center">
                  <button
                    @click="selectFile(index)"
                    class="flex-1 px-4 py-2 border border-dashed border-divider text-secondaryLight hover:text-secondaryDark"
                  >
                    {{ getFileInfo(attachment, index) }}
                  </button>
                  <input
                    type="file"
                    :ref="`fileInput${index}`"
                    class="hidden"
                    @change="handleFileUpload($event, index)"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="flex flex-col flex-1 p-4" v-else-if="activeTab === 'auth'">
          <AuthorizationComponent v-model="auth" />
        </div>
        
        <div class="flex flex-col flex-1 p-4" v-else-if="activeTab === 'pre-request-script'">
          <SmartCodeEditor
            v-model="preRequestScript"
            language="javascript"
            class="flex-1"
          />
        </div>
        
        <div class="flex flex-col flex-1 p-4" v-else-if="activeTab === 'tests'">
          <!-- Script editor for test script -->
          <SmartCodeEditor
            v-model="testScript"
            language="javascript"
            class="flex-1"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, defineAsyncComponent } from "vue"
import { useToast } from "../../composables/toast"
import { useFullI18n } from "../../composables/i18n"
import { getService } from "../../modules/dioc"
import { useSOAPEndpointHistory } from "../../composables/soap"
import { 
  HoppSOAPRequest,
  SOAP_VERSION_1_1,
  SOAP_VERSION_1_2
} from "@hoppscotch/data"
import IconTrash from "~icons/lucide/trash"
import { SOAPTabService } from "../../services/tab/soap"
import { 
  parseWSDL, 
  WSDLOperation, 
  WSDLService,
  fetchWSDL,generateSoapEnvelope
} from "../../helpers/soap/wsdl-parser"
import * as E from "fp-ts/Either"
import { pipe } from "fp-ts/function"
import * as TE from "fp-ts/TaskEither"
import xmlFormat from "xml-formatter"

// Import components
import SmartCodeEditor from "../smart/SmartCodeEditor.vue"
import { HoppButtonPrimary, HoppButtonSecondary, HoppSmartTabs, HoppSmartTab } from "@hoppscotch/ui"

// For HTTP components, we need to setup a workaround since they don't have default exports
const ParametersComponent = defineAsyncComponent(() => import("../http/Parameters.vue"))
const AuthorizationComponent = defineAsyncComponent(() => import("../http/Authorization.vue"))

const props = defineProps<{
  tabID: string
}>()

const { t } = useFullI18n()
const toast = useToast()

const tabService = getService(SOAPTabService)

const activeTab = ref("wsdl")
const loading = ref(false)
const fetchingWSDL = ref(false)
const wsdlError = ref("")
const showEndpointSuggestions = ref(false)

// Get endpoint suggestions from history
const endpointSuggestions = useSOAPEndpointHistory()

// WSDL-related data
const wsdlOperations = ref<WSDLOperation[]>([])
const wsdlServices = ref<WSDLService[]>([])
const wsdlNamespace = ref<string>("")
const wsdlServiceEndpoint = ref<string>("")

// Get the tab's request
const request = computed(() => {
  const tab = tabService.tabs.value.find((tab) => tab.id === props.tabID)
  return tab ? tab.document.request : null
})

// UI state bindings to request properties
const endpoint = computed({
  get: () => request.value?.endpoint || "",
  set: (value) => {
    tabService.updateRequest(props.tabID, { endpoint: value })
  }
})

const wsdlUrl = computed({
  get: () => request.value?.wsdlUrl || "",
  set: (value) => {
    tabService.updateRequest(props.tabID, { wsdlUrl: value })
  }
})

const soapVersion = computed({
  get: () => request.value?.soapVersion || SOAP_VERSION_1_1,
  set: (value) => {
    tabService.updateRequest(props.tabID, { 
      soapVersion: value as typeof SOAP_VERSION_1_1 | typeof SOAP_VERSION_1_2
    })
  }
})

const operation = computed({
  get: () => request.value?.operation || "",
  set: (value) => {
    tabService.updateRequest(props.tabID, { operation: value })
  }
})

const params = computed({
  get: () => {
    return (request.value?.params || []).map((param) => ({
      ...param,
      description: "",  // Add description field for compatibility
    }))
  },
  set: (value) => {
    // Keep only the fields we need without the description
    const clearedParams = value.map(({ key, value, active }) => ({
      key, value, active
    }))
    tabService.updateRequest(props.tabID, { params: clearedParams })
  }
})

const headers = computed({
  get: () => request.value?.headers || [],
  set: (value) => {
    tabService.updateRequest(props.tabID, { headers: value })
  }
})

const body = computed({
  get: () => request.value?.body || "",
  set: (value) => {
    tabService.updateRequest(props.tabID, { body: value })
  }
})

const auth = computed({
  get: () => {
    const authData = request.value?.auth || { authType: "none", authActive: true }
    // Transform SOAP auth format to HTTP auth format for compatibility
    if (authData.authType === "apiKey") {
      return {
        ...authData,
        authType: "api-key" as const,
        addTo: authData.addTo === "query" ? "QUERY_PARAMS" as const : "HEADERS" as const
      }
    }
    return authData
  },
  set: (value) => {
    // Transform HTTP auth format back to SOAP auth format
    if (value.authType === "api-key") {
      const transformedValue = {
        ...value,
        authType: "apiKey" as const,
        addTo: value.addTo === "QUERY_PARAMS" ? "query" as const : "header" as const
      }
      tabService.updateRequest(props.tabID, { auth: transformedValue })
    } else {
      tabService.updateRequest(props.tabID, { auth: value })
    }
  }
})

const preRequestScript = computed({
  get: () => request.value?.preRequestScript || "",
  set: (value) => {
    tabService.updateRequest(props.tabID, { preRequestScript: value })
  }
})
 
const testScript = computed({
  get: () => request.value?.testScript || "",
  set: (value) => {
    tabService.updateRequest(props.tabID, { testScript: value })
  }
})

const attachments = computed({
  get: () => request.value?.attachments || [],
  set: (value) => {
    tabService.updateRequest(props.tabID, { attachments: value })
  }
})

const useMtom = computed({
  get: () => request.value?.useMtom || false,
  set: (value) => {
    tabService.updateRequest(props.tabID, { useMtom: value })
  }
})

const hasWSDL = computed(() => !!wsdlUrl.value)

const selectedOperation = computed(() => 
  wsdlOperations.value.find(op => op.name === operation.value)
)

// Hide endpoint suggestions when clicking outside
const hideEndpointSuggestions = () => {
  setTimeout(() => {
    showEndpointSuggestions.value = false
  }, 200)
}

// WSDL-related methods
const fetchWSDLDetails = async () => {
  if (!wsdlUrl.value) {
    toast.error(t('soap.wsdl_url_required'))
    return
  }
  
  fetchingWSDL.value = true
  wsdlError.value = ""
  
  try {
    const result = await pipe(
      () => fetchWSDL(wsdlUrl.value),
      TE.chain((wsdlContent) => TE.fromEither(parseWSDL(wsdlContent as string)))
    )()
    
    if (E.isLeft(result)) {
      const error = result.left
      wsdlError.value = error instanceof Error ? error.message : String(error)
      toast.error(wsdlError.value)
      return
    }
    
    const { operations, services, targetNamespace } = result.right
    
    wsdlOperations.value = operations
    wsdlServices.value = services
    wsdlNamespace.value = targetNamespace || ""
    
    if (services.length > 0 && services[0].port?.address) {
      wsdlServiceEndpoint.value = services[0].port.address
    }
    
    toast.success(t('soap.wsdl_parsed'))
    activeTab.value = "operation"
  } catch (error) {
    wsdlError.value = error instanceof Error ? error.message : String(error)
    toast.error(wsdlError.value)
  } finally {
    fetchingWSDL.value = false
  }
}

const useServiceEndpoint = () => {
  if (wsdlServiceEndpoint.value) {
    endpoint.value = wsdlServiceEndpoint.value
    toast.success(t('soap.endpoint_set'))
  }
}

const generateEnvelope = () => {
  if (!operation.value || !selectedOperation.value) {
    toast.error(t('soap.select_operation'))
    return
  }
  
  body.value = generateSoapEnvelope(
    selectedOperation.value,
    {}, // Empty params object
    wsdlNamespace.value
  )
  
  // Set content type header based on SOAP version
  const contentTypeHeader = headers.value.find(h => 
    h.key.toLowerCase() === 'content-type'
  )
  
  if (!contentTypeHeader) {
    if (soapVersion.value === SOAP_VERSION_1_1) {
      headers.value.push({
        key: 'Content-Type',
        value: 'text/xml; charset=utf-8',
        active: true
      })
    } else {
      headers.value.push({
        key: 'Content-Type',
        value: 'application/soap+xml; charset=utf-8',
        active: true
      })
    }
  }
  
  activeTab.value = "body"
  toast.success(t('soap.envelope_generated'))
}

const formatBody = () => {
  try {
    body.value = xmlFormat(body.value, {
      indentation: '  ',
      collapseContent: true,
    })
    toast.success(t('state.prettified'))
  } catch (error) {
    toast.error(t('error.invalid_xml'))
  }
}

// Headers management
const addNewHeader = () => {
  headers.value.push({
    key: "",
    value: "",
    active: true
  })
}

const removeHeader = (index: number) => {
  headers.value.splice(index, 1)
}

const toggleHeader = (index: number) => {
  const headersArray = [...headers.value]
  headersArray[index].active = !headersArray[index].active
  headers.value = headersArray
}

// Attachment management
const addAttachment = () => {
  attachments.value.push({
    name: "",
    contentType: "application/octet-stream",
    contentId: "",
    content: null,
    active: true
  })
}

const removeAttachment = (index: number) => {
  attachments.value.splice(index, 1)
}

const toggleAttachment = (index: number) => {
  const attachmentsArray = [...attachments.value]
  attachmentsArray[index].active = !attachmentsArray[index].active
  attachments.value = attachmentsArray
}

const toggleMtomMode = () => {
  useMtom.value = !useMtom.value
}

const selectFile = (index: number) => {
  const fileInput = document.querySelector(`#fileInput${index}`) as HTMLElement
  fileInput?.click()
}

const getFileInfo = (attachment: { content?: string | ArrayBuffer | null, fileName?: string, fileSize?: number }, index: number) => {
  return attachment.content && attachment.fileName
    ? `${attachment.fileName} (${Math.round((attachment.fileSize || 0) / 1024)} KB)`
    : t('soap.select_file')
}

const handleFileUpload = (event: Event, index: number) => {
  const target = event.target as HTMLInputElement
  if (!target.files || !target.files[0]) return

  const file = target.files[0]
  
  // Read file as ArrayBuffer
  const reader = new FileReader()
  reader.onload = (e) => {
    if (e.target?.result) {
      const updatedAttachments = [...attachments.value]
      updatedAttachments[index] = {
        ...updatedAttachments[index],
        content: e.target.result as ArrayBuffer,
        name: file.name, // Use name instead of fileName
        contentType: file.type || "application/octet-stream"
      } as any // Type assertion to handle additional properties
      // Store file info in a way that doesn't conflict with the type
      ;(updatedAttachments[index] as any).fileName = file.name
      ;(updatedAttachments[index] as any).fileSize = file.size
      attachments.value = updatedAttachments
    }
  }
  reader.readAsArrayBuffer(file)
  
  if (!attachments.value[index].name) {
    attachments.value[index].name = file.name
  }
  
  if (!attachments.value[index].contentId) {
    attachments.value[index].contentId = file.name.replace(/[^a-zA-Z0-9]/g, '')
  }
  
  attachments.value[index].contentType = file.type || "application/octet-stream"
}

// Request handling
const sendRequest = async () => {
  if (!endpoint.value) {
    toast.error(t('error.empty_endpoint'))
    return
  }
  
  loading.value = true
  tabService.setResponse(props.tabID, { type: 'loading', req: request.value })
}

const cancelRequest = () => {
  loading.value = false
}

const saveRequest = () => {
  // Save request implementation (collections, etc.)
  toast.info(t('soap.save_request_coming_soon'))
}

// Watch for changes in the tab's response
watch(
  () => {
    const tab = tabService.tabs.value.find((tab: any) => tab.id === props.tabID)
    return tab?.document.response
  },
  (newValue) => {
    if (newValue && newValue.type !== 'loading') {
      loading.value = false
    }
  },
  { deep: true }
)
</script>
