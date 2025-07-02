import * as E from "fp-ts/Either"
import { XMLParser } from "fast-xml-parser"

export type WSDLOperation = {
  name: string
  soapAction?: string
  input?: string
  inputElement?: string
  output?: string
  outputElement?: string
  documentation?: string
}

export type WSDLService = {
  name: string
  documentation?: string
  port?: {
    name: string
    binding: string
    address: string
  }
}

export type WSDLSchema = {
  name: string
  fields: { name: string; type: string }[]
}

export type WSDLParseResult = {
  operations: WSDLOperation[]
  services: WSDLService[]
  targetNamespace?: string
  schemas: Map<string, WSDLSchema>
}

// Helper to find an element in an object regardless of namespace prefix
const findElement = (obj: any, elementName: string): any => {
    if (!obj) return undefined
    
    // First, try with exact key match (without or with prefix)
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const keyName = key.split(':').pop()
            if (keyName === elementName) {
                return obj[key]
            }
        }
    }
    
    // If not found, try with case-insensitive match (for schemas that might have different case)
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const keyName = key.split(':').pop()
            if (keyName && keyName.toLowerCase() === elementName.toLowerCase()) {
                return obj[key]
            }
        }
    }

    return undefined
}

const mergeDefinitions = (mainDefs: any, importedDefs: any) => {
  const keysToMerge = ["message", "portType", "binding", "service", "types", "element", "complexType", "simpleType"]

  for (const key of keysToMerge) {
    const mainElement = findElement(mainDefs, key)
    const importedElement = findElement(importedDefs, key)

    if (importedElement) {
      const mainItems = mainElement ? (Array.isArray(mainElement) ? mainElement : [mainElement]) : []
      const importedItems = Array.isArray(importedElement) ? importedElement : [importedElement]
      
      const combined = [...mainItems, ...importedItems]
      
      // Since we can't be sure of the prefixed key (e.g., wsdl:message), we find it and update it.
      // If it doesn't exist, we just add the non-prefixed version.
      const existingKey = Object.keys(mainDefs).find(k => k.endsWith(`:${key}`) || k === key)
      if (existingKey) {
        mainDefs[existingKey] = combined
      } else {
        mainDefs[key] = combined
      }
    }
  }
}

