<template>
  <div class="flex flex-col flex-1">
    <div class="flex justify-between items-center px-4 py-2">
      <h3 class="font-semibold">{{ t("soap.attachments") }}</h3>
      <div class="flex">
        <HoppButtonSecondary
          :label="t('add')"
          class="ml-2"
          @click="addAttachment"
        />
      </div>
    </div>
    <!-- MTOM toggle -->
    <div class="flex items-center px-4 py-2 border-b">
      <HoppToggle :on="useMtom" @toggle="toggleMtomMode" />
      <span class="ml-2">{{ t("soap.use_mtom") }}</span>
      <span class="ml-2 text-secondaryLight text-tiny">{{
        t("soap.mtom_description")
      }}</span>
    </div>

    <!-- Attachments list -->
    <div
      v-if="hasAttachments"
      class="flex flex-col divide-y divide-dividerLight"
    >
      <div
        v-for="(attachment, index) in attachments"
        :key="index"
        class="flex flex-col p-4"
      >
        <div class="flex justify-between items-center">
          <div class="flex items-center">
            <HoppSmartToggle
              :on="attachment.active"
              @change="toggleAttachment(index)"
            />
            <input
              v-model="attachment.name"
              type="text"
              class="ml-2 px-2 py-1 bg-primary border rounded"
              placeholder="Name"
            />
          </div>
          <HoppButtonSecondary
            :icon="IconTrash"
            outline
            @click="removeAttachment(index)"
          />
        </div>

        <div class="flex mt-2">
          <input
            v-model="attachment.contentType"
            type="text"
            class="flex-1 px-2 py-1 bg-primary border rounded"
            placeholder="Content Type"
          />
          <input
            v-model="attachment.contentId"
            type="text"
            class="flex-1 ml-2 px-2 py-1 bg-primary border rounded"
            placeholder="Content ID"
          />
        </div>
        <div class="flex items-center mt-2">
          <input
            :id="`fileInput${index}`"
            type="file"
            class="hidden"
            @change="handleFileUpload($event, index)"
          />
          <HoppButtonSecondary
            :label="
              attachment.content ? t('soap.change_file') : t('soap.select_file')
            "
            class="flex-shrink-0"
            @click="selectFile(index)"
          />
          <span
            v-if="attachment.content"
            class="ml-2 text-secondaryLight truncate"
          >
            {{ getFileInfo(attachment, index) }}
          </span>
          <span v-else class="ml-2 text-secondaryLight">{{
            t("soap.no_file_selected")
          }}</span>
        </div>
      </div>
    </div>
    <div
      v-else
      class="flex flex-col items-center justify-center flex-1 p-4 text-secondaryLight"
    >
      <span class="text-center">{{ t("soap.no_attachments") }}</span>
      <HoppButtonSecondary
        :label="t('add')"
        class="mt-4"
        @click="addAttachment"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue"
import { useI18n } from "vue-i18n"
import { useToast } from "../../composables/toast"
import IconTrash from "../../components/icons/IconTrash.vue"
import HoppToggle from "../soap/HoppToggle.vue"
import { HoppSmartToggle } from "@hoppscotch/ui"

const { t } = useI18n()
const toast = useToast()

// Define SOAPAttachment type locally
type SOAPAttachment = {
  name: string
  contentType: string
  contentId: string
  content: File | null
  active: boolean
}

const props = defineProps({
  tabId: {
    type: String,
    required: true,
  },
})

const emit = defineEmits(["update:attachments", "update:useMtom"])

// Mock data - in a real implementation these would be provided via props
const attachments = ref<SOAPAttachment[]>([])
const useMtom = ref(false)

const hasAttachments = computed(() => attachments.value.length > 0)

function addAttachment() {
  const newAttachment: SOAPAttachment = {
    name: `attachment-${attachments.value.length + 1}`,
    contentType: "application/octet-stream",
    contentId: `att-${Date.now()}`,
    content: null,
    active: true,
  }

  attachments.value.push(newAttachment)
  emit("update:attachments", attachments.value)
}

function removeAttachment(index: number) {
  attachments.value.splice(index, 1)
  emit("update:attachments", attachments.value)
}

function toggleAttachment(index: number) {
  attachments.value[index].active = !attachments.value[index].active
  emit("update:attachments", attachments.value)
}

function toggleMtomMode() {
  useMtom.value = !useMtom.value
  emit("update:useMtom", useMtom.value)
}

function selectFile(index: number) {
  // Access the file input by ID and trigger a click
  const fileInput = document.querySelector(
    `#fileInput${index}`
  ) as HTMLInputElement
  if (fileInput) {
    fileInput.click()
  }
}

function handleFileUpload(event: Event, index: number) {
  const target = event.target as HTMLInputElement

  try {
    if (target && target.files && target.files.length > 0) {
      const file = target.files[0]

      // Update the attachment with the selected file
      attachments.value[index].content = file

      // Try to set a more specific content type based on the file
      if (file.type) {
        attachments.value[index].contentType = file.type
      }

      // If no Content-ID is set, generate one based on filename
      if (
        !attachments.value[index].contentId ||
        attachments.value[index].contentId === `att-${Date.now()}`
      ) {
        const fileName = file.name.replace(/[^a-zA-Z0-9]/g, "_")
        attachments.value[index].contentId = `${fileName}@hoppscotch`
      }

      // Update attachments
      emit("update:attachments", attachments.value)
    }
  } catch (error) {
    console.error("File upload error:", error)
    toast.error(t("error.something_went_wrong"))
  }
}

function getFileInfo(attachment: SOAPAttachment, index: number) {
  if (attachment.content) {
    return `${attachment.content.name} (${formatFileSize(attachment.content.size)})`
  }
  return attachment.name || `File ${index + 1}`
}

function formatFileSize(bytes: number) {
  if (bytes === 0) return "0 B"

  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}
</script>

<style scoped>
/* Add any component-specific styles here */
</style>
