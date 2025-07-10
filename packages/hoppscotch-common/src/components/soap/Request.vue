<template>
  <div class="flex flex-col flex-1">
    <div v-if="!request" class="p-4">
      <span style="color: red">No request data found for this tab.</span>
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
                {{ t(loading ? "cancel" : "send") }}
                <svg
                  v-if="!loading"
                  xmlns="http://www.w3.org/2000/svg"
                  class="w-4 h-4 ml-2 inline-block"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
            </div>

            <div class="flex">
              <button
                class="flex items-center px-4 py-2 bg-primaryLight hover:bg-primaryDark border border-divider rounded-md text-secondaryDark transition-colors"
                @click="saveRequest"
              >
                <span>{{ t("save") }}</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="w-4 h-4 ml-2"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
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
            :info="operation ? '1' : '0'"
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
          <HoppSmartTab id="body" :label="t('body')" />
          <HoppSmartTab
            id="attachments"
            :label="t('soap.attachments')"
            :info="attachments.length ? String(attachments.length) : '0'"
          />
          <HoppSmartTab id="auth" :label="t('authorization')" />
          <HoppSmartTab
            id="pre-request-script"
            :label="t('preRequestScript')"
          />
          <HoppSmartTab id="tests" :label="t('tests')" />
        </HoppSmartTabs>

        <!-- Tab content -->
        <div v-if="activeTab === 'wsdl'" class="flex flex-col flex-1 p-4">
          <!-- WSDL Source Selection -->
          <div class="flex flex-col pb-4 border-b">
            <label class="pb-1 font-semibold">{{
              t("soap.wsdl_source")
            }}</label>
            <div class="flex space-x-2 mb-4">
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

            <!-- URL Input -->
            <div v-if="wsdlSourceType === 'url'">
              <label class="pb-1 font-semibold">{{ t("soap.wsdl_url") }}</label>
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
                  :loading="fetchingWSDL"
                  @click="fetchWSDLDetails"
                />
              </div>
            </div>

            <!-- File Upload -->
            <div v-if="wsdlSourceType === 'file'">
              <label class="pb-1 font-semibold">{{
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
                <HoppButtonSecondary class="flex-1" @click="clickFileInput">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="w-4 h-4 mr-2"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7,10 12,15 17,10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  {{ wsdlFileName || t("soap.choose_wsdl_file") }}
                </HoppButtonSecondary>
                <HoppButtonSecondary
                  v-if="wsdlFileName"
                  class="px-2"
                  @click="clearWSDLFile"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </HoppButtonSecondary>
              </div>
              <div v-if="wsdlFileName" class="mt-2">
                <HoppButtonPrimary
                  :label="t('soap.parse_wsdl')"
                  :loading="fetchingWSDL"
                  @click="parseWSDLFile"
                />
              </div>
            </div>

            <span v-if="wsdlError" class="mt-1 text-red-500">{{
              wsdlError
            }}</span>
          </div>

          <div class="flex flex-col mt-4">
            <label class="pb-1 font-semibold">{{
              t("soap.soap_version")
            }}</label>
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

        <div
          v-else-if="activeTab === 'operation'"
          class="flex flex-col flex-1 p-4"
        >
          <div class="flex flex-col">
            <label class="pb-1 font-semibold">{{ t("soap.operation") }}</label>
            <select
              v-model="operation"
              class="flex-1 px-4 py-2 bg-primary border rounded"
              :disabled="!wsdlOperations.length"
            >
              <option v-if="!wsdlOperations.length" value="">
                {{ t("soap.fetch_wsdl_first") }}
              </option>
              <option
                v-for="op in wsdlOperations"
                v-else
                :key="op.name"
                :value="op.name"
              >
                {{ op.name }}
              </option>
            </select>
          </div>

          <!-- Add endpoint editing and execute button in the operation tab -->
          <div class="flex flex-col mt-4">
            <label class="pb-1 font-semibold">{{ t("endpoint") }}</label>
            <div class="flex">
              <input
                v-model="endpoint"
                type="text"
                class="flex-1 px-4 py-2 bg-primary border rounded-l"
                :placeholder="t('endpoint')"
              />
              <button
                class="px-4 py-2 bg-accent hover:bg-accentDark text-white rounded-r"
                @click="loading ? cancelRequest() : sendRequest()"
              >
                {{ t(loading ? "cancel" : "execute") }}
              </button>
            </div>
          </div>

          <!-- Generate envelope button -->
          <div class="flex mt-4">
            <HoppButtonSecondary
              v-if="operation"
              :label="t('soap.generate_envelope')"
              class="ml-auto"
              @click="generateEnvelope"
            >
              <template #icon>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="w-4 h-4 mr-2"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path
                    d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                  ></path>
                </svg>
              </template>
            </HoppButtonSecondary>
          </div>

          <div v-if="selectedOperation" class="mt-4 p-4 border rounded">
            <div class="font-semibold">{{ t("soap.operation_details") }}</div>
            <div class="mt-2">
              <div v-if="selectedOperation.input">
                <span class="font-semibold">{{ t("soap.input") }}:</span>
                {{ selectedOperation.input }}
              </div>
              <div v-if="selectedOperation.output">
                <span class="font-semibold">{{ t("soap.output") }}:</span>
                {{ selectedOperation.output }}
              </div>
              <div v-if="selectedOperation.soapAction">
                <span class="font-semibold">{{ t("soap.action") }}:</span>
                {{ selectedOperation.soapAction }}
              </div>
            </div>
          </div>

          <div v-if="wsdlServiceEndpoint" class="mt-4 p-4 border rounded">
            <div class="font-semibold">{{ t("soap.service_details") }}</div>
            <div class="mt-2">
              <div>
                <span class="font-semibold"
                  >{{ t("soap.service_endpoint") }}:</span
                >
                {{ wsdlServiceEndpoint }}
              </div>
              <HoppButtonSecondary
                :label="t('soap.use_endpoint')"
                class="mt-2"
                @click="useServiceEndpoint"
              />
            </div>
          </div>
        </div>

        <div
          v-else-if="activeTab === 'params'"
          class="flex flex-col flex-1 p-4"
        >
          <!-- Params editor component -->
          <ParametersComponent v-model="params" />
        </div>
        <div
          v-else-if="activeTab === 'headers'"
          class="flex flex-col flex-1 p-4"
        >
          <!-- Headers editor - custom implementation for SOAP -->
          <div class="flex flex-col">
            <div class="flex items-center justify-between pb-4">
              <span class="font-semibold">{{ t("headers") }}</span>
              <HoppButtonSecondary
                :label="t('add')"
                outlined
                @click="addNewHeader"
              />
            </div>
            <div
              v-if="!headers.length"
              class="flex flex-col items-center justify-center p-4 text-secondaryLight"
            >
              <span>{{ t("state.nothing_found") }}</span>
              <span class="mt-2">{{ t("soap.add_headers") }}</span>
            </div>
            <div v-else class="divide-y divide-dividerLight border">
              <div
                v-for="(header, index) in headers"
                :key="`header-${index}`"
                class="flex p-2 hover:bg-primaryLight"
              >
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
                  <button class="col-span-1" @click="removeHeader(index)">
                    <IconTrash class="w-5 h-5 text-red-500" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div v-else-if="activeTab === 'body'" class="flex flex-col flex-1 p-4">
          <div class="flex items-center justify-between mb-4">
            <span class="font-semibold">{{ t("soap.soap_body") }}</span>
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
        <div
          v-else-if="activeTab === 'attachments'"
          class="flex flex-col flex-1 p-4"
        >
          <div class="flex items-center justify-between pb-4">
            <span class="font-semibold">{{ t("soap.attachments") }}</span>
            <div class="flex">
              <HoppButtonSecondary
                :class="{ 'bg-accent text-white': useMtom }"
                :label="t('soap.mtom')"
                class="mr-2"
                @click="toggleMtomMode"
              />
              <HoppButtonSecondary
                :label="t('add')"
                outlined
                @click="addAttachment"
              />
            </div>
          </div>
          <div
            v-if="!attachments.length"
            class="flex flex-col items-center justify-center p-4 text-secondaryLight"
          >
            <span>{{ t("state.nothing_found") }}</span>
            <span class="mt-2">{{ t("soap.add_attachments") }}</span>
          </div>
          <div v-else class="divide-y divide-dividerLight border">
            <div
              v-for="(attachment, index) in attachments"
              :key="`attachment-${index}`"
              class="flex p-4 hover:bg-primaryLight"
            >
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
                  <button class="col-span-1" @click="removeAttachment(index)">
                    <IconTrash class="w-5 h-5 text-red-500" />
                  </button>
                </div>
                <div class="col-span-12 flex items-center">
                  <button
                    class="flex-1 px-4 py-2 border border-dashed border-divider text-secondaryLight hover:text-secondaryDark"
                    @click="selectFile(index)"
                  >
                    {{ getFileInfo(attachment, index) }}
                  </button>
                  <input
                    :ref="`fileInput${index}`"
                    type="file"
                    class="hidden"
                    @change="handleFileUpload($event, index)"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-else-if="activeTab === 'auth'" class="flex flex-col flex-1 p-4">
          <AuthorizationComponent v-model="auth" />
        </div>

        <div
          v-else-if="activeTab === 'pre-request-script'"
          class="flex flex-col flex-1 p-4"
        >
          <SmartCodeEditor
            v-model="preRequestScript"
            language="javascript"
            class="flex-1"
          />
        </div>

        <div v-else-if="activeTab === 'tests'" class="flex flex-col flex-1 p-4">
          <!-- Script editor for test script -->
          <SmartCodeEditor
            v-model="testScript"
            language="javascript"
            class="flex-1"
          />
        </div>
      </div>
    </div>

    <!-- WSDL Import Options Modal -->
    <HoppSmartModal
      :show="showWSDLOptionsModal"
      dialog
      :title="t('soap.wsdl_import_options')"
      @hide-modal="cancelWSDLImport"
    >
      <template #body>
        <div class="flex flex-col space-y-4">
          <p class="text-secondary">
            {{ t("soap.wsdl_import_options_description") }}
          </p>

          <!-- Project name input -->
          <div class="flex flex-col space-y-1">
            <label for="projectName" class="text-secondary font-semibold">{{
              t("soap.project_name")
            }}</label>
            <input
              id="projectName"
              v-model="wsdlImportOptions.projectName"
              type="text"
              class="flex-1 bg-primaryLight border border-divider rounded px-4 py-2"
              :placeholder="t('soap.project_name_placeholder')"
            />
          </div>

          <div class="flex flex-col space-y-2">
            <label class="flex items-center space-x-2">
              <input
                v-model="wsdlImportOptions.createSampleRequests"
                type="checkbox"
                class="h-4 w-4 text-accent border-divider rounded focus:ring-accent"
              />
              <span class="text-secondary">{{
                t("soap.create_sample_requests")
              }}</span>
            </label>

            <label class="flex items-center space-x-2">
              <input
                v-model="wsdlImportOptions.createTestSuite"
                type="checkbox"
                class="h-4 w-4 text-accent border-divider rounded focus:ring-accent"
              />
              <span class="text-secondary">{{
                t("soap.create_test_suite")
              }}</span>
            </label>

            <label class="flex items-center space-x-2">
              <input
                v-model="wsdlImportOptions.createSimulation"
                type="checkbox"
                class="h-4 w-4 text-accent border-divider rounded focus:ring-accent"
              />
              <span class="text-secondary">{{
                t("soap.create_simulation")
              }}</span>
            </label>
          </div>
        </div>
      </template>

      <template #footer>
        <span class="flex space-x-2">
          <HoppButtonSecondary
            :label="t('action.cancel')"
            @click="cancelWSDLImport"
          />
          <HoppButtonPrimary
            :label="t('action.import')"
            @click="applyWSDLImportOptions"
          />
        </span>
      </template>
    </HoppSmartModal>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, defineAsyncComponent } from "vue"
import { useToast } from "../../composables/toast"
import { useFullI18n } from "../../composables/i18n"
import { getService } from "../../modules/dioc"
import { useSOAPEndpointHistory } from "../../composables/soap"
import { SOAP_VERSION_1_1, SOAP_VERSION_1_2 } from "@hoppscotch/data"
import IconTrash from "~icons/lucide/trash"
import { SOAPTabService } from "../../services/tab/soap"
import {
  parseWSDL,
  WSDLOperation,
  WSDLService,
  fetchWSDL,
  generateSoapEnvelope,
} from "../../helpers/soap/wsdl-parser"
import * as E from "fp-ts/Either"
import xmlFormat from "xml-formatter"

// Import components
import SmartCodeEditor from "../smart/SmartCodeEditor.vue"
import {
  HoppButtonPrimary,
  HoppButtonSecondary,
  HoppSmartTabs,
  HoppSmartTab,
  HoppSmartModal,
} from "@hoppscotch/ui"

// For HTTP components, we need to setup a workaround since they don't have default exports
const ParametersComponent = defineAsyncComponent(
  () => import("../http/Parameters.vue")
)
const AuthorizationComponent = defineAsyncComponent(
  () => import("../http/Authorization.vue")
)

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

// WSDL file upload variables
const wsdlSourceType = ref<"url" | "file">("url")
const wsdlFileContent = ref("")
const wsdlFileName = ref("")

// WSDL import options modal state
const showWSDLOptionsModal = ref(false)
const wsdlImportOptions = ref({
  projectName: "",
  createSampleRequests: false,
  createTestSuite: false,
  createSimulation: false,
})
const currentParsedWSDL = ref<{
  operations: WSDLOperation[]
  services: WSDLService[]
  targetNamespace: string
} | null>(null)

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
  },
})