export const parseWSDL = async (
  wsdlContent: string,
  baseUrl?: string
): Promise<E.Either<Error, WSDLParseResult>> => {
  try {
    console.log("--- Starting WSDL Parsing ---")

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      // Ensure all potentially relevant tags are treated as arrays for consistent merging
      isArray: (name: string) =>        [
          "operation", "service", "port", "portType", "binding", 
          "message", "part", "types", "schema", "element", 
          "complexType", "sequence", "import"
        ].includes(name.split(':').pop() || name),
    })
    
    const parsed = parser.parse(wsdlContent)
    console.log("1. Raw Parsed XML to JS Object:", parsed)
    
    // Function to recursively search for the definitions element
    const findDefinitionsElement = (obj: any): any => {
      if (!obj || typeof obj !== 'object') return null;

      // Check if this object has characteristics of a definitions element
      const hasDefinitionsCharacteristics = (o: any) => {
        return (
          (o['wsdl:portType'] || o['portType'] || o['binding'] || o['wsdl:binding'] || 
           o['service'] || o['wsdl:service'] || o['types'] || o['wsdl:types']) &&
          (typeof o['@_targetNamespace'] === 'string' || typeof o['@_xmlns'] === 'string')
        );
      };

      // First try the common WSDL namespaces
      if (obj['wsdl:definitions']) return obj['wsdl:definitions'];
      if (obj['definitions']) return obj['definitions'];
      if (obj['s:definitions']) return obj['s:definitions'];
      
      // Try other namespace prefixes
      for (const key in obj) {
        if (key.endsWith(':definitions') && obj[key]) {
          return obj[key];
        }
      }
      
      // Look for an object that looks like a definitions element
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key) && 
            typeof obj[key] === 'object' && 
            obj[key] !== null) {
          
          // Check if this key's value has definitions characteristics
          if (hasDefinitionsCharacteristics(obj[key])) {
            return obj[key];
          }
          
          // Recursively check this property
          const result = findDefinitionsElement(obj[key]);
          if (result) return result;
        }
      }
      
      return null;
    };
    
    // Find the definitions element
    let definitions = findDefinitionsElement(parsed);
    
    if (!definitions) {
      console.error("Parser Error: Could not find root <definitions> element.")
      return E.left(new Error("Could not find root <definitions> element in WSDL."))
    }
    
    console.log("2. Found <definitions> element (pre-import):", JSON.stringify(definitions))

    // --- Handle WSDL Imports ---
    const imports = findElement(definitions, 'import')
    if (imports && baseUrl) {
      console.log("Found WSDL imports:", imports)
      for (const imp of imports) {
        const location = imp['@_location'] || imp['@_schemaLocation']
        if (location) {
          try {
            const importUrl = new URL(location, baseUrl).toString()
            console.log(`Fetching imported WSDL/XSD from: ${importUrl}`)
            const importedContentEither = await fetchWSDL(importUrl)

            if (E.isLeft(importedContentEither)) {
              console.warn(`Skipping import: Could not fetch ${importUrl}: ${importedContentEither.left.message}`)
              continue
            }
            
            const importedParsed = parser.parse(importedContentEither.right)
            const importedDefinitions = Object.values(importedParsed)[0] as any
            
            if (importedDefinitions) {
              console.log(`Merging definitions from ${importUrl}`)
              mergeDefinitions(definitions, importedDefinitions)
            }
          } catch (e) {
            console.warn(`Skipping import: Failed to process import at ${location}`, e)
          }
        }
      }
      console.log("2.1. Definitions after merging imports:", JSON.stringify(definitions))
    } else if (imports && !baseUrl) {
      console.warn("WSDL contains imports, but no base URL was provided. Imports will be ignored. Please use the URL option for WSDLs with imports.")
    }    const targetNamespace = definitions["@_targetNamespace"]
    console.log("3. Target Namespace:", targetNamespace)
    
    const operations: WSDLOperation[] = []
    const services: WSDLService[] = []
    const schemas = new Map<string, WSDLSchema>()
      // --- Pre-process portTypes into a map for easy lookup ---
    const portTypeMap = new Map<string, any>()
    const portTypeBlocks = findElement(definitions, 'portType')
    console.log("Raw portType blocks:", portTypeBlocks)
    
    if (portTypeBlocks) {
      const allPortTypes = Array.isArray(portTypeBlocks) ? portTypeBlocks : [portTypeBlocks]
      console.log(`Found ${allPortTypes.length} port type(s)`)
      
      allPortTypes.forEach((pt, idx) => {
        console.log(`Processing port type #${idx}:`, pt)
        if (pt && pt["@_name"]) {
          portTypeMap.set(pt["@_name"], pt)
          console.log(`Added port type with name: ${pt["@_name"]}`)
        }
      })
    }
    console.log("4a. Pre-processed PortTypes:", Object.fromEntries(portTypeMap))
    
    // --- Build message map ---
    const messages = findElement(definitions, 'message')
    const messageMap = new Map<string, { element?: string; name?: string }>()
    if (messages) {
      const msgs = Array.isArray(messages) ? messages : [messages]
      console.log(`Processing ${msgs.length} messages for message map`)
      
      msgs.forEach((msg: any) => {
        if (!msg["@_name"]) {
          console.warn("Found message without name attribute:", msg)
          return
        }
        
        console.log(`Processing message: ${msg["@_name"]}`)
        const part = findElement(msg, 'part')
        
        if (part) {
          const parts = Array.isArray(part) ? part : [part]
          if (parts.length > 0) {
            // Log each part for debugging
            parts.forEach((p, index) => {
              console.log(`Message ${msg["@_name"]} part ${index}:`, JSON.stringify(p))
            })
            
            // Use the first part that has an element attribute
            const elementPart = parts.find(p => p["@_element"])
            
            if (elementPart) {
              messageMap.set(msg["@_name"], {
                element: elementPart["@_element"],
                name: elementPart["@_name"],
              })
              console.log(`Added message ${msg["@_name"]} to map with element: ${elementPart["@_element"]}`)
            } else if (parts[0]["@_type"]) {
              // If no element attribute but has type, use that
              messageMap.set(msg["@_name"], {
                element: parts[0]["@_type"], // Use type as element
                name: parts[0]["@_name"],
              })
              console.log(`Added message ${msg["@_name"]} to map with type: ${parts[0]["@_type"]}`)
            } else {
              messageMap.set(msg["@_name"], {
                name: parts[0]["@_name"],
              })
              console.log(`Added message ${msg["@_name"]} to map with name only: ${parts[0]["@_name"]}`)
            }
          }
        }
      })
    }
    console.log("4b. Built Message Map:", Object.fromEntries(messageMap))
    
    // --- Extract schema types ---
    const typesBlocks = findElement(definitions, 'types')
    if (typesBlocks) {
        console.log("Processing schema types")
        // Get all schemas - could be single or multiple
        const schemaNodes = findElement(typesBlocks, 'schema')
        
        if (schemaNodes) {
            const processComplexType = (cType: any) => {
                const fields: { name: string; type: string }[] = []
                
                // Try standard sequence
                const sequence = findElement(cType, 'sequence')
                if (sequence) {
                    const elements = findElement(sequence, 'element')
                    if (elements) {
                        const items = Array.isArray(elements) ? elements : [elements]
                        items.forEach((item: any) => {
                            fields.push({ 
                                name: item['@_name'], 
                                type: item['@_type'] || 'xsd:string' // Default to string if no type
                            })
                        })
                    }
                }
                
                // Try all/choice structure
                const all = findElement(cType, 'all') || findElement(cType, 'choice')
                if (all) {
                    const elements = findElement(all, 'element')
                    if (elements) {
                        const items = Array.isArray(elements) ? elements : [elements]
                        items.forEach((item: any) => {
                            fields.push({ 
                                name: item['@_name'], 
                                type: item['@_type'] || 'xsd:string'
                            })
                        })
                    }
                }
                
                return fields
            }
            
            // Process all schema nodes
            const schemaArray = Array.isArray(schemaNodes) ? schemaNodes : [schemaNodes]
            console.log(`Processing ${schemaArray.length} schema(s)`)
            
            schemaArray.forEach((schema, schemaIndex) => {
                console.log(`Processing schema ${schemaIndex}`)
                // Handle inline complex types
                const complexTypes = findElement(schema, 'complexType')
                if (complexTypes) {
                    const ctArray = Array.isArray(complexTypes) ? complexTypes : [complexTypes]
                    console.log(`Found ${ctArray.length} complex types in schema`)
                    
                    ctArray.forEach(ct => {
                        const ctName = ct['@_name']
                        if (ctName) {
                            const fields = processComplexType(ct)
                            schemas.set(ctName, { name: ctName, fields })
                            console.log(`Added complex type schema: ${ctName} with ${fields.length} fields`)
                        }
                    })
                }
                
                // Handle elements with inline types
                const elements = findElement(schema, 'element')
                if (elements) {
                    const elems = Array.isArray(elements) ? elements : [elements]
                    console.log(`Found ${elems.length} elements in schema`)
                    
                    elems.forEach((el: any) => {
                        const elName = el['@_name']
                        if (!elName) {
                            console.warn("Found element without name:", el)
                            return
                        }
                        
                        console.log(`Processing element: ${elName}`)
                        // Check for complex type within element
                        const complexType = findElement(el, 'complexType')
                        if (complexType) {
                            const fields = processComplexType(complexType)
                            schemas.set(elName, { name: elName, fields })
                            console.log(`Added element schema: ${elName} with ${fields.length} fields`)
                        } else if (el['@_type']) {
                            // Simple type reference
                            schemas.set(elName, { 
                                name: elName, 
                                fields: [{ name: 'value', type: el['@_type'] }] 
                            })
                            console.log(`Added simple element schema: ${elName} with type ${el['@_type']}`)
                        }
                    })
                }
            })
        }
    }
    console.log("5. Extracted Schemas:", Object.fromEntries(schemas))
    
    // --- Extract Operations from Bindings (more reliable) ---
    const bindings = findElement(definitions, 'binding')
    console.log("Bindings found:", bindings ? "Yes" : "No")
    
    // If no bindings found, try to extract operations directly from portTypes
    if (!bindings && portTypeMap.size > 0) {
      console.log("No bindings found, extracting operations directly from portTypes")
      
      portTypeMap.forEach((portType, portTypeName) => {
        console.log(`Processing portType: ${portTypeName}`)
        
        const portTypeOps = findElement(portType, 'operation')
        if (portTypeOps) {
          const ops = Array.isArray(portTypeOps) ? portTypeOps : [portTypeOps]
          console.log(`Found ${ops.length} operation(s) in portType`)
          
          ops.forEach((op: any) => {
            console.log("Processing operation:", op["@_name"])
            let opDetails: WSDLOperation = { name: op["@_name"] }
            
            const input = findElement(op, 'input')
            const output = findElement(op, 'output')
            const documentation = findElement(op, 'documentation')

            const inputMessageName = input?.["@_message"]?.split(':').pop()
            const outputMessageName = output?.["@_message"]?.split(':').pop()
            
            console.log("Input message:", inputMessageName)
            console.log("Output message:", outputMessageName)
            
            const inputElement = messageMap.get(inputMessageName || "")?.element?.split(':').pop() || undefined
            const outputElement = messageMap.get(outputMessageName || "")?.element?.split(':').pop() || undefined
            
            console.log("Input element:", inputElement)
            console.log("Output element:", outputElement)
            
            opDetails = {
              ...opDetails,
              input: inputMessageName,
              inputElement,
              output: outputMessageName,
              outputElement,
              documentation: typeof documentation === 'string' ? documentation : undefined,
            }
            
            operations.push(opDetails)
          })
        }
      })
    }
      // Process bindings if they exist
    if (bindings) {
      const bindingList = Array.isArray(bindings) ? bindings : [bindings]
      console.log(`Processing ${bindingList.length} binding(s)`)
      
      bindingList.forEach((binding: any) => {
        console.log("Processing binding:", binding['@_name'])
        
        // Get binding port type, handling potential namespace prefixes
        const bindingTypeAttr = binding['@_type'] || ""
        console.log("Raw binding type attribute:", bindingTypeAttr)
        
        // Handle potential namespace prefixes
        const bindingPortTypeName = bindingTypeAttr.includes(':') ? 
          bindingTypeAttr.split(':').pop() : 
          bindingTypeAttr
        
        console.log("Looking for port type with name:", bindingPortTypeName)
        
        // Find matching port type
        let portType = portTypeMap.get(bindingPortTypeName)
        console.log("Direct port type match found:", portType ? "Yes" : "No")
        
        // If port type not found, try with more aggressive matching
        let finalPortType = portType
        if (!finalPortType && bindingPortTypeName) {
          console.log("Trying alternative port type lookup methods...")
          
          // Try case-insensitive match
          for (const [key, value] of portTypeMap.entries()) {
            if (key.toLowerCase() === bindingPortTypeName.toLowerCase()) {
              finalPortType = value
              console.log("Found port type with case-insensitive match:", key)
              break
            }
          }
          
          // If still not found, try to match regardless of namespace
          if (!finalPortType) {
            for (const [key, value] of portTypeMap.entries()) {
              const keyWithoutNS = key.includes(':') ? key.split(':').pop() : key
              if (keyWithoutNS === bindingPortTypeName) {
                finalPortType = value
                console.log("Found port type ignoring namespace:", key)
                break
              }
            }
          }
          
          // If still not found, try extracting operations directly from binding
          if (!finalPortType) {
            console.log("Port type not found, attempting to extract operations directly from binding")
          }
        }

        const bindingOps = findElement(binding, 'operation')
        if (bindingOps) {
          const ops = Array.isArray(bindingOps) ? bindingOps : [bindingOps]
          console.log(`Found ${ops.length} operation(s) in binding`)
          
          ops.forEach((op: any) => {
            const opName = op["@_name"]
            console.log("Processing binding operation:", opName)
            
            // Check if this operation was already processed (avoid duplicates if extracted from portTypes)
            const existingOp = operations.find(o => o.name === opName)
            let opDetails: WSDLOperation = existingOp || { name: opName }            // Find soapAction in binding            // Extract soapAction through various means
            let soapAction = null
            
            // Method 1: Look for direct soapAction attribute in operation element
            const soapOp = findElement(op, 'operation')
            if (soapOp && soapOp["@_soapAction"]) {
              soapAction = soapOp["@_soapAction"]
              console.log(`Found soap action in operation: ${soapAction}`)
            }

            // Method 2: Look for elements ending with :operation (like soap:operation)
            if (!soapAction) {
              for (const key in op) {
                if (key.endsWith(':operation') && 
                    typeof op[key] === 'object' && 
                    op[key] !== null &&
                    op[key]['@_soapAction']) {
                  soapAction = op[key]['@_soapAction']
                  console.log(`Found soap action in ${key}: ${soapAction}`)
                  break
                }
              }
            }
            
            // Method 3: Check explicit soap:operation and soap12:operation
            if (!soapAction) {
              const soapOperation = findElement(op, 'soap:operation')
              if (soapOperation && soapOperation["@_soapAction"]) {
                soapAction = soapOperation["@_soapAction"]
                console.log(`Found soap action in soap:operation: ${soapAction}`)
              }
            }
            
            if (!soapAction) {
              const soap12Operation = findElement(op, 'soap12:operation')
              if (soap12Operation && soap12Operation["@_soapAction"]) {
                soapAction = soap12Operation["@_soapAction"]
                console.log(`Found soap action in soap12:operation: ${soapAction}`)
              }
            }
            
            // Method 4: More aggressive search - check for @_soapAction in any child object
            if (!soapAction) {
              for (const key in op) {
                if (typeof op[key] === 'object' && op[key] !== null && op[key]['@_soapAction']) {
                  soapAction = op[key]['@_soapAction']
                  console.log(`Found soap action in child object: ${soapAction}`)
                  break
                }
              }
            }

            // Assign the found soap action to the operation details
            if (soapAction) {
              opDetails.soapAction = soapAction
            }
            
            console.log("Found soap action:", opDetails.soapAction || "none")
            
            // Find matching operation in portType to get message details
            if (finalPortType) {
              const portTypeOps = findElement(finalPortType, 'operation')
              
              if (portTypeOps) {
                const portTypeOpsArray = Array.isArray(portTypeOps) ? portTypeOps : [portTypeOps]
                console.log(`Looking for matching operation '${opName}' among ${portTypeOpsArray.length} port type operations`)
                
                // Log all port type operation names for debugging
                portTypeOpsArray.forEach(pto => {
                  console.log(`Available port type operation: ${pto && pto['@_name']}`)
                })
                
                const portTypeOp = portTypeOpsArray.find(pto => {
                  const ptoName = pto && pto['@_name']
                  return ptoName === opName
                })
                
                console.log("Matching port type operation found:", portTypeOp ? "Yes" : "No")

                if (portTypeOp) {
                  const input = findElement(portTypeOp, 'input')
                  const output = findElement(portTypeOp, 'output')
                  const documentation = findElement(portTypeOp, 'documentation')

                  const inputMessageName = input?.["@_message"]?.split(':').pop()
                  const outputMessageName = output?.["@_message"]?.split(':').pop()
                  
                  console.log("Input message:", inputMessageName)
                  console.log("Output message:", outputMessageName)
                  
                  const inputElement = messageMap.get(inputMessageName || "")?.element?.split(':').pop() || undefined
                  const outputElement = messageMap.get(outputMessageName || "")?.element?.split(':').pop() || undefined
                  
                  console.log("Input element:", inputElement)
                  console.log("Output element:", outputElement)
                  
                  opDetails = {
                    ...opDetails,
                    input: inputMessageName,
                    inputElement,
                    output: outputMessageName,
                    outputElement,
                    documentation: typeof documentation === 'string' ? documentation : undefined,
                  }
                }
              }
            }
            
            // Only add if it's not already in the operations array
            if (!existingOp) {
              operations.push(opDetails)
            }
          })
        }
      })
    }
    console.log("6. Extracted Operations (from bindings):", operations)
    
    // --- Extract services and all ports ---
    const wsdlServices = findElement(definitions, 'service')
    if (wsdlServices) {
      const servicesArray = Array.isArray(wsdlServices) ? wsdlServices : [wsdlServices]
      servicesArray.forEach((service: any) => {
        const servicePorts = findElement(service, 'port')
        if (servicePorts) {
          const ports = Array.isArray(servicePorts) ? servicePorts : [servicePorts]
          ports.forEach((port: any) => {
            const address = findElement(port, 'address')
            if (address && address["@_location"]) {
              services.push({
                name: service["@_name"],
                documentation: findElement(service, 'documentation'),
                port: {
                  name: port["@_name"],
                  binding: port["@_binding"]?.split(':').pop(),
                  address: address["@_location"],
                },
              })
            }
          })
        }
      })
    }
    console.log("7. Extracted Services:", services)

    const finalResult = {
      operations,
      services,
      targetNamespace,
      schemas
    }

    console.log("--- WSDL Parsing Complete ---")
    console.log("8. Final Parse Result:", finalResult)

    return E.right(finalResult)
  } catch (error: unknown) {
    console.error("--- WSDL Parsing Failed ---", error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return E.left(new Error(`Failed to parse WSDL: ${errorMessage}`))
  }
}

