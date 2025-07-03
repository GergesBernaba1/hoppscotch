<template>
  <div class="flex flex-col flex-1">
    <!-- Operation Card -->
    <div class="border border-dividerLight rounded-lg mb-4">
      <div class="flex items-center justify-between p-4 bg-primaryLight cursor-pointer" @click="expanded = !expanded">
        <div class="flex items-center">
          <svg class="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path :d="expanded ? 'M19 9l-7 7-7-7' : 'M9 5l7 7-7 7'" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <h3 class="font-semibold">{{ request.name || 'Unnamed Operation' }}</h3>
        </div>
        <div class="flex items-center space-x-2">
          <!-- <span class="text-xs px-2 py-1 bg-accent bg-opacity-20 text-accent rounded-full">
            {{ request.endpoint ? 'Ready' : 'Not configured' }}
          </span> -->
          <button 
            class="p-1 text-red-500 hover:text-red-700 rounded focus:outline-none"
            @click.stop="$emit('remove')"
            title="Remove operation"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
      
      <div v-if="expanded" class="p-4 border-t border-dividerLight">
        <!-- Request Details -->
        <div class="mb-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label class="block mb-1 text-sm text-secondaryLight">Endpoint URL</label>
              <div class="flex items-center mb-2">
                <div class="flex flex-grow relative">
                  <input 
                    type="text" 
                    class="w-full p-2 bg-primaryLight border border-dividerLight rounded"
                    :class="{ 'border-accent': isEndpointFocused }"
                    :placeholder="'Enter endpoint URL'"
                    :value="request.endpoint || ''"
                    @input="updateEndpoint($event)"
                    @keydown.enter="emit('send')"
                    @focus="isEndpointFocused = true"
                    @blur="isEndpointFocused = false"
                  />
                  <button 
                    v-if="request.endpoint" 
                    class="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-primaryDark rounded text-secondaryLight"
                    @click="emit('send')"
                    title="Send request"
                  >
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M5 12h14M12 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </button>
                </div>
              </div>
              
              <!-- CORS Helper for dneonline calculator service -->
              <div v-if="request.endpoint && request.endpoint.includes('dneonline.com')" 
                   class="mt-2 p-2 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded text-xs">
                <div class="flex items-center">
                  <svg class="w-4 h-4 mr-1 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  <span>This Calculator service has CORS restrictions. Use the proxy option below to bypass this.</span>
                </div>
                <div class="flex items-center mt-2">
                  <input 
                    type="checkbox" 
                    id="useProxy" 
                    v-model="useProxyMode"
                    class="mr-2"
                    @change="toggleProxy"
                  />
                  <label for="useProxy" class="text-xs">Use CORS proxy (helps bypass browser restrictions)</label>
                </div>
              </div>
            </div>
            <div>
              <label class="block mb-1 text-sm text-secondaryLight">WSDL URL</label>
              <div class="p-2 bg-primaryLight border border-dividerLight rounded break-all">
                {{ request.wsdlUrl || 'No WSDL URL set' }}
              </div>
            </div>
          </div>
          
          <!-- SOAP Body -->
          <div>
            <div class="flex justify-between items-center mb-1 cursor-pointer" @click="bodyCollapsed = !bodyCollapsed">
              <div class="flex items-center">
                <svg class="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path :d="bodyCollapsed ? 'M9 5l7 7-7 7' : 'M19 9l-7 7-7-7'" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <label class="text-sm text-secondaryLight">SOAP Body</label>
              </div>
              <span class="text-xs text-accent">Directly editable</span>
            </div>
            <div v-if="!bodyCollapsed" class="bg-primaryLight border border-dividerLight rounded">
              <div class="flex justify-between items-center p-2 border-b border-dividerLight bg-primaryLight">
                <span class="text-xs text-secondaryLight">XML Editor</span>
                <div class="flex items-center space-x-2">
                  <button @click.stop="copyBodyToClipboard" class="px-2 py-1 text-xs hover:bg-primaryDark rounded flex items-center">
                    <svg class="w-3 h-3 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    Copy
                  </button>
                  <button @click.stop="formatXML" class="px-2 py-1 text-xs text-accent hover:bg-primaryDark rounded">
                    Format XML
                  </button>
                </div>
              </div>
              <SmartXMLEditor
                v-model="localBody"
                placeholder="Enter SOAP Body"
                class="rounded"
                style="min-height: 200px; max-height: 400px; overflow: auto"
                @update:modelValue="updateBodyAndEmit"
              />
            </div>
          </div>
        </div>

        <!-- Request Controls -->
        <div class="flex justify-end space-x-2 mt-4">
          <button 
            class="px-3 py-1.5 border border-dividerLight rounded hover:bg-primaryLight"
            @click="$emit('edit')"
            title="Edit other request properties"
          >
            Edit Headers & Properties
          </button>
          <button 
            class="px-3 py-1.5 bg-accent text-white rounded hover:bg-accentDark flex items-center space-x-2"
            @click="$emit('send')"
            :disabled="loading"
          >
            <span v-if="loading" class="w-4 h-4">
              <svg class="animate-spin" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
            </span>
            <span>{{ loading ? 'Sending...' : 'Send' }}</span>
          </button>
        </div>
        
        <!-- Response Area -->
        <div class="mt-4 border-t border-dividerLight pt-4">
          <div class="flex items-center justify-between mb-2 cursor-pointer" @click="responseCollapsed = !responseCollapsed">
            <div class="flex items-center">
              <svg class="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path :d="responseCollapsed ? 'M9 5l7 7-7 7' : 'M19 9l-7 7-7-7'" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <h4 class="font-medium">Response</h4>
            </div>
            <div>
              <!-- Loading spinner for response -->
              <div v-if="loading" class="flex items-center text-secondaryLight">
                <svg class="animate-spin w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                <span>Waiting...</span>
              </div>
              
              <!-- Response status -->
              <span v-else-if="response" :class="getStatusClass(response.statusCode)">
                {{ response.statusCode }} {{ getStatusText(response) }}
              </span>
              
              <!-- No response yet -->
              <span v-else class="text-secondaryLight">No response yet</span>
            </div>
          </div>
          
          <!-- Response body -->
          <div v-if="!responseCollapsed && !loading">
            <!-- Error responses -->
            <div v-if="response?.type === 'fail' || response?.type === 'network_fail'" class="bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded p-3 mb-3 text-red-800 dark:text-red-400">
              <p class="font-medium">Request Failed</p>
              <p class="text-sm mt-1">{{ getErrorMessage(response.error) }}</p>
            </div>
            
            <!-- Script error -->
            <div v-else-if="response?.type === 'script_fail' || response?.type === 'extension_error'" class="bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-800 rounded p-3 mb-3 text-yellow-800 dark:text-yellow-400">
              <p class="font-medium">Script Failed</p>
              <p class="text-sm mt-1">{{ getErrorMessage(response.error) }}</p>
            </div>
            
            <!-- Success response body -->
            <div v-else-if="response?.type === 'success'" class="bg-primaryLight border border-dividerLight rounded">
              <div class="flex justify-between items-center p-2 border-b border-dividerLight">
                <span class="text-sm font-medium">Response Body</span>
                <div class="flex items-center space-x-2">
                  <button @click.stop="copyResponseToClipboard" class="px-2 py-1 text-xs hover:bg-primaryDark rounded flex items-center">
                    <svg class="w-3 h-3 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    Copy
                  </button>
                  <button @click.stop="formatResponseXML" class="px-2 py-1 text-xs text-accent hover:bg-primaryDark rounded">
                    Format XML
                  </button>
                </div>
              </div>
              <div class="relative">
                <pre class="p-2 text-xs overflow-auto" style="max-height: 500px; min-height: 200px;">{{ response.body }}</pre>
                <!-- Fade gradient at bottom to indicate scrollable content -->
                <div class="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-primaryLight to-transparent pointer-events-none"></div>
              </div>
            </div>
            
            <!-- No response yet message -->
            <div v-else-if="!response" class="text-center p-4 text-secondaryLight">
              <p>Click "Send" to get a response</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, defineProps, defineEmits } from "vue";
