const fs = require('fs');
const path = require('path');
// We need to use dynamic import for ESM modules
async function getParser() {
  const parser = await import('./packages/hoppscotch-common/src/helpers/soap/wsdl-parser.js');
  return parser.parseWSDL;
}

async function testParser() {
  console.log('--- Direct Testing WSDL Parser ---');
  
  // Read the WSDL file
  const wsdlPath = path.join(__dirname, 'petstore-1.0.wsdl');
  console.log('Reading WSDL file:', wsdlPath);
  const wsdlContent = fs.readFileSync(wsdlPath, 'utf8');
  console.log('File content length:', wsdlContent.length);

  // Parse the WSDL
  try {
    const parseWSDL = await getParser();
    const result = await parseWSDL(wsdlContent);
    console.log('Raw result:', JSON.stringify(result, null, 2));
    
    // Check if it's a left or right result
    if (result && result._tag === 'Left') {
      console.error('Parsing Error:', result.left.message || JSON.stringify(result.left));
      return;
    }
    
    if (result && result._tag === 'Right') {
      const parseResult = result.right;
      
      console.log('\n=== WSDL Parse Result ===');
      console.log(`Target Namespace: ${parseResult.targetNamespace || 'Not found'}`);
      
      // Operations
      console.log(`\nFound ${parseResult.operations ? parseResult.operations.length : 0} operations:`);
      if (parseResult.operations) {
        parseResult.operations.forEach((op, index) => {
          console.log(`\n[${index + 1}] Operation: ${op.name}`);
          if (op.soapAction) console.log(`SOAP Action: ${op.soapAction}`);
          if (op.input) console.log(`Input Message: ${op.input}`);
          if (op.inputElement) console.log(`Input Element: ${op.inputElement}`);
          if (op.output) console.log(`Output Message: ${op.output}`);
          if (op.outputElement) console.log(`Output Element: ${op.outputElement}`);
          if (op.documentation) console.log(`Documentation: ${op.documentation}`);
        });
      } else {
        console.log('No operations found');
      }
      
      // Services
      console.log(`\nFound ${parseResult.services ? parseResult.services.length : 0} services:`);
      if (parseResult.services) {
        parseResult.services.forEach((service, index) => {
          console.log(`\n[${index + 1}] Service: ${service.name}`);
          if (service.port) {
            console.log(`Port Name: ${service.port.name}`);
            console.log(`Port Binding: ${service.port.binding}`);
            console.log(`Port Address: ${service.port.address}`);
          } else {
            console.log('No port information');
          }
          if (service.documentation) console.log(`Documentation: ${service.documentation}`);
        });
      } else {
        console.log('No services found');
      }
      
      // Schemas
      console.log(`\nFound ${parseResult.schemas ? parseResult.schemas.size : 0} schemas`);
      if (parseResult.schemas) {
        parseResult.schemas.forEach((schema, name) => {
          console.log(`\nSchema: ${name}`);
          console.log(`Fields: ${schema.fields.length}`);
          schema.fields.forEach(field => {
            console.log(`- ${field.name}: ${field.type}`);
          });
        });
      } else {
        console.log('No schemas found');
      }
    } else {
      console.error('Unexpected result format:', result);
    }
  } catch (error) {
    console.error('Error during parsing:', error);
  }
}

testParser().catch(console.error);