export const fetchWSDL = async (url: string): Promise<E.Either<Error, string>> => {
  try {
    const response = await fetch(url)
    
    if (!response.ok) {
      return E.left(new Error(`Failed to fetch WSDL: ${response.status} ${response.statusText}`))
    }
    
    const wsdlContent = await response.text()
    return E.right(wsdlContent)
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return E.left(new Error(`Failed to fetch WSDL: ${errorMessage}`))
  }
}

export const generateSoapEnvelope = (
  operation: WSDLOperation,
  parameters: Record<string, any> = {},
  targetNamespace?: string
): string => {
  const soapNamespace = "http://schemas.xmlsoap.org/soap/envelope/"
  const targetNS = targetNamespace || "http://tempuri.org/"
  
  // Generate parameter XML from the parameters object
  const generateParameterXML = (params: Record<string, any>, indent = "      "): string => {
    return Object.entries(params)
      .map(([key, value]) => {
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          return `${indent}<${key}>\n${generateParameterXML(value, indent + "  ")}\n${indent}</${key}>`
        } else if (Array.isArray(value)) {
          return value.map(item => 
            typeof item === 'object' && item !== null
              ? `${indent}<${key}>\n${generateParameterXML(item, indent + "  ")}\n${indent}</${key}>`
              : `${indent}<${key}>${item}</${key}>`
          ).join('\n')
        } else {
          return `${indent}<${key}>${value}</${key}>`
        }
      })
      .join('\n')
  }

  const parametersXML = Object.keys(parameters).length > 0 
    ? `\n${generateParameterXML(parameters)}\n    `
    : ''

  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="${soapNamespace}" xmlns:tns="${targetNS}">
  <soap:Header />
  <soap:Body>
    <tns:${operation.name}>${parametersXML}</tns:${operation.name}>
  </soap:Body>
</soap:Envelope>`
}

export const generateRequestFromWSDL = (
  wsdl: WSDLParseResult,
  operationName: string
): string => {
  const operation = wsdl.operations.find(o => o.name === operationName)
  if (!operation || !operation.inputElement) return ""

  const cleanElementName = operation.inputElement.split(':').pop() || ""
  const schema = wsdl.schemas.get(cleanElementName)
  
  if (!schema) return `<${cleanElementName}></${cleanElementName}>`

  const generateFields = (fields: { name: string; type: string }[], indent: string) => {
    return fields
      .map(field => `${indent}<${field.name.split(':').pop()}>?</${field.name.split(':').pop()}>`)
      .join('\n')
  }

  const fieldsXml = schema.fields.length > 0
    ? `\n${generateFields(schema.fields, '      ')}\n    `
    : ''

  return `<${cleanElementName}>${fieldsXml}</${cleanElementName}>`
}
