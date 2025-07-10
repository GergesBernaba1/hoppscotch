<template>
  <div class="flex flex-col flex-1">
    <div class="sticky z-10 flex px-4 bg-primary top-lowerRequestRect">
      <div class="flex items-center">
        <span class="font-semibold">{{ t("response") }}</span>
        <span
          v-if="response && response.type === 'success'"
          class="px-2 py-1 ml-2 bg-green-500 rounded"
        >
          {{ statusCodeString }}
        </span>
        <span
          v-else-if="response && response.type === 'fail'"
          class="px-2 py-1 ml-2 bg-red-500 rounded"
        >
          {{ statusCodeString }}
        </span>
        <div
          v-if="response && response.type === 'loading'"
          class="flex items-center space-x-2 ml-4"
        >
          <HoppSmartSpinner class="w-4 h-4" />
          <span>{{ t("state.loading") }}</span>
        </div>
      </div>
    </div>

    <div
      v-if="!response"
      class="flex flex-col items-center justify-center flex-1"
    >
      <img
        :src="`/images/states/rest.svg`"
        alt="No Response"
        class="max-h-64"
      />
      <span class="mt-4 text-lg">{{ t("state.waiting_send_request") }}</span>
    </div>

    <div v-else-if="response.type === 'success'" class="flex flex-col flex-1">
      <HoppSmartTabs
        v-model="activeResponseTab"
        styles="sticky bg-primary z-10"
      >
        <HoppSmartTab id="response" :label="t('response')" />
        <HoppSmartTab
          id="headers"
          :label="t('headers')"
          :info="String(response.headers?.length ?? 0)"
        />
      </HoppSmartTabs>

      <div
        v-if="activeResponseTab === 'response'"
        class="relative flex flex-col flex-1"
      >
        <SmartCodeEditor v-model="responseBody" language="xml" class="flex-1" />
      </div>

      <div
        v-else-if="activeResponseTab === 'headers'"
        class="flex flex-col flex-1 p-4"
      >
        <div
          v-for="(header, index) in response.headers"
          :key="index"
          class="flex py-2 border-b border-primaryLight"
        >
          <span class="font-semibold">{{ header.key }}:</span>
          <span class="ml-2">{{ header.value }}</span>
        </div>
      </div>
    </div>

    <div
      v-else-if="response.type === 'fail'"
      class="flex flex-col items-center justify-center flex-1"
    >
      <div class="p-4 text-center bg-red-500 rounded-md bg-opacity-10">
        <span class="text-lg font-semibold text-red-500">{{
          t("error.network_error")
        }}</span>
        <p v-if="response.error" class="mt-2 text-red-400">
          {{
            typeof response.error === "object" &&
            response.error &&
            response.error.message
              ? response.error.message
              : response.error
          }}
        </p>
      </div>
    </div>

    <div
      v-else-if="response.type === 'network_fail'"
      class="flex flex-col items-center justify-center flex-1"
    >
      <div class="p-4 text-center bg-red-500 rounded-md bg-opacity-10">
        <span class="text-lg font-semibold text-red-500">{{
          t("error.network_fail")
        }}</span>
        <p v-if="response.error" class="mt-2 text-red-400">
          {{
            typeof response.error === "object" &&
            response.error &&
            response.error.message
              ? response.error.message
              : response.error
          }}
        </p>
      </div>
    </div>

    <div
      v-else-if="response.type === 'script_fail'"
      class="flex flex-col items-center justify-center flex-1"
    >
      <div class="p-4 text-center bg-red-500 rounded-md bg-opacity-10">
        <span class="text-lg font-semibold text-red-500">{{
          t("error.script_fail")
        }}</span>
        <p v-if="response.error" class="mt-2 text-red-400">
          {{
            typeof response.error === "object" &&
            response.error &&
            response.error.message
              ? response.error.message
              : response.error
          }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue"
import { useI18n } from "vue-i18n"
import { HoppSmartTabs, HoppSmartTab, HoppSmartSpinner } from "@hoppscotch/ui"
import SmartCodeEditor from "../smart/SmartCodeEditor.vue"

const { t } = useI18n()

const props = defineProps({
  response: {
    type: Object,
    default: null,
  },
})

const activeResponseTab = ref("response")

const statusCodeString = computed(() => {
  return props.response?.statusCode ? `${props.response.statusCode}` : "Error"
})

const responseBody = computed({
  get() {
    if (!props.response || !props.response.body) return ""

    // Handle different response body types
    if (props.response.body instanceof ArrayBuffer) {
      return "[Binary data]" // Or convert to string if needed
    }

    return props.response.body
  },
  set() {
    // Response is read-only, so we don't need to update anything
  },
})
</script>

<script lang="ts">
export default { name: "SOAPResponse" }
</script>
