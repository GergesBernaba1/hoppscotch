<template>
  <HoppSmartModal
    :show="show"
    :title="t('soap.new_soap_project')"
    @hide-modal="hideModal"
  >
    <template #body>
      <div class="flex flex-col space-y-4 p-2">
        <div class="flex flex-col">
          <label class="pb-2 font-semibold" for="projectName">{{
            t("soap.project_name")
          }}</label>
          <input
            id="projectName"
            v-model="projectName"
            type="text"
            class="w-full px-3 py-2 bg-primary border border-divider rounded"
            :placeholder="t('soap.project_name_placeholder')"
          />
        </div>

        <div class="flex flex-col">
          <label class="pb-2 font-semibold" for="wsdlUrl">{{
            t("soap.initial_wsdl")
          }}</label>
          <div class="flex">
            <input
              id="wsdlUrl"
              v-model="wsdlUrl"
              type="text"
              class="flex-1 px-3 py-2 bg-primary border border-divider rounded-l"
              :placeholder="t('soap.wsdl_url_placeholder')"
            />
            <button
              class="px-4 py-2 bg-primaryLight hover:bg-primaryDark text-secondaryLight border border-divider rounded-r"
              @click="browseWsdlFile"
            >
              {{ t("action.browse") }}
            </button>
          </div>
        </div>

        <div class="flex items-center">
          <input
            id="createSampleRequests"
            v-model="createSampleRequests"
            type="checkbox"
            class="mr-2"
          />
          <label for="createSampleRequests">{{
            t("soap.create_sample_requests")
          }}</label>
        </div>

        <div class="flex items-center">
          <input
            id="createTestSuite"
            v-model="createTestSuite"
            type="checkbox"
            class="mr-2"
          />
          <label for="createTestSuite">{{ t("soap.create_test_suite") }}</label>
        </div>

        <div class="flex items-center">
          <input
            id="useRelativePaths"
            v-model="useRelativePaths"
            type="checkbox"
            class="mr-2"
          />
          <label for="useRelativePaths">{{
            t("soap.use_relative_paths")
          }}</label>
        </div>
      </div>
    </template>
    <template #actions>
      <HoppButtonSecondary :label="t('action.cancel')" @click="hideModal" />
      <HoppButtonPrimary
        :label="t('action.create')"
        :disabled="!isFormValid"
        @click="createProject"
      />
    </template>
  </HoppSmartModal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue"
import { useToast } from "../../composables/toast"
import { useI18n } from "../../composables/i18n"
import {
  HoppButtonSecondary,
  HoppButtonPrimary,
  HoppSmartModal,
} from "@hoppscotch/ui"
// We need to use default import for runtime, even though TypeScript expects named import
import useService from "dioc/vue"
import { SOAPTabService } from "../../services/tab/soap"
import { fetchWSDL, parseWSDL } from "../../helpers/soap/wsdl-parser"
import { pipe } from "fp-ts/function"
import * as TE from "fp-ts/TaskEither"
import * as E from "fp-ts/Either"
import { makeSOAPRequest } from "@hoppscotch/data"

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: "hide-modal"): void
}>()

const t = useI18n()
const toast = useToast()
const tabService = useService(SOAPTabService)

// For debugging component props
console.log(`NewSOAPProjectModal initialized with show =`, props.show)

// Watch for changes to the show prop
watch(
  () => props.show,
  (newVal) => {
    console.log("NewSOAPProjectModal show prop changed to:", newVal)
  }
)

// Form data
const projectName = ref("")
const wsdlUrl = ref("")
const createSampleRequests = ref(true)
const createTestSuite = ref(false)
const useRelativePaths = ref(false)

// Validation
const isFormValid = computed(() => {
  return !!projectName.value.trim() && !!wsdlUrl.value.trim()
})

// Hide modal
const hideModal = () => {
  console.log("NewSOAPProjectModal: Hiding modal")
  emit("hide-modal")

  // Reset form data
  projectName.value = ""
  wsdlUrl.value = ""
  createSampleRequests.value = true
  createTestSuite.value = false
  useRelativePaths.value = false
}

