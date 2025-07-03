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
                    class="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-green-600 bg-green-500 rounded text-white"
                    @click="emit('send')"
                    title="Send request"
                    >
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M5 12h14M12 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    </button>
                </div>
              </div>
              
              <!-- CORS Helper - only shown after CORS errors are detected -->
              <div v-if="proxyOptionsVisible" 
                   class="mt-2 p-2 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded text-xs">
                <div class="flex items-center justify-between">
                  <div class="flex items-center">
                    <svg class="w-4 h-4 mr-1 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <span>Browser CORS restrictions may prevent direct SOAP access</span>
                  </div>
                  <button 
                    class="text-xs text-yellow-600 dark:text-yellow-300 hover:underline"
                    @click="proxyOptionsVisible = false"
                  >
                    Dismiss
                  </button>
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
              <div class="flex justify-between items-center p-2 border-b border-dividerLight">
                <div class="flex items-center">
                  <button 
                    class="p-1 text-accent hover:text-accentDark rounded mr-2"
                    @click="formatXML"
                    title="Format XML"
                  >
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke-linecap="round" stroke-linejoin="round"/>
                      <polyline points="14,2 14,8 20,8" stroke-linecap="round" stroke-linejoin="round"/>
                      <line x1="16" y1="13" x2="8" y2="13" stroke-linecap="round" stroke-linejoin="round"/>
                      <line x1="16" y1="17" x2="8" y2="17" stroke-linecap="round" stroke-linejoin="round"/>
                      <polyline points="10,9 9,9 8,9" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </button>

                  <button 
                    class="p-1 text-accent hover:text-accentDark rounded"
                    @click="copyBodyToClipboard"
                    title="Copy to clipboard"
                  >
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                    </svg>
                  </button>
                </div>
                <button 
                  class="p-1 text-accent hover:text-accentDark rounded focus:outline-none"
                  @click="$emit('edit')"
                  title="Edit in modal"
                >
                  <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M10 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2v-8" />
                    <path d="M17 13l-5 5H8v-4l9-9m1.5-2.5c.8 0 1.5.7 1.5 1.5s-.7 1.5-1.5 1.5-1.5-.7-1.5-1.5.7-1.5 1.5-1.5z" />
                  </svg>
                </button>
              </div>
              <div class="max-h-96 overflow-auto">
                <!-- Custom XML Editor -->
                <SmartXMLEditor
                  v-model="localBody"
                  placeholder="Enter SOAP request body"
                  @update:model-value="updateBodyAndEmit"
                />
              </div>
            </div>
          </div>
          
        </div>
        
        <!-- Response Area -->
        <div v-if="response || loading">
          <div class="flex items-center justify-between mb-2 cursor-pointer" @click="responseCollapsed = !responseCollapsed">
            <div class="flex items-center">
              <svg class="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path :d="responseCollapsed ? 'M9 5l7 7-7 7' : 'M19 9l-7 7-7-7'" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              <h4 class="font-medium">Response</h4>
            </div>
            <div>
              <!-- Loading spinner for response -->
              <div v-if="loading" class="animate-spin">
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle class="opacity-25" cx="12" cy="12" r="10" />
                  <path class="opacity-75" d="M12 6v6l4 2" />
                </svg>
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
            <!-- CORS Detection UI Banner -->
            <div v-if="response && response.meta?.corsDetected" 
                 class="bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-800 rounded p-3 mb-3 text-yellow-800 dark:text-yellow-400">
              <div class="flex items-center">
                <svg class="w-5 h-5 mr-2 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <div>
                  <h4 class="font-medium">CORS Restrictions Detected</h4>
                  <p class="text-sm mt-1">{{ response.meta?.corsMessage || 'This service has CORS restrictions. Use a CORS proxy to bypass them.' }}</p>
                </div>
              </div>
              <div class="flex items-center mt-2">
                <input 
                  type="checkbox" 
                  id="corsProxyToggle" 
                  v-model="useProxyMode"
                  class="mr-2"
                  @change="toggleProxy"
                />
                <label for="corsProxyToggle" class="text-sm">Use CORS proxy (helps bypass browser restrictions)</label>
              </div>
            </div>
            
            <!-- Error responses -->
            <div v-if="response?.type === 'fail' || response?.type === 'network_fail'" class="bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded p-3 mb-3 text-red-800 dark:text-red-400">
              <div class="flex items-center mb-2">
                <svg class="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <h4 class="font-medium">Request Error</h4>
              </div>
              <p class="text-sm mb-2">{{ getErrorMessage(response.error) }}</p>
              <div v-if="response?.error?.message && response.error.message.includes('CORS')" class="mt-2 text-xs">
                <p class="font-medium">This appears to be a CORS error. You can:</p>
                <ul class="list-disc pl-5 mt-1">
                  <li>Enable the CORS proxy option below</li>
                  <li>Use a desktop SOAP client without CORS restrictions</li>
                  <li>Access the service through a backend proxy</li>
                </ul>
              </div>
            </div>
            
            <!-- Script errors -->
            <div v-else-if="response?.type === 'script_fail' || response?.type === 'extension_error'" class="bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-800 rounded p-3 mb-3 text-yellow-800 dark:text-yellow-400">
              <div class="flex items-center mb-2">
                <svg class="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M13 10V3L4 14h7v7l9-11h-7z" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <h4 class="font-medium">Script Error</h4>
              </div>
              <p class="text-sm mt-1">{{ getErrorMessage(response.error) }}</p>
            </div>
            
            <!-- Response headers -->
            <div class="mb-3">
              <div class="flex justify-between items-center mb-1 cursor-pointer" @click="responseHeadersCollapsed = !responseHeadersCollapsed">
                <div class="flex items-center">
                  <svg class="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path :d="responseHeadersCollapsed ? 'M9 5l7 7-7 7' : 'M19 9l-7 7-7-7'" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                  <label class="text-sm text-secondaryLight">Headers</label>
                </div>
                <span class="text-xs text-secondaryLight">{{ response?.headers?.length || 0 }} headers</span>
              </div>
              <div v-if="!responseHeadersCollapsed && response?.headers" class="bg-primaryLight border border-dividerLight rounded p-2">
                <div v-for="header in response.headers" :key="header.key" class="text-sm py-1">
                  <span class="font-medium text-accent">{{ header.key }}:</span> {{ header.value }}
                </div>
              </div>
            </div>
            
            <!-- Response body -->
            <div>
              <div class="flex justify-between items-center mb-1">
                <label class="text-sm text-secondaryLight">Response Body</label>
                <div class="flex items-center">
                  <button 
                    class="p-1 text-accent hover:text-accentDark rounded mr-2"
                    @click="formatResponseXML"
                    title="Format XML"
                  >
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </button>
                  <button 
                    class="p-1 text-accent hover:text-accentDark rounded"
                    @click="copyResponseToClipboard"
                    title="Copy to clipboard"
                  >
                    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                    </svg>
                  </button>
                </div>
              </div>
              <div class="bg-primaryLight border border-dividerLight rounded">
                <!-- Show error message if present -->
                <div v-if="response?.error" class="p-2 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200">
                  <div class="font-bold mb-1">Error:</div>
                  <div class="whitespace-pre-wrap">{{ getErrorMessage(response.error) }}</div>
                </div>
                
                <!-- Show body if present - with enhanced view for full content -->
                <div v-if="response?.body" 
                     ref="responseContainer"
                     class="p-2 relative overflow-auto transition-all duration-300" 
                     :class="{'max-h-96': !showFullResponse, 'h-auto': showFullResponse}"
                     :style="showFullResponse ? 'max-height: none;' : ''"
                     @keydown.alt.shift.f.prevent="formatResponseXML"
                     @keydown.ctrl.alt.c.prevent="copyResponseToClipboard"
                     @keydown.alt.shift.e.prevent="toggleFullResponse"
                     tabindex="0"
                >
                  <!-- Gradient overlay to indicate truncated content -->
                  <div v-if="!showFullResponse && isResponseOverflowing" 
                       class="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-primaryLight to-transparent pointer-events-none">
                  </div>
                  
                  <pre 
                    class="text-sm font-mono whitespace-pre-wrap"
                    :class="{'soap-highlighted': typeof response.body === 'string' && response.body.includes('<')}"
                  >{{ typeof response.body === 'string' ? response.body : 'Binary response data' }}</pre>
                  
                  <!-- Quick expand button shown directly in the content area when truncated -->
                  <button v-if="!showFullResponse && isResponseOverflowing"
                          class="absolute bottom-2 right-2 py-1 px-3 bg-accent text-white rounded shadow-md opacity-90 hover:opacity-100 text-xs font-medium"
                          @click="toggleFullResponse">
                    Show Full Response
                  </button>
                </div>
                
                <!-- Controls for response body -->
                <div v-if="response?.body && typeof response.body === 'string'" 
                     class="p-2 bg-primaryLight border-t border-dividerLight flex flex-wrap items-center justify-between">
                  <!-- Left side: Response size info -->
                  <div class="text-xs text-secondaryLight flex items-center">
                    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <span>{{ formatSize(response.body.length) }}</span>
                    <span v-if="isResponseOverflowing && !showFullResponse" 
                          class="ml-2 text-yellow-500 font-medium">
                      (Truncated)
                    </span>
                  </div>
                  
                  <!-- Right side: Action buttons -->
                  <div class="flex items-center space-x-2">
                    <button 
                      class="flex items-center py-1 px-2 text-sm border border-dividerLight hover:border-accent rounded-md"
                      @click="formatResponseXML"
                      title="Format XML (Alt+Shift+F)"
                    >
                      <svg class="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                      Format
                    </button>
                    <button 
                      class="flex items-center py-1 px-2 text-sm border border-dividerLight hover:border-accent rounded-md"
                      @click="copyResponseToClipboard"
                      title="Copy to clipboard (Ctrl+Alt+C)"
                    >
                      <svg class="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                      </svg>
                      Copy
                    </button>
                    <button 
                      class="flex items-center py-1 px-2 text-sm font-medium border border-accent text-accent rounded-md hover:bg-accent hover:bg-opacity-10"
                      @click="toggleFullResponse"
                      title="Toggle full view (Alt+Shift+E)"
                    >
                      <svg class="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path :d="showFullResponse 
                          ? 'M19 9l-7 7-7-7' 
                          : 'M9 5l7 7-7 7'" 
                          stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                      {{ showFullResponse ? 'Collapse' : 'Expand' }}
                    </button>
                  </div>
                </div>
                
                <!-- Show a message if no body and no error -->
                <div v-if="!response?.body && !response?.error" class="p-4 text-center text-secondaryLight">
                  <p>No response body</p>
                </div>
              </div>
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
  headers?: Array<{ key: string, value: string, active?: boolean }>;
  error?: {
    message?: string;
  };
  meta?: {
    corsDetected?: boolean;
    corsMessage?: string;
    [key: string]: any;
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
const responseHeadersCollapsed = ref(true);
const isEndpointFocused = ref(false);
const showFullResponse = ref(false); // Controls whether the response body is shown in full or truncated
const isResponseOverflowing = ref(false); // Tracks if the response content is larger than the container
const responseContainer = ref<HTMLElement | null>(null);

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

// Method to check if response content overflows container
const checkResponseOverflow = () => {
  if (responseContainer.value && typeof props.response?.body === 'string') {
    const container = responseContainer.value;
    // Check if the content height exceeds the container's max height
    isResponseOverflowing.value = container.scrollHeight > container.clientHeight;
  } else {
    isResponseOverflowing.value = false;
  }
};

// Format byte size to human-readable format
const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Toggle full response view and announce to screen readers
const toggleFullResponse = () => {
  showFullResponse.value = !showFullResponse.value;
  // Announce action to screen readers
  const message = showFullResponse.value ? 'Full response shown' : 'Response collapsed';
  toast.info(message, { duration: 1000 });
};

// Watch for CORS issues in responses and update UI to show proxy options
watch(() => props.response, (newResponse) => {
  // Reset full response view when getting a new response
  showFullResponse.value = false;
  
  // Check for response overflow after the DOM has updated
  setTimeout(checkResponseOverflow, 100);
  
  try {
    if (newResponse?.meta?.corsDetected || 
        (newResponse?.type === 'network_fail' && newResponse?.error?.message?.includes('CORS')) ||
        (typeof newResponse?.body === 'string' && 
         (newResponse.body.includes('Access-Control-Allow-Origin') || 
          newResponse.body.includes('cross-origin')))) {
      
      // Show the proxy options UI when a CORS issue is detected
      proxyOptionsVisible.value = true;
      console.log('CORS detected in response. Showing proxy options UI.');
      
      // Don't automatically enable proxy mode - let the user decide
      toast.info('CORS restrictions detected. You can use the proxy option if needed.');
      
      // Check if we're working with a known service that always needs a proxy
      if (props.request?.endpoint?.includes('dneonline.com')) {
        toast.info('Calculator service typically requires a CORS proxy for browser access.');
      }
    }
    
    // Also check for the specific "Cannot read properties of undefined" error
    if (newResponse?.type === 'network_fail' && 
        newResponse?.error?.message?.includes('Cannot read properties of undefined')) {
      console.error('Detected "Cannot read properties" error, most likely due to proxy response handling issue');
      toast.error('Error processing response. Try toggling the CORS proxy option.');
      proxyOptionsVisible.value = true;
    }
  } catch (watchError) {
    console.error('Error in response watcher:', watchError);
  }
}, { deep: true });

// Helper functions
const updateBodyAndEmit = (newBody: string): void => {
  localBody.value = newBody;
  emit('update:body', newBody);
};

const formatXML = (): void => {
  emit('format-xml');
};

const formatResponseXML = (): void => {
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
    
    navigator.clipboard.writeText(typeof props.response.body === 'string' 
      ? props.response.body 
      : 'Binary response data');
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
  
  const errorMsg = error.message || 'Unknown error occurred';
  
  // Format common error messages to be more user-friendly
  if (errorMsg.includes('CORS') || errorMsg.includes('cross-origin')) {
    return 'Cross-Origin (CORS) error: The server doesn\'t allow direct browser requests. Try using the CORS proxy option.';
  } 
  else if (errorMsg.includes('NetworkError') || errorMsg.includes('Failed to fetch')) {
    return 'Network error: Could not connect to the SOAP service. Check your internet connection or server availability.';
  }
  else if (errorMsg.includes('SOAP-ENV:Client') || errorMsg.includes('soap:Client')) {
    return 'SOAP Client Error: The request format was incorrect. Check your SOAP envelope and parameters.';
  }
  else if (errorMsg.includes('SOAP-ENV:Server') || errorMsg.includes('soap:Server')) {
    return 'SOAP Server Error: The SOAP service encountered an error while processing your request.';
  }
  else if (errorMsg.includes('Cannot read properties of undefined') || errorMsg.includes('of null')) {
    return 'Processing Error: There was an error handling the SOAP response. Try toggling the CORS proxy option or check the console for details.';
  }
  else if (errorMsg.includes('timeout') || errorMsg.includes('Timeout')) {
    return 'Request timed out. The SOAP service did not respond within the expected time.';
  }
  
  // Log the original error message for debugging purposes
  console.log("Original error message:", errorMsg);
  
  return errorMsg;
};

// CORS proxy helper functionality
const useProxyMode = ref(false);
const proxyOptionsVisible = ref(false);

// Check if this endpoint is using a proxy
onMounted(() => {
  if (props.request?.endpoint) {
    // Check if endpoint is already using a proxy
    useProxyMode.value = props.request.endpoint.includes('corsproxy.io') || 
                         props.request.endpoint.includes('cors-anywhere') ||
                         props.request.endpoint.includes('allorigins.win');
    
    // Don't automatically show proxy options - wait for user to encounter CORS errors first
    proxyOptionsVisible.value = false;
    console.log("ImprovedSoapUI mounted with endpoint:", props.request.endpoint);
  } else {
    console.log("ImprovedSoapUI mounted but no endpoint defined yet");
  }
});

const toggleProxy = () => {
  if (!props.request || !props.request.endpoint) {
    toast.error('No endpoint configured. Please enter an endpoint URL first.');
    useProxyMode.value = false;
    return;
  }
  
  try {
    // Directly update the endpoint with or without proxy instead of opening edit dialog
    if (useProxyMode.value) {
      // Enable proxy mode - directly modify the endpoint
      const currentEndpoint = props.request.endpoint;
      
      // Skip if endpoint already uses a proxy
      if (currentEndpoint.includes('corsproxy.io') || 
          currentEndpoint.includes('cors-anywhere') ||
          currentEndpoint.includes('allorigins.win')) {
        toast.info('Endpoint already using a CORS proxy');
        return;
      }
      
      // Create new endpoint with proxy - try multiple options if one fails
      let proxyEndpoint;
      
      try {
        // First choice is corsproxy.io
        proxyEndpoint = "https://corsproxy.io/?" + encodeURIComponent(currentEndpoint);
      } catch (encodeError) {
        // If encoding fails, try allorigins.win
        console.warn("Error encoding URL for corsproxy.io:", encodeError);
        try {
          proxyEndpoint = "https://api.allorigins.win/raw?url=" + encodeURIComponent(currentEndpoint);
        } catch (encodeError2) {
          // If that also fails, use a simple proxy without encoding
          console.warn("Error encoding URL for allorigins.win:", encodeError2);
          proxyEndpoint = "https://cors-anywhere.herokuapp.com/" + currentEndpoint;
        }
      }
      
      // Update the endpoint
      emit('update:endpoint', proxyEndpoint);
      toast.success('CORS proxy enabled for this endpoint');
      
      console.log(`Proxy mode enabled. Endpoint changed from ${currentEndpoint} to ${proxyEndpoint}`);
    } else {
      // Disable proxy mode - revert to original URL if using a proxy
      const currentEndpoint = props.request.endpoint;
      let originalUrl = currentEndpoint; // Default to current if no proxy detected
      let proxyDetected = false;
      
      try {
        if (currentEndpoint.includes('corsproxy.io')) {
          // Extract original URL from corsproxy.io endpoint
          originalUrl = decodeURIComponent(currentEndpoint.replace('https://corsproxy.io/?', ''));
          proxyDetected = true;
        } else if (currentEndpoint.includes('cors-anywhere')) {
          // Handle cors-anywhere proxy
          originalUrl = currentEndpoint.replace('https://cors-anywhere.herokuapp.com/', '');
          proxyDetected = true;
        } else if (currentEndpoint.includes('allorigins.win')) {
          // Handle allorigins proxy
          originalUrl = decodeURIComponent(currentEndpoint.replace('https://api.allorigins.win/raw?url=', ''));
          proxyDetected = true;
        }
        
        // Extra validation for the extracted URL - make sure it's still a valid URL
        if (proxyDetected) {
          // Basic validation - should at least have http/https
          if (!originalUrl.startsWith('http://') && !originalUrl.startsWith('https://')) {
            throw new Error("Extracted URL is not valid: " + originalUrl);
          }
          
          // Update the endpoint to remove the proxy
          emit('update:endpoint', originalUrl);
          toast.success('CORS proxy disabled, using direct endpoint');
          console.log(`Proxy mode disabled. Endpoint changed from ${currentEndpoint} to ${originalUrl}`);
        } else {
          toast.info('Endpoint is not using a known CORS proxy');
          useProxyMode.value = false;
        }
      } catch (extractError) {
        console.error("Error extracting original URL from proxy:", extractError);
        toast.error('Error removing proxy - keeping current endpoint');
        // Keep the proxy enabled since we couldn't extract the original URL
        useProxyMode.value = true;
      }
    }
  } catch (error) {
    console.error("Error toggling proxy mode:", error);
    toast.error(`Error toggling proxy mode: ${error instanceof Error ? error.message : String(error)}`);
    // Reset to a safe state based on the current endpoint
    if (props.request?.endpoint) {
      useProxyMode.value = props.request.endpoint.includes('corsproxy.io') || 
                          props.request.endpoint.includes('allorigins.win') ||
                          props.request.endpoint.includes('cors-anywhere');
    } else {
      useProxyMode.value = false;
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

// Use ResizeObserver to monitor content changes in the response container
onMounted(() => {
  // Initialize keyboard shortcuts for response actions
  window.addEventListener('keydown', (e) => {
    // Only handle if response is visible
    if (!props.response?.body) return;
    
    // Alt+Shift+F to format XML
    if (e.altKey && e.shiftKey && e.key === 'f') {
      e.preventDefault();
      formatResponseXML();
    }
    // Ctrl+Alt+C to copy
    else if (e.ctrlKey && e.altKey && e.key === 'c') {
      e.preventDefault();
      copyResponseToClipboard();
    }
    // Alt+Shift+E to expand/collapse
    else if (e.altKey && e.shiftKey && e.key === 'e') {
      e.preventDefault();
      toggleFullResponse();
    }
  });
  
  // Create a ResizeObserver to detect changes in response content
  const resizeObserver = new ResizeObserver(() => {
    checkResponseOverflow();
  });
  
  // Watch for DOM updates to attach the observer
  watch(responseContainer, (el) => {
    if (el) {
      resizeObserver.observe(el);
    }
  });
  
  // Clean up the observer on component unmount
  return () => {
    if (responseContainer.value) {
      resizeObserver.unobserve(responseContainer.value);
    }
    resizeObserver.disconnect();
    window.removeEventListener('keydown', () => {});
  };
});

// Also watch changes to the response body to check for overflow
watch(() => props.response?.body, () => {
  // Check overflow after the DOM has updated
  setTimeout(checkResponseOverflow, 100);
});
</script>

<style scoped>
/* Add a smooth transition for the response container */
.transition-all {
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 300ms;
}

/* Highlight SOAP tags in the response */
.soap-highlighted {
  color: var(--primary-color);
}

/* Style for the overflow gradient */
.bg-gradient-to-t {
  background-image: linear-gradient(to top, var(--primary-light-color) 0%, transparent 100%);
}
</style>
