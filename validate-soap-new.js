const fs = require('fs');
const path = require('path');

console.log('Validating SOAP Implementation...');

// Check if necessary files exist
const requiredFiles = [
  'd:/POCs/hoppscotch/packages/hoppscotch-common/src/pages/soap.vue',
  'd:/POCs/hoppscotch/packages/hoppscotch-common/src/components/soap/Request.vue',
  'd:/POCs/hoppscotch/packages/hoppscotch-common/src/services/soap-tab.service.ts',
  'd:/POCs/hoppscotch/packages/hoppscotch-data/src/soap/index.ts'
];

let allFilesExist = true;
for (const file of requiredFiles) {
  if (fs.existsSync(file)) {
    console.log(`✓ File exists: ${file}`);
  } else {
    console.log(`✗ File missing: ${file}`);
    allFilesExist = false;
  }
}

// Check import consistency
const soapModulePath = 'd:/POCs/hoppscotch/packages/hoppscotch-common/src/modules/soap.ts';
if (fs.existsSync(soapModulePath)) {
  const soapModuleContent = fs.readFileSync(soapModulePath, 'utf-8');
  if (soapModuleContent.includes("import { SOAPTabService } from \"~/services/tab/soap\"")) {
    console.log('✗ Wrong import path in SOAP module. Should import from "~/services/soap-tab.service"');
  } else if (soapModuleContent.includes("import { SOAPTabService } from \"~/services/soap-tab.service\"")) {
    console.log('✓ Correct import path in SOAP module');
  }
} else {
  console.log('✗ SOAP module file not found');
}

// Check module registration
const indexPath = 'd:/POCs/hoppscotch/packages/hoppscotch-common/src/modules/index.ts';
if (fs.existsSync(indexPath)) {
  const indexContent = fs.readFileSync(indexPath, 'utf-8');
  if (indexContent.includes('soapModule')) {
    console.log('✓ SOAP module is registered in modules/index.ts');
  } else {
    console.log('✗ SOAP module is not registered in modules/index.ts');
  }
} else {
  console.log('✗ Modules index file not found');
}

// Check if there are duplicate service files
const soapTabServicePath = 'd:/POCs/hoppscotch/packages/hoppscotch-common/src/services/tab/soap.ts';
const soapTabServiceOldPath = 'd:/POCs/hoppscotch/packages/hoppscotch-common/src/services/soap-tab.service.ts';

if (fs.existsSync(soapTabServicePath) && fs.existsSync(soapTabServiceOldPath)) {
  console.log('✗ Found duplicate SOAP tab service files');
  console.log(`  - ${soapTabServicePath}`);
  console.log(`  - ${soapTabServiceOldPath}`);
} else if (fs.existsSync(soapTabServicePath)) {
  console.log(`✓ SOAP tab service exists at: ${soapTabServicePath}`);
} else if (fs.existsSync(soapTabServiceOldPath)) {
  console.log(`✓ SOAP tab service exists at: ${soapTabServiceOldPath}`);
} else {
  console.log('✗ SOAP tab service not found');
}

if (allFilesExist) {
  console.log('\n✓ All required files for SOAP implementation exist');
} else {
  console.log('\n✗ Some required files for SOAP implementation are missing');
}
