<template>
  <HoppSmartModal
    v-if="show"
    dialog
    :title="t('action.edit_request')"
    styles="sm:max-w-lg"
    @close="hideModal"
  >
    <template #body>
      <div v-if="loading" class="flex flex-col items-center justify-center p-4">
        <HoppSmartSpinner class="my-4" />
        <span class="text-secondaryLight">{{ t("state.loading") }}</span>
      </div>
      <form v-else class="space-y-4 p-4" @submit.prevent="saveRequest">
        <div>
          <label for="endpoint" class="block mb-1 text-sm font-semibold">{{
            t("endpoint")
          }}</label>
          <input
            id="endpoint"
            v-model="editedRequest.endpoint"
            type="url"
            class="w-full bg-primaryLight border border-dividerLight rounded px-3 py-2 focus:outline-none focus:ring focus:ring-accent"
            :placeholder="t('endpoint')"
          />
        </div>

        <div>
          <label for="wsdlUrl" class="block mb-1 text-sm font-semibold">{{
            t("soap.wsdl_url")
          }}</label>
          <input
            id="wsdlUrl"
            v-model="editedRequest.wsdlUrl"
            type="url"
            class="w-full bg-primaryLight border border-dividerLight rounded px-3 py-2 focus:outline-none focus:ring focus:ring-accent"
            :placeholder="t('soap.wsdl_url')"
          />
        </div>

        <div>
          <label for="operation" class="block mb-1 text-sm font-semibold">{{
            t("soap.operation")
          }}</label>
          <input
            id="operation"
            v-model="editedRequest.operation"
            type="text"
            class="w-full bg-primaryLight border border-dividerLight rounded px-3 py-2 focus:outline-none focus:ring focus:ring-accent"
            :placeholder="t('soap.operation')"
          />
        </div>

        <div>
          <label for="soapVersion" class="block mb-1 text-sm font-semibold">{{
            t("soap.version")
          }}</label>
          <select
            id="soapVersion"
            v-model="editedRequest.soapVersion"
            class="w-full bg-primaryLight border border-dividerLight rounded px-3 py-2 focus:outline-none focus:ring focus:ring-accent"
          >
            <option value="1.1">SOAP 1.1</option>
            <option value="1.2">SOAP 1.2</option>
          </select>
        </div>

        <div>
          <label for="body" class="block mb-1 text-sm font-semibold">{{
            t("body")
          }}</label>
          <div class="border border-dividerLight rounded">
            <SmartXMLEditor
              v-model="editedRequest.body"
              :placeholder="t('soap.enter_soap_body')"
              class="rounded"
              style="min-height: 200px"
            />
          </div>
        </div>

        <div class="flex justify-end space-x-2 pt-4">
          <button
            type="button"
            class="px-4 py-2 text-secondaryLight hover:text-secondary rounded"
            @click="hideModal"
          >
            {{ t("action.cancel") }}
          </button>
          <button
            type="submit"
            class="px-4 py-2 bg-accent text-white rounded hover:bg-accentDark"
          >
            {{ t("action.save") }}
          </button>
        </div>
      </form>
    </template>
  </HoppSmartModal>
</template>

<script setup lang="ts">
import { ref, reactive, defineProps, defineEmits, watch, computed } from "vue"
import { useToast } from "../../composables/toast"
import { useI18n } from "../../composables/i18n"
import { HoppSOAPRequest } from "@hoppscotch/data"
import { HoppSmartModal, HoppSmartSpinner } from "@hoppscotch/ui"
import * as XMLEditorImport from "../../components/smart/XMLEditor.vue"

const SmartXMLEditor = XMLEditorImport.default || XMLEditorImport

const toast = useToast()
const t = useI18n()

const props = defineProps<{
  modelValue: boolean
  request: HoppSOAPRequest
}>()

const emit = defineEmits<{
  (e: "update:modelValue", value: boolean): void
  (e: "save", request: HoppSOAPRequest): void
}>()

const loading = ref(false)
const editedRequest = reactive<HoppSOAPRequest>({} as HoppSOAPRequest)

watch(
  () => props.request,
  (newVal) => {
    if (newVal) {
      loading.value = true
      try {
        // Deep clone the request
        const requestClone = JSON.parse(JSON.stringify(newVal))

        // Ensure body is never null or undefined
        if (!requestClone.body) {
          const opName = requestClone.operation || "request"
          requestClone.body = `<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope">
  <soap:Header/>
  <soap:Body>
    <${opName}></${opName}>
  </soap:Body>
</soap:Envelope>`
        }

        Object.assign(editedRequest, requestClone)
      } catch (error) {
        console.error("Error loading request:", error)
        toast.error(t("error.something_went_wrong"))
      } finally {
        loading.value = false
      }
    }
  },
  { immediate: true }
)

const show = computed(() => props.modelValue)

function hideModal() {
  emit("update:modelValue", false)
}

function saveRequest() {
  // Validate the SOAP body
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(editedRequest.body, "text/xml")
    const parserError = doc.querySelector("parsererror")

    if (parserError) {
      toast.error(t("error.invalid_xml"))
      return
    }

    const envelope = doc.querySelector("Envelope")
    if (!envelope) {
      toast.error(t("soap.error.missing_envelope"))
      return
    }

    emit("save", { ...editedRequest })
    hideModal()
    toast.success(t("state.saved"))
  } catch (error) {
    toast.error(t("error.something_went_wrong"))
    console.error("Error saving SOAP request:", error)
  }
}
</script>

<script lang="ts">
export default {
  name: "SoapEditRequestModal",
}
</script>