import SmartXMLEditor from "../../components/smart/XMLEditor.vue";
import { useToast } from "../../composables/toast";

// Types
interface SOAPRequest {
  name?: string;
  endpoint?: string;
  wsdlUrl?: string;
  body?: string;
}

interface SOAPResponse {
  type: 'loading' | 'success' | 'fail' | 'network_fail' | 'script_fail' | 'extension_error';
  body?: string;
  statusCode?: number;
  statusText?: string;
  error?: {
    message?: string;
  };
}

const props = defineProps<{
  request: SOAPRequest;
  response?: SOAPResponse | null;
  loading?: boolean;
  initialExpanded?: boolean;
  initialBodyCollapsed?: boolean;
  initialResponseCollapsed?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:body', body: string): void;
  (e: 'update:endpoint', endpoint: string): void;
  (e: 'edit'): void;
  (e: 'send'): void;
  (e: 'format-xml'): void;
  (e: 'format-response'): void;
  (e: 'update:expanded', expanded: boolean): void;
  (e: 'remove'): void;
}>();

// UI state
const expanded = ref(props.initialExpanded !== undefined ? props.initialExpanded : true);
const bodyCollapsed = ref(props.initialBodyCollapsed !== undefined ? props.initialBodyCollapsed : false);
const responseCollapsed = ref(props.initialResponseCollapsed !== undefined ? props.initialResponseCollapsed : false);
const isEndpointFocused = ref(false);

// When expanded state changes, emit event for parent component
watch(expanded, (newValue) => {
  emit('update:expanded', newValue);
});

// Local data
const localBody = ref(props.request.body || '');
const toast = useToast();

// Keep local body in sync with props
watch(() => props.request.body, (newVal) => {
  if (newVal !== localBody.value) {
    localBody.value = newVal || '';
  }
});