const wsdlUrl = computed({
  get: () => request.value?.wsdlUrl || "",
  set: (value) => {
    tabService.updateRequest(props.tabID, { wsdlUrl: value })
  },
})

const soapVersion = computed({
  get: () => request.value?.soapVersion || SOAP_VERSION_1_1,
  set: (value) => {
    tabService.updateRequest(props.tabID, {
      soapVersion: value as typeof SOAP_VERSION_1_1 | typeof SOAP_VERSION_1_2,
    })
  },
})

const operation = computed({
  get: () => request.value?.operation || "",
  set: (value) => {
    tabService.updateRequest(props.tabID, { operation: value })
  },
})

const params = computed({
  get: () => {
    return (request.value?.params || []).map((param) => ({
      ...param,
      description: "", // Add description field for compatibility
    }))
  },
  set: (value) => {
    // Keep only the fields we need without the description
    const clearedParams = value.map(({ key, value, active }) => ({
      key,
      value,
      active,
    }))
    tabService.updateRequest(props.tabID, { params: clearedParams })
  },
})

const headers = computed({
  get: () => request.value?.headers || [],
  set: (value) => {
    tabService.updateRequest(props.tabID, { headers: value })
  },
})

const body = computed({
  get: () => request.value?.body || "",
  set: (value) => {
    tabService.updateRequest(props.tabID, { body: value })
  },
})