// Browse for WSDL file
const browseWsdlFile = () => {
  // Create an invisible file input element
  const fileInput = document.createElement("input")
  fileInput.type = "file"
  fileInput.accept = ".wsdl,.xml"

  // Handle file selection
  fileInput.onchange = async (event) => {
    const target = event.target as HTMLInputElement
    if (target.files && target.files.length > 0) {
      const file = target.files[0]

      try {
        // Read the file contents
        const wsdlContent = await readFileAsText(file)

        // Try to parse the WSDL
        const parseResult = parseWSDL(wsdlContent)

        if (E.isLeft(parseResult)) {
          toast.error(`Invalid WSDL file: ${parseResult.left.message}`)
          return
        }

        // If parsing successful, use the file name as the project name if not already set
        if (!projectName.value) {
          projectName.value = file.name.replace(/\.(wsdl|xml)$/i, "")
        }

        // Create a data URL for the WSDL file
        wsdlUrl.value = URL.createObjectURL(file)

        toast.success(`WSDL file loaded: ${file.name}`)
      } catch (error) {
        toast.error(
          `Error reading WSDL file: ${error instanceof Error ? error.message : "Unknown error"}`
        )
      }
    }
  }

  // Trigger the file dialog
  fileInput.click()
}

// Helper function to read a file as text
const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error("Failed to read file"))
    reader.readAsText(file)
  })
}

// Create SOAP project
const createProject = async () => {
  if (!isFormValid.value) return

  toast.info(`${t("soap.creating_project")}: ${projectName.value}`)

  try {
    // Fetch and parse WSDL
    const result = await pipe(
      fetchWSDL(wsdlUrl.value),
      TE.chain((wsdlContent) => TE.fromEither(parseWSDL(wsdlContent)))
    )()

    if (E.isLeft(result)) {
      toast.error(result.left.message)
      return
    }

    const { operations, services } = result.right

    // Create project with tabs for each operation if requested
    if (createSampleRequests.value && operations.length > 0) {
      // Create a tab for each operation
      for (const operation of operations) {
        const tabName = `${projectName.value} - ${operation.name}`

        // Create a new tab with the operation
        tabService.createNewTab({
          type: "request",
          request: makeSOAPRequest({
            name: tabName,
            endpoint: services[0]?.port?.address || "",
            wsdlUrl: wsdlUrl.value,
            soapVersion: "1.1",
            operation: operation.name,
            body: generateDefaultSoapBody(operation.name),
            preRequestScript: "",
            testScript: createTestSuite.value
              ? generateDefaultTestScript(operation)
              : "",
          }),
          isDirty: false,
          optionTabPreference: "params",
          response: null,
        })
      }

      toast.success(
        `${t("soap.created_tabs_for_operations")}: ${operations.length}`
      )
    } else {
      // Create a single tab for the project
      tabService.createNewTab({
        type: "request",
        request: makeSOAPRequest({
          name: projectName.value,
          endpoint: services[0]?.port?.address || "",
          wsdlUrl: wsdlUrl.value,
          soapVersion: "1.1",
          operation: operations.length > 0 ? operations[0].name : "",
          body:
            operations.length > 0
              ? generateDefaultSoapBody(operations[0].name)
              : "",
        }),
        isDirty: false,
        optionTabPreference: "params",
        response: null,
      })

      toast.success(t("soap.created_project"))
    }

    // Save project info (in a real implementation, this would be persisted)
    const projectInfo = {
      name: projectName.value,
      wsdlUrl: wsdlUrl.value,
      operations: operations.map((op) => op.name),
      useRelativePaths: useRelativePaths.value,
      hasTestSuite: createTestSuite.value,
    }

    // For demonstration, we'll log the project info
    console.log("Created SOAP Project:", projectInfo)

    // Hide the modal
    hideModal()
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : t("error.something_wrong")
    toast.error(errorMessage)
  }
}

// Generate a default SOAP body for an operation
const generateDefaultSoapBody = (operationName: string): string => {
  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Header>
  </soap:Header>
  <soap:Body>
    <${operationName} xmlns="http://www.acme.org/petstore">
      <!-- Operation parameters go here -->
    </${operationName}>
  </soap:Body>
</soap:Envelope>`
}

// Generate a default test script for an operation
const generateDefaultTestScript = (operation: {
  name: string
  documentation?: string
}): string => {
  return `// Auto-generated test script for ${operation.name}
// Documentation: ${operation.documentation || "No documentation available"}

// Verify successful response
pw.test("Request should succeed", () => {
  pw.expect(pw.response.status).toBeLessThan(400);
});

// Verify response content type
pw.test("Response should be XML", () => {
  pw.expect(pw.response.headers["content-type"]).toContain("xml");
});
`
}

// For debugging component props
console.log(`NewSOAPProjectModal initialized with show =`, props.show)

// Watch for changes to the show prop
watch(
  () => props.show,
  (newVal) => {
    console.log("NewSOAPProjectModal show prop changed to:", newVal)
  }
)
</script>

<script lang="ts">
export default {
  name: "NewSOAPProjectModal",
}
</script>
