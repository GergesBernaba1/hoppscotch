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
            <!-- URL / Endpoint Input -->
            <div class="flex flex-1 ml-2">
              <input
                v-model="endpoint"
                type="text"
                autocomplete="off"
                spellcheck="false"
                class="flex flex-1 px-4 py-2 overflow-x-hidden rounded bg-primaryLight border border-divider"
                :placeholder="t('endpoint')"
              />
            </div>
          </div>

          <!-- Send Button -->
          <div class="flex ml-2">
            <button 
              class="px-5 py-2 bg-accent hover:bg-accentDark text-white rounded-md font-semibold transition-colors"
              @click="loading ? cancelRequest() : sendRequest()"
            >
              {{ t(loading ? 'cancel' : 'send') }}
            </button>
          </div>
        </div>
      </div>
      <div class="flex flex-col flex-1">
        <!-- Tabs for request configuration -->
        <div class="flex bg-primary border-b border-dividerLight">
          <button 
            @click="activeTab = 'wsdl'" 
            class="px-4 py-2 font-medium" 
            :class="activeTab === 'wsdl' ? 'text-accent border-b-2 border-accent' : 'text-secondaryLight'"
          >
            {{ t('soap.wsdl') }}
          </button>
          <button 
            @click="activeTab = 'body'" 
            class="px-4 py-2 font-medium" 
            :class="activeTab === 'body' ? 'text-accent border-b-2 border-accent' : 'text-secondaryLight'"
          >
            {{ t('body') }}
          </button>
        </div>
        
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
              <button
                class="ml-2 px-4 py-2 bg-accent text-white rounded"
                @click="fetchWSDLDetails"
                :disabled="fetchingWSDL"
              >
                {{ t('soap.fetch_wsdl') }}
              </button>
            </div>
            <span v-if="wsdlError" class="mt-1 text-red-500">{{ wsdlError }}</span>
          </div>
          
          <!-- Operation Selection -->
          <div v-if="wsdlOperations.length > 0" class="mt-4">
            <label class="pb-1 font-semibold">{{ t('soap.operation') }}</label>
            <select
              v-model="operation"
              class="w-full p-2 bg-primary border rounded"
            >
              <option
                v-for="op in wsdlOperations"
                :key="op.name"
                :value="op.name"
              >
                {{ op.name }}
              </option>
            </select>
            
            <button 
              v-if="operation"
              @click="generateEnvelope"
              class="mt-4 w-full p-2 bg-accent text-white rounded"
            >
              {{ t('soap.generate_envelope') }}
            </button>
          </div>
        </div>
        
        <div class="flex flex-col flex-1 p-4" v-else-if="activeTab === 'body'">
          <textarea
            v-model="body"
            class="flex-1 p-4 border rounded font-mono bg-primaryLight overflow-auto"
            placeholder="SOAP XML Body"
          ></textarea>
          
          <div class="flex justify-end mt-4">
            <button 
              @click="formatBody"
              class="px-4 py-2 bg-primaryLight border rounded"
            >
              {{ t('state.pretty') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
// This is a simplified version for standalone usage
export default {
  props: {
    tabID: String
  },
  
  data() {
    return {
      activeTab: "wsdl",
      loading: false,
      fetchingWSDL: false,
      wsdlError: "",
      wsdlOperations: [],
      wsdlServiceEndpoint: "",
      endpoint: "",
      wsdlUrl: "",
      operation: "",
      body: "",
      soapVersion: "1.1",
      request: { endpoint: "" }
    }
  },
  
  computed: {
    hasWSDL() {
      return !!this.wsdlUrl
    },
    
    selectedOperation() {
      return this.wsdlOperations.find(op => op.name === this.operation)
    }
  },
  
  methods: {
    t(key) {
      // Simple translation function for standalone
      const translations = {
        "endpoint": "Endpoint URL",
        "send": "Send",
        "cancel": "Cancel",
        "body": "Body",
        "state.pretty": "Prettify",
        "soap.wsdl": "WSDL",
        "soap.wsdl_url": "WSDL URL",
        "soap.enter_wsdl_url": "Enter WSDL URL",
        "soap.fetch_wsdl": "Fetch WSDL",
        "soap.operation": "Operation",
        "soap.generate_envelope": "Generate Envelope",
        "soap.wsdl_parsed_success": "WSDL parsed successfully",
        "soap.endpoint_set": "Endpoint set successfully",
        "soap.select_operation": "Please select an operation",
        "soap.envelope_generated": "SOAP envelope generated",
        "error.empty_endpoint": "Endpoint URL is required",
        "error.invalid_xml": "Invalid XML"
      }
      return translations[key] || key
    },
    
    async fetchWSDLDetails() {
      if (!this.wsdlUrl) {
        this.wsdlError = "WSDL URL is required"
        return
      }
      
      this.fetchingWSDL = true
      this.wsdlError = ""
      
      try {
        // Fetch the WSDL content
        const response = await fetch(this.wsdlUrl)
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const content = await response.text()
        
        // Simple XML parser for demo
        // In real app, use proper WSDL parsing library
        if (!content.includes('<definitions') && !content.includes('<wsdl:definitions')) {
          throw new Error("Invalid WSDL content")
        }
        
        // Extract operations (simplified)
        const operationMatches = content.match(/<operation name="([^"]+)"/g) || []
        this.wsdlOperations = operationMatches.map(match => {
          const name = match.match(/<operation name="([^"]+)"/)[1]
          return { name }
        })
        
        // Extract endpoint (simplified)
        const addressMatch = content.match(/<address location="([^"]+)"/)
        if (addressMatch) {
          this.wsdlServiceEndpoint = addressMatch[1]
          this.endpoint = this.wsdlServiceEndpoint
        }
        
        alert("WSDL parsed successfully: " + this.wsdlOperations.length + " operations found")
      } catch (error) {
        this.wsdlError = error.message
        alert("Error: " + error.message)
      } finally {
        this.fetchingWSDL = false
      }
    },
    
    generateEnvelope() {
      if (!this.operation) {
        alert("Please select an operation")
        return
      }
      
      // Generate a simple SOAP envelope template
      this.body = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="${this.soapVersion === "1.1" ? "http://schemas.xmlsoap.org/soap/envelope/" : "http://www.w3.org/2003/05/soap-envelope"}">
  <soap:Header>
    <!-- Add header elements here -->
  </soap:Header>
  <soap:Body>
    <${this.operation} xmlns="http://example.org/soap">
      <!-- Add parameters here -->
    </${this.operation}>
  </soap:Body>
</soap:Envelope>`
      
      this.activeTab = "body"
      alert("Envelope generated")
    },
    
    formatBody() {
      // Simple XML formatting (indent)
      try {
        const formatted = this.body
          .replace(/></g, ">\n<")
          .replace(/<(\/?)(.*?)>/g, (match, slash, content) => {
            const indent = slash ? "" : "  "
            return `<${slash}${content}>\n${indent}`
          })
          
        this.body = formatted
        alert("XML formatted")
      } catch (error) {
        alert("Error formatting XML: " + error.message)
      }
    },
    
    sendRequest() {
      if (!this.endpoint) {
        alert("Endpoint URL is required")
        return
      }
      
      this.loading = true
      setTimeout(() => {
        alert("Request sent to: " + this.endpoint)
        this.loading = false
      }, 1000)
    },
    
    cancelRequest() {
      this.loading = false
      alert("Request cancelled")
    }
  }
}
</script>