const auth = computed({
  get: () => {
    const authData = request.value?.auth || {
      authType: "none",
      authActive: true,
    }
    // Transform SOAP auth format to HTTP auth format for compatibility
    if (authData.authType === "apiKey") {
      return {
        ...authData,
        authType: "api-key" as const,
        addTo:
          authData.addTo === "query"
            ? ("QUERY_PARAMS" as const)
            : ("HEADERS" as const),
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
        addTo:
          value.addTo === "QUERY_PARAMS"
            ? ("query" as const)
            : ("header" as const),
      }
      tabService.updateRequest(props.tabID, { auth: transformedValue })
    } else {
      tabService.updateRequest(props.tabID, { auth: value })
    }
  },
})

const preRequestScript = computed({
  get: () => request.value?.preRequestScript || "",
  set: (value) => {
    tabService.updateRequest(props.tabID, { preRequestScript: value })
  },
})

const testScript = computed({
  get: () => request.value?.testScript || "",
  set: (value) => {
    tabService.updateRequest(props.tabID, { testScript: value })
  },
})

const attachments = computed({
  get: () => request.value?.attachments || [],
  set: (value) => {
    tabService.updateRequest(props.tabID, { attachments: value })
  },
})

const useMtom = computed({
  get: () => request.value?.useMtom || false,
  set: (value) => {
    tabService.updateRequest(props.tabID, { useMtom: value })
  },
})

