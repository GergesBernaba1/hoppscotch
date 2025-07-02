import fs from 'fs';
import path from 'path';
import * as E from 'fp-ts/Either'
import { parseWSDL, WSDLParseResult } from './packages/hoppscotch-common/src/helpers/soap/wsdl-parser';

const __dirname = process.cwd();

// Read the WSDL file
const wsdlPath = path.join(__dirname, 'petstore-1.0.wsdl');
const wsdlContent = fs.readFileSync(wsdlPath, 'utf8');

// Parse the WSDL
console.log("--- Testing WSDL Parser ---");
console.log("Reading WSDL file:", wsdlPath);

async function testParser() {
  const result = await parseWSDL(wsdlContent);
  
  if (E.isLeft(result)) {
    console.error('Parsing Error:', result.left.message);
    return;
  }
  
  const parseResult = result.right;
  console.log(`WSDL Parsing Completed Successfully`);
  console.log(`Target Namespace: ${parseResult.targetNamespace}`);
  
  // Operations
  console.log(`\nFound ${parseResult.operations.length} operations:`);
  parseResult.operations.forEach(op => {
    console.log(`- ${op.name}`);
    if (op.soapAction) console.log(`  SOAP Action: ${op.soapAction}`);
    if (op.input) console.log(`  Input Message: ${op.input}`);
    if (op.inputElement) console.log(`  Input Element: ${op.inputElement}`);
    if (op.output) console.log(`  Output Message: ${op.output}`);
    if (op.outputElement) console.log(`  Output Element: ${op.outputElement}`);
    if (op.documentation) console.log(`  Documentation: ${op.documentation}`);
    console.log();
  });
  
  // Services
  console.log(`\nFound ${parseResult.services.length} services:`);
  parseResult.services.forEach(service => {
    console.log(`- ${service.name}`);
    if (service.port) {
      console.log(`  Port: ${service.port.name}`);
      console.log(`  Binding: ${service.port.binding}`);
      console.log(`  Address: ${service.port.address}`);
    }
    console.log();
  });
  
  // Schemas
  console.log(`\nFound ${parseResult.schemas.size} schemas`);
  parseResult.schemas.forEach((schema, name) => {
    console.log(`- ${name} (${schema.fields.length} fields):`);
    schema.fields.forEach(field => {
      console.log(`  - ${field.name}: ${field.type}`);
    });
    console.log();
  });
}

testParser().catch(console.error);
