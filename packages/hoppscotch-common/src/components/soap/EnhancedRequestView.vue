&lt;template&gt;
  &lt;div class="border border-dividerLight rounded-lg overflow-hidden"&gt;
    &lt;!-- Header section with title and controls --&gt;
    &lt;div
      class="flex items-center justify-between p-4 bg-primaryLight cursor-pointer"
      @click="toggleExpanded"
    &gt;
      &lt;div class="flex items-center"&gt;
        &lt;svg
          class="w-5 h-5 mr-2"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        &gt;
          &lt;path
            :d="expanded ? 'M19 9l-7 7-7-7' : 'M9 5l7 7-7 7'"
            stroke-linecap="round"
            stroke-linejoin="round"
          /&gt;
        &lt;/svg&gt;
        &lt;h3 class="font-semibold"&gt;{{ request.name }}&lt;/h3&gt;
      &lt;/div&gt;
      &lt;div class="flex items-center space-x-2"&gt;
        &lt;span
          class="text-xs px-2 py-1 bg-accent bg-opacity-20 text-accent rounded-full"
        &gt;
          {{ request.endpoint ? "Ready" : "Not configured" }}
        &lt;/span&gt;
        &lt;button
          class="p-1 text-secondaryLight hover:text-accent rounded"
          @click.stop="$emit('close')"
          title="Close tab"
        &gt;
          &lt;svg
            class="w-5 h-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          &gt;
            &lt;path
              d="M6 18L18 6M6 6l12 12"
              stroke-linecap="round"
              stroke-linejoin="round"
            /&gt;
          &lt;/svg&gt;
        &lt;/button&gt;
      &lt;/div&gt;
    &lt;/div&gt;

    &lt;!-- Expanded Content --&gt;
    &lt;div v-if="expanded" class="p-4 border-t border-dividerLight"&gt;
      &lt;!-- Request Details --&gt;
      &lt;div class="mb-4"&gt;
        &lt;div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4"&gt;
          &lt;div&gt;
            &lt;label class="block mb-1 text-sm text-secondaryLight"&gt;Endpoint URL&lt;/label&gt;
            &lt;div class="p-2 bg-primaryLight border border-dividerLight rounded break-all"&gt;
              {{ request.endpoint || "No endpoint set" }}
            &lt;/div&gt;
          &lt;/div&gt;
          &lt;div&gt;
            &lt;label class="block mb-1 text-sm text-secondaryLight"&gt;WSDL URL&lt;/label&gt;
            &lt;div class="p-2 bg-primaryLight border border-dividerLight rounded break-all"&gt;
              {{ request.wsdlUrl || "No WSDL URL set" }}
            &lt;/div&gt;
          &lt;/div&gt;
        &lt;/div&gt;

        &lt;!-- SOAP Body --&gt;
        &lt;div&gt;
          &lt;div class="flex justify-between items-center mb-1 cursor-pointer" @click.stop="toggleBodySection"&gt;
            &lt;div class="flex items-center"&gt;
              &lt;svg class="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"&gt;
                &lt;path :d="bodyCollapsed ? 'M9 5l7 7-7 7' : 'M19 9l-7 7-7-7'" stroke-linecap="round" stroke-linejoin="round"/&gt;
              &lt;/svg&gt;
              &lt;label class="text-sm text-secondaryLight"&gt;SOAP Body&lt;/label&gt;
            &lt;/div&gt;
            &lt;span class="text-xs text-accent"&gt;Directly editable&lt;/span&gt;
          &lt;/div&gt;
          &lt;div v-if="!bodyCollapsed" class="bg-primaryLight border border-dividerLight rounded"&gt;
            &lt;div class="flex justify-between items-center p-2 border-b border-dividerLight bg-primaryLight"&gt;
              &lt;span class="text-xs text-secondaryLight"&gt;XML Editor&lt;/span&gt;
              &lt;button 
                @click.stop="formatXML" 
                class="px-2 py-1 text-xs text-accent hover:bg-primaryDark rounded"
              &gt;
                Format XML
              &lt;/button&gt;
            &lt;/div&gt;
            &lt;slot name="body-editor"&gt;&lt;/slot&gt;
          &lt;/div&gt;
        &lt;/div&gt;
      &lt;/div&gt;

      &lt;!-- Request Controls --&gt;
      &lt;div class="flex justify-end space-x-2 mt-4"&gt;
        &lt;button 
          class="px-3 py-1.5 border border-dividerLight rounded hover:bg-primaryLight"
          @click.stop="$emit('edit')"
          title="Edit other request properties"
        &gt;
          Edit Headers &amp; Properties
        &lt;/button&gt;
        &lt;button 
          class="px-3 py-1.5 bg-accent text-white rounded hover:bg-accentDark flex items-center space-x-2"
          @click.stop="$emit('send')"
          :disabled="loading"
        &gt;
          &lt;span v-if="loading" class="w-4 h-4"&gt;
            &lt;svg class="animate-spin w-full h-full" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"&gt;
              &lt;circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"&gt;&lt;/circle&gt;
              &lt;path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"&gt;&lt;/path&gt;
            &lt;/svg&gt;
          &lt;/span&gt;
          &lt;span&gt;{{ loading ? 'Sending...' : 'Send' }}&lt;/span&gt;
        &lt;/button&gt;
      &lt;/div&gt;
      
      &lt;!-- Response Area --&gt;
      &lt;div class="mt-4 border-t border-dividerLight pt-4"&gt;
        &lt;div class="flex items-center justify-between mb-2 cursor-pointer" @click.stop="toggleResponseSection"&gt;
          &lt;div class="flex items-center"&gt;
            &lt;svg class="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"&gt;
              &lt;path :d="responseCollapsed ? 'M9 5l7 7-7 7' : 'M19 9l-7 7-7-7'" stroke-linecap="round" stroke-linejoin="round"/&gt;
            &lt;/svg&gt;
            &lt;h4 class="font-medium"&gt;Response&lt;/h4&gt;
          &lt;/div&gt;
          &lt;div&gt;
            &lt;!-- Response status indicator --&gt;
            &lt;slot name="response-status"&gt;&lt;/slot&gt;
          &lt;/div&gt;
        &lt;/div&gt;
        
        &lt;!-- Response content --&gt;
        &lt;div v-if="!responseCollapsed"&gt;
          &lt;slot name="response-content"&gt;&lt;/slot&gt;
        &lt;/div&gt;
      &lt;/div&gt;
    &lt;/div&gt;
  &lt;/div&gt;
&lt;/template&gt;

&lt;script setup lang="ts"&gt;
import { ref } from 'vue'
import { HoppSOAPRequest } from '@hoppscotch/data'

const props = defineProps&lt;{
  request: HoppSOAPRequest
  loading?: boolean
  response?: any
}&gt;()

const emit = defineEmits&lt;{
  (e: 'edit'): void
  (e: 'send'): void
  (e: 'close'): void
  (e: 'format-xml'): void
}&gt;()

// State
const expanded = ref(true)
const bodyCollapsed = ref(false)
const responseCollapsed = ref(false)

// Methods
const toggleExpanded = () => {
  expanded.value = !expanded.value
}

const toggleBodySection = () => {
  bodyCollapsed.value = !bodyCollapsed.value
}

const toggleResponseSection = () => {
  responseCollapsed.value = !responseCollapsed.value
}

const formatXML = () => {
  emit('format-xml')
}
&lt;/script&gt;