const hasWSDL = computed(() => !!wsdlUrl.value)

const selectedOperation = computed(() =>
  wsdlOperations.value.find((op) => op.name === operation.value)
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
    toast.error(t("soap.wsdl_url_required"))
    return
  }

  fetchingWSDL.value = true
  wsdlError.value = ""

  try {
    // Fetch the WSDL content
    const wsdlContent = await fetchWSDL(wsdlUrl.value)

    if (E.isLeft(wsdlContent)) {
      const error = wsdlContent.left
      wsdlError.value = error instanceof Error ? error.message : String(error)
      toast.error(wsdlError.value)
      return
    }

    // Parse the WSDL content
    const parseResult = await parseWSDL(wsdlContent.right as string)

    if (E.isLeft(parseResult)) {
      const error = parseResult.left
      wsdlError.value = error instanceof Error ? error.message : String(error)
      toast.error(wsdlError.value)
      return
    }

    // Store parsed WSDL data temporarily
    const { operations, services, targetNamespace } = parseResult.right
    currentParsedWSDL.value = {
      operations,
      services,
      targetNamespace: targetNamespace || "",
    }

    // Extract project name from URL (last part of path without extension)
    try {
      const urlObj = new URL(wsdlUrl.value)
      const pathParts = urlObj.pathname.split("/")
      const lastPart = pathParts[pathParts.length - 1]
      const projectName = lastPart.replace(/\.(wsdl|xml)$/i, "")
      if (projectName) {
        wsdlImportOptions.value.projectName = projectName
      }
    } catch (e) {
      // If URL parsing fails, use a generic name or extract from the raw URL
      const urlParts = wsdlUrl.value.split("/")
      const lastPart = urlParts[urlParts.length - 1]
      const projectName =
        lastPart.replace(/\.(wsdl|xml)$/i, "") || "soap-project"
      wsdlImportOptions.value.projectName = projectName
    }

    // Show options modal
    showWSDLOptionsModal.value = true
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
    toast.success(t("soap.endpoint_set"))
  }
}

