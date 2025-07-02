// Simple script to test the WSDL parser directly
const fs = require('fs');
const path = require('path');

// Function to simulate the WSDL parsing logic
function parseWSDL(wsdlContent) {
  try {
    console.log("--- Starting WSDL Parser Test ---");
    
    // Basic XML parsing (simplified version of what the actual parser does)
    const isWSDL = wsdlContent.includes("<wsdl:definitions") || wsdlContent.includes("<definitions");
    if (!isWSDL) {
      console.error("Not a valid WSDL file");
      return { success: false, error: "Not a valid WSDL file" };
    }
    
    // Check for portType elements
    const hasPortTypes = wsdlContent.includes("<wsdl:portType") || wsdlContent.includes("<portType");
    console.log("Contains portType elements:", hasPortTypes);
    
    // Check for binding elements
    const hasBindings = wsdlContent.includes("<wsdl:binding") || wsdlContent.includes("<binding");
    console.log("Contains binding elements:", hasBindings);
    
    // Check for service elements
    const hasServices = wsdlContent.includes("<wsdl:service") || wsdlContent.includes("<service");
    console.log("Contains service elements:", hasServices);
    
    // Count operations - a very simple way
    const operationMatches = wsdlContent.match(/<wsdl:operation|<operation/g);
    const operationCount = operationMatches ? operationMatches.length : 0;
    console.log("Estimated operation count:", operationCount);
    
    // Extract operation names - this is a simplified approach
    const operationNameRegex = /<(wsdl:)?operation\s+name="([^"]+)"/g;
    const operations = [];
    let match;
    
    while ((match = operationNameRegex.exec(wsdlContent)) !== null) {
      operations.push(match[2]);
    }
    
    // Remove duplicates (since operations appear in both portType and binding)
    const uniqueOps = Array.from(new Set(operations));
    console.log("Operation names:", uniqueOps);
    
    return {
      success: true,
      operations: uniqueOps,
      serviceCount: hasServices ? 1 : 0,
      bindingCount: operationCount > 0 ? 1 : 0,
    };
  } catch (error) {
    console.error("Parser test error:", error);
    return { success: false, error: error.message };
  }
}

// Read the WSDL file
const wsdlPath = path.join(__dirname, 'petstore-1.0.wsdl');
console.log("Reading WSDL file:", wsdlPath);

try {
  const wsdlContent = fs.readFileSync(wsdlPath, 'utf8');
  console.log("File content length:", wsdlContent.length);
  
  const result = parseWSDL(wsdlContent);
  console.log("\nParsing result:", result);
  
  if (result.success) {
    console.log("\nSummary:");
    console.log(`- Found ${result.operations.length} operations`);
    console.log(`- Found ${result.serviceCount} services`);
    console.log(`- Found ${result.bindingCount} bindings`);
  } else {
    console.log("Parser failed:", result.error);
  }
} catch (error) {
  console.error("File read error:", error);
}