// Helper functions
const updateBodyAndEmit = (newBody: string): void => {
  localBody.value = newBody;
  emit('update:body', newBody);
};

const formatXML = (): void => {
  try {
    if (!localBody.value) return;
    
    // Basic XML formatting: add indentation and line breaks
    const formatted = localBody.value
      .replace(/(>)(<)(\/*)/g, '$1\n$2$3')
      .replace(/<(.*?)>/g, (match: string) => match.replace(/\s+/g, ' '))
      .split('\n')
      .map((line: string, index: number, array: string[]) => {
        let indent = 0;
        for (let i = 0; i < index; i++) {
          if (array[i].match(/<[\w\s="/.':?-]+>$/)) indent++;
          if (array[i].match(/<\/([\w\s="/.':?-]+)>$/)) indent--;
        }
        if (line.match(/<\/([\w\s="/.':?-]+)>$/)) indent--;
        return '  '.repeat(Math.max(0, indent)) + line;
      })
      .join('\n');
    
    localBody.value = formatted;
    emit('update:body', formatted);
    toast.success(`XML formatted successfully`);
  } catch (error: any) {
    toast.error(`Failed to format XML: ${error.message || error}`);
  }
};

const formatResponseXML = () => {
  emit('format-response');
};

const copyBodyToClipboard = () => {
  try {
    navigator.clipboard.writeText(localBody.value);
    toast.success(`Body copied to clipboard`);
  } catch (error) {
    toast.error(`Failed to copy: ${error}`);
  }
};

const copyResponseToClipboard = () => {
  try {
    if (!props.response?.body) return;
    
    navigator.clipboard.writeText(props.response.body);
    toast.success(`Response copied to clipboard`);
  } catch (error) {
    toast.error(`Failed to copy response: ${error}`);
  }
};

const getStatusClass = (statusCode?: number): string => {
  if (!statusCode) return 'text-secondaryLight';
  
  if (statusCode >= 200 && statusCode < 300) {
    return 'text-green-500';
  } else if (statusCode >= 400 && statusCode < 500) {
    return 'text-yellow-500';
  } else if (statusCode >= 500) {
    return 'text-red-500';
  }
  
  return 'text-secondaryLight';
};

const getStatusText = (response: SOAPResponse): string => {
  if (!response) return '';
  
  if (response.type === 'success') {
    return response.statusText || '';
  } else if (response.type === 'fail' || response.type === 'network_fail') {
    return 'Request Failed';
  } else if (response.type === 'script_fail' || response.type === 'extension_error') {
    return 'Script Error';
  }
  
  return '';
};

const getErrorMessage = (error?: { message?: string }): string => {
  if (!error) return 'Something went wrong';
  
  return error.message || 'Unknown error occurred';
};

// CORS proxy helper functionality
const useProxyMode = ref(false);

// Check if this endpoint is using a proxy
onMounted(() => {
  if (props.request?.endpoint?.includes('dneonline.com')) {
    // Check if endpoint is already using a proxy
    useProxyMode.value = props.request.endpoint.includes('corsproxy.io') || 
                         props.request.endpoint.includes('cors-anywhere') ||
                         props.request.endpoint.includes('allorigins.win');
  }
});

const toggleProxy = () => {
  if (!props.request || !props.request.endpoint) return;
  
  // We'll use the emit to signal a request to toggle proxy mode
  if (useProxyMode.value) {
    // Enable proxy mode
    toast.info('CORS proxy mode enabled. This will help bypass browser restrictions.');
    
    // Open the edit dialog with a message about the change
    emit('edit');
    
    // Suggestion for the user in the console
    console.log('Proxy mode enabled. Your request will be routed through a CORS proxy.');
    console.log('Suggested proxy endpoint: https://corsproxy.io/?' + encodeURIComponent(props.request.endpoint));
  } else {
    // Disable proxy mode
    toast.info('CORS proxy mode disabled. Your request will be sent directly.');
    
    // Open the edit dialog with a message about the change
    emit('edit');
    
    // Suggestion for the user in the console
    console.log('Proxy mode disabled. You may encounter CORS errors with this service.');
    
    // If the current endpoint uses a proxy, suggest how to change it back
    if (props.request.endpoint.includes('corsproxy.io')) {
      const originalUrl = props.request.endpoint.replace('https://corsproxy.io/?', '');
      console.log('To use direct access, change your endpoint to: ' + decodeURIComponent(originalUrl));
    }
  }
};

// Handle endpoint update
const updateEndpoint = (event: Event) => {
  const target = event.target as HTMLInputElement;
  emit('update:endpoint', target.value);
  
  // Update proxy mode status if it's the calculator service
  if (target.value.includes('dneonline.com')) {
    useProxyMode.value = target.value.includes('corsproxy.io') || 
                         target.value.includes('cors-anywhere') ||
                         target.value.includes('allorigins.win');
  }
};
</script>
