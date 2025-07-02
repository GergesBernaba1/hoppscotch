// Test script to reproduce XMLHttpRequest code generation
const HTTPSnippet = require('@hoppscotch/httpsnippet');

// Create a simple HAR entry to test XMLHttpRequest code generation
const harEntry = {
  method: 'POST',
  url: 'https://httpbin.org/post',
  headers: [
    { name: 'Content-Type', value: 'application/json' },
    { name: 'Authorization', value: 'Bearer token123' }
  ],
  postData: {
    mimeType: 'application/json',
    text: JSON.stringify({ 
      test: 'data',
      with: {
        nested: 'object'
      }
    })
  }
};

try {
  const snippet = new HTTPSnippet(harEntry);
  
  // Generate JavaScript XMLHttpRequest code
  const xhrCode = snippet.convert('javascript', 'xhr');
  
  console.log('Generated XMLHttpRequest code:');
  console.log('='.repeat(50));
  console.log(xhrCode);
  console.log('='.repeat(50));
  
  // Check if the code contains 'wr' variable
  if (xhrCode.includes('wr')) {
    console.log('\n⚠️  Found "wr" variable in generated code!');
    console.log('Lines containing "wr":');
    const lines = xhrCode.split('\n');
    lines.forEach((line, index) => {
      if (line.includes('wr')) {
        console.log(`Line ${index + 1}: ${line}`);
      }
    });
  } else {
    console.log('\n✅ No "wr" variable found in generated code');
  }
  
} catch (error) {
  console.error('Error generating code:', error);
}