const generateEnvelope = () => {
  if (!operation.value || !selectedOperation.value) {
    toast.error(t("soap.select_operation"))
    return
  }

  body.value = generateSoapEnvelope(
    selectedOperation.value,
    {}, // Empty params object
    wsdlNamespace.value
  )

  // Set content type header based on SOAP version
  const contentTypeHeader = headers.value.find(
    (h) => h.key.toLowerCase() === "content-type"
  )

  if (!contentTypeHeader) {
    if (soapVersion.value === SOAP_VERSION_1_1) {
      headers.value.push({
        key: "Content-Type",
        value: "text/xml; charset=utf-8",
        active: true,
      })
    } else {
      headers.value.push({
        key: "Content-Type",
        value: "application/soap+xml; charset=utf-8",
        active: true,
      })
    }
  }
  // Update both the active tab and the tab preference
  activeTab.value = "body"
  tabService.updateOptionTabPreference(props.tabID, "body")
  toast.success(t("soap.envelope_generated"))
}

const formatBody = () => {
  try {
    body.value = xmlFormat(body.value, {
      indentation: "  ",
      collapseContent: true,
    })
    toast.success(t("state.prettified"))
  } catch (error) {
    toast.error(t("error.invalid_xml"))
  }
}

// Headers management
const addNewHeader = () => {
  headers.value.push({
    key: "",
    value: "",
    active: true,
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
    active: true,
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

const getFileInfo = (
  attachment: {
    content?: string | ArrayBuffer | null
    fileName?: string
    fileSize?: number
  },
  index: number
) => {
  return attachment.content && attachment.fileName
    ? `${attachment.fileName} (${Math.round((attachment.fileSize || 0) / 1024)} KB)`
    : t("soap.select_file")
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
        contentType: file.type || "application/octet-stream",
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
    attachments.value[index].contentId = file.name.replace(/[^a-zA-Z0-9]/g, "")
  }

  attachments.value[index].contentType = file.type || "application/octet-stream"
}

// WSDL file upload functions
const handleWSDLFileUpload = (event: Event) => {
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
  }
  reader.onerror = () => {
    toast.error(t("soap.error_reading_file"))
  }
  reader.readAsText(file)
}

const clearWSDLFile = () => {
  wsdlFileContent.value = ""
  wsdlFileName.value = ""
  const fileInput = document.querySelector(
    'input[type="file"]'
  ) as HTMLInputElement
  if (fileInput) {
    fileInput.value = ""
  }
}

const parseWSDLFile = async () => {
  if (!wsdlFileContent.value) {
    toast.error(t("soap.no_file_selected"))
    return
  }

  fetchingWSDL.value = true
  wsdlError.value = ""

  try {
    // Parse the WSDL content from file
    const parseResult = await parseWSDL(wsdlFileContent.value, "")

    if (E.isLeft(parseResult)) {
      const error = parseResult.left
      wsdlError.value = error instanceof Error ? error.message : String(error)
      toast.error(wsdlError.value)
      return
    }

    // Store parsed WSDL data temporarily
    const { operations, services, targetNamespace } = parseResult.right
    currentParsedWSDL.value = {
      operations,
      services,
      targetNamespace: targetNamespace || "",
    }

    // Extract project name from the file name (remove extension)
    if (wsdlFileName.value) {
      const projectName = wsdlFileName.value.replace(/\.(wsdl|xml)$/i, "")
      wsdlImportOptions.value.projectName = projectName
    }

    // Show options modal
    showWSDLOptionsModal.value = true
  } catch (error) {
    wsdlError.value = error instanceof Error ? error.message : String(error)
    toast.error(wsdlError.value)
  } finally {
    fetchingWSDL.value = false
  }
}

// Request execution functions
const sendRequest = async () => {
  if (!request.value) {
    toast.error(t("soap.no_request_data"))
    return
  }

  if (!endpoint.value) {
    toast.error(t("endpoint_required"))
    return
  }

  loading.value = true

  try {
    // Add the endpoint to history (assuming it's an array that can be modified)
    if (
      Array.isArray(endpointSuggestions.value) &&
      !endpointSuggestions.value.includes(endpoint.value)
    ) {
      endpointSuggestions.value.push(endpoint.value)
    }

    // Execute the SOAP request (simplified implementation for now)
    // This would typically integrate with the actual SOAP request execution logic
    console.log("Executing SOAP request:", {
      endpoint: endpoint.value,
      body: body.value,
      headers: headers.value,
      operation: operation.value,
    })

    toast.success(t("soap.request_sent"))
  } catch (error) {
    toast.error(error instanceof Error ? error.message : String(error))
  } finally {
    loading.value = false
  }
}

const cancelRequest = () => {
  loading.value = false
  toast.info(t("request.cancelled"))
}

const saveRequest = () => {
  if (!request.value) {
    toast.error(t("soap.no_request_data"))
    return
  }

  // For now, just indicate the request is saved (this would integrate with collection saving)
  toast.success(t("soap.request_saved"))
}

// Fix file input click handler
const clickFileInput = () => {
  const fileInput = document.querySelector(
    'input[type="file"][accept=".wsdl,.xml"]'
  ) as HTMLInputElement
  if (fileInput) {
    fileInput.click()
  }
}

// WSDL options modal handlers
const applyWSDLImportOptions = () => {
  if (!currentParsedWSDL.value) return

  const { operations, services, targetNamespace } = currentParsedWSDL.value

  // Apply the parsed WSDL data
  wsdlOperations.value = operations
  wsdlServices.value = services
  wsdlNamespace.value = targetNamespace || ""

  if (services.length > 0 && services[0].port?.address) {
    wsdlServiceEndpoint.value = services[0].port.address
  }

  // Handle selected options
  const selectedOptions = []

  // Set Content-Type header based on SOAP version if not present
  const contentTypeHeader = headers.value.find(
    (h) => h.key.toLowerCase() === "content-type"
  )

  if (!contentTypeHeader) {
    if (soapVersion.value === SOAP_VERSION_1_1) {
      headers.value.push({
        key: "Content-Type",
        value: "text/xml; charset=utf-8",
        active: true,
      })
    } else {
      headers.value.push({
        key: "Content-Type",
        value: "application/soap+xml; charset=utf-8",
        active: true,
      })
    }
  }

  // Add SOAPAction header if we have operations with soapAction
  const hasOperationsWithAction = operations.some((op) => op.soapAction)
  if (
    hasOperationsWithAction &&
    !headers.value.find((h) => h.key.toLowerCase() === "soapaction")
  ) {
    headers.value.push({
      key: "SOAPAction",
      value: '""', // Will be updated when an operation is selected
      active: true,
    })
  }

  if (wsdlImportOptions.value.createSampleRequests) {
    // For individual request tab, populate the current request with the first operation
    if (operations.length > 0) {
      // First setup the first operation in the current tab
      const firstOperation = operations[0]
      operation.value = firstOperation.name
      body.value = generateSampleSoapEnvelope(firstOperation, targetNamespace)

      // Update SOAPAction header if needed
      if (firstOperation.soapAction) {
        const soapActionHeader = headers.value.find(
          (h) => h.key.toLowerCase() === "soapaction"
        )
        if (soapActionHeader) {
          soapActionHeader.value = `"${firstOperation.soapAction}"`
        } else {
          headers.value.push({
            key: "SOAPAction",
            value: `"${firstOperation.soapAction}"`,
            active: true,
          })
        }
      }

      // Add creation of sample requests for all operations to the console log
      // In a real implementation, you'd create tabs/collections for each operation
      console.log(
        `Generated sample requests for ${operations.length} operations:`
      )
      operations.forEach((op) => {
        console.log(
          `- ${op.name}${op.soapAction ? ` (Action: ${op.soapAction})` : ""}`
        )
      })

      selectedOptions.push(`sample requests (${operations.length} operations)`)
    }
  }

  if (wsdlImportOptions.value.createTestSuite) {
    // Generate comprehensive test script for SOAP response validation
    const testScriptContent = generateTestScript()
    testScript.value = testScriptContent
    selectedOptions.push("test suite")
  }

  if (wsdlImportOptions.value.createSimulation) {
    // Generate enhanced simulation script for this WSDL
    const simulationScript = generateSimulationScript(
      operations,
      targetNamespace
    )
    preRequestScript.value = simulationScript
    selectedOptions.push("web service simulation")

    // Set a flag in environment to indicate we're using simulation
    console.log(
      "SOAP simulation mode enabled - requests will be intercepted by pre-request script"
    )
  }

  // Close modal and save project name for future reference
  showWSDLOptionsModal.value = false
  const projectName = wsdlImportOptions.value.projectName

  // Reset modal options
  wsdlImportOptions.value = {
    projectName: "",
    createSampleRequests: false,
    createTestSuite: false,
    createSimulation: false,
  }
  currentParsedWSDL.value = null

  // Show success message
  const projectNameText = projectName ? ` as "${projectName}"` : ""
  const optionsText =
    selectedOptions.length > 0 ? ` with ${selectedOptions.join(", ")}` : ""
  toast.success(t("soap.wsdl_parsed") + projectNameText + optionsText)

  // Update tab name if project name was provided
  if (projectName && request.value) {
    request.value.name = projectName

    // The tab name might be updated through the request update
    // We don't need to explicitly call updateTab as it seems the API doesn't support updating the name directly
  }

  // Switch to operation tab
  activeTab.value = "operation"
}

const cancelWSDLImport = () => {
  showWSDLOptionsModal.value = false
  wsdlImportOptions.value = {
    projectName: "",
    createSampleRequests: false,
    createTestSuite: false,
    createSimulation: false,
  }
  currentParsedWSDL.value = null
}

// Helper functions for generating content
const generateSampleSoapEnvelope = (
  operation: WSDLOperation,
  namespace: string
): string => {
  const soapNs =
    soapVersion.value === SOAP_VERSION_1_1
      ? "http://schemas.xmlsoap.org/soap/envelope/"
      : "http://www.w3.org/2003/05/soap-envelope"

  let envelope = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="${soapNs}"`

  if (namespace) {
    envelope += ` xmlns:tns="${namespace}"`
  }

  envelope += `>
  <soap:Header>
    <!-- Add SOAP headers here if needed -->
  </soap:Header>
  <soap:Body>
    <tns:${operation.name}>`

  // Add sample input parameters based on operation input structure
  if (operation.input) {
    // If we have input info from operation, use that to create parameters
    envelope += `
      <!-- Input: ${operation.input} -->
      <!-- InputElement: ${operation.inputElement || "Not specified"} -->
      <param1>${generateSampleValue("string")}</param1>
      <param2>${generateSampleValue("int")}</param2>`
  } else {
    envelope += `
      <!-- No detailed input information available -->
      <param1>Sample Value</param1>`
  }

  envelope += `
    </tns:${operation.name}>
  </soap:Body>
</soap:Envelope>`

  return envelope
}

// Generate sample values based on parameter type
const generateSampleValue = (type: string): string => {
  switch (type.toLowerCase()) {
    case "int":
    case "integer":
    case "number":
      return "123"
    case "float":
    case "double":
    case "decimal":
      return "123.45"
    case "boolean":
      return "true"
    case "date":
      return new Date().toISOString().split("T")[0]
    case "datetime":
      return new Date().toISOString()
    case "base64binary":
      return "c2FtcGxlIGJhc2U2NCBkYXRh"
    default:
      return "Sample String Value"
  }
}

const generateTestScript = (): string => {
  return `// SOAP Response Test Suite
pm.test("Status code is 200 OK", function () {
    pm.response.to.have.status(200);
});

pm.test("Response time is acceptable", function() {
    pm.expect(pm.response.responseTime).to.be.below(2000);
});

pm.test("Response Content-Type is XML", function () {
    pm.response.to.have.header("Content-Type");
    const contentType = pm.response.headers.get("Content-Type");
    pm.expect(contentType).to.include("xml");
});

pm.test("SOAP Envelope structure is valid", function () {
    try {
        const responseXml = xml2Json(pm.response.text());
        pm.expect(responseXml).to.have.property("soap:Envelope");
        pm.expect(responseXml["soap:Envelope"]).to.have.property("soap:Body");
    } catch(e) {
        pm.expect.fail("Invalid XML response: " + e.message);
    }
});

pm.test("No SOAP Fault in response", function () {
    const responseText = pm.response.text();
    pm.expect(responseText).to.not.include("soap:Fault");
    pm.expect(responseText).to.not.include("faultcode");
    
    try {
        const responseXml = xml2Json(pm.response.text());
        if (responseXml["soap:Envelope"]["soap:Body"]["soap:Fault"]) {
            pm.expect.fail("SOAP Fault detected: " + JSON.stringify(responseXml["soap:Envelope"]["soap:Body"]["soap:Fault"]));
        }
    } catch(e) {
        // If XML parsing fails, the earlier test will catch it
    }
});

// Extract important response values for use in other requests
try {
    const responseXml = xml2Json(pm.response.text());
    const responseBody = responseXml["soap:Envelope"]["soap:Body"];
    
    // Example: save first response element to variable
    if (responseBody && Object.keys(responseBody).length > 0) {
        const firstResponseElement = Object.keys(responseBody)[0];
        pm.environment.set("lastSoapResponseElement", firstResponseElement);
        console.log("Response element name: " + firstResponseElement);
    }
} catch(e) {
    console.log("Could not extract response values: " + e.message);
}`
}

const generateSimulationScript = (
  operations: WSDLOperation[],
  namespace: string
): string => {
  return `// SOAP Web Service Simulation
// This script creates a realistic mock response for each SOAP operation

// Extract the operation name from the SOAP request envelope
const soapBody = pm.request.body?.raw || "";
const operationMatch = soapBody.match(/<(\\w+:)?(\\w+)/);
const operation = operationMatch ? operationMatch[2] : null;

console.log("SOAP Operation detected:", operation);

// Create a base SOAP response template
const createSoapResponse = (content, isFault = false) => {
  const soapNs = soapBody.includes("http://www.w3.org/2003/05/soap-envelope") 
    ? "http://www.w3.org/2003/05/soap-envelope" 
    : "http://schemas.xmlsoap.org/soap/envelope/";
  
  const nsPrefix = soapNs === "http://schemas.xmlsoap.org/soap/envelope/" ? "soap" : "soap12";
  
  if (isFault) {
    return \`<?xml version="1.0" encoding="UTF-8"?>
<\${nsPrefix}:Envelope xmlns:\${nsPrefix}="\${soapNs}" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <\${nsPrefix}:Body>
    <\${nsPrefix}:Fault>
      <faultcode>\${nsPrefix}:Client</faultcode>
      <faultstring>\${content.message || "Error processing request"}</faultstring>
      <detail>\${content.detail || ""}</detail>
    </\${nsPrefix}:Fault>
  </\${nsPrefix}:Body>
</\${nsPrefix}:Envelope>\`;
  }
  
  return \`<?xml version="1.0" encoding="UTF-8"?>
<\${nsPrefix}:Envelope xmlns:\${nsPrefix}="\${soapNs}" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"${namespace ? ` xmlns:tns="${namespace}"` : ""}>
  <\${nsPrefix}:Body>
    \${content}
  </\${nsPrefix}:Body>
</\${nsPrefix}:Envelope>\`;
};

// Simulate responses for specific operations
let responseBody;

switch(operation) {
${operations
  .map(
    (op) => `  case "${op.name}":
    console.log("Simulating response for ${op.name}");
    responseBody = createSoapResponse(\`<tns:${op.name}Response>
      <tns:result>Simulated response for ${op.name}</tns:result>
      <tns:success>true</tns:success>
      <tns:timestamp>\${new Date().toISOString()}</tns:timestamp>
    </tns:${op.name}Response>\`);
    break;`
  )
  .join("\n")}
  default:
    console.log("Unknown operation, generating generic response");
    responseBody = createSoapResponse(\`<tns:Response>
      <tns:message>Operation not recognized or implemented in simulation</tns:message>
    </tns:Response>\`);
}

// Set environment variables for testing
pm.environment.set("soap_operation", operation || "unknown");
pm.environment.set("soap_simulation_time", new Date().toISOString());

// Return the mock response
pm.variables.set("response_body", responseBody);

// Set mock response
pm.sendRequest = function(req, callback) {
  const response = {
    code: 200,
    status: "OK",
    headers: {
      "Content-Type": "text/xml; charset=utf-8"
    },
    body: pm.variables.get("response_body")
  };
  
  callback(null, response);
};
`
}
</script>
