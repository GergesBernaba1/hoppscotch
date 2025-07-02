# SOAP Support in Hoppscotch

This directory contains the implementation of SOAP API support in Hoppscotch.

## Files Overview

- `index.ts`: Main data models for SOAP requests and responses
- `v/1.ts`: Schema definition for version 1 of the SOAP data model
- `wsdl-parser.ts`: Utilities for parsing WSDL files and extracting operations
- `soap-network.ts`: Network handler for sending SOAP requests
- `soap-attachments.ts`: Support for SOAP attachments (MTOM/XOP)
- `wsdl-error-handler.ts`: Error handling and retry mechanisms for WSDL operations

## Components

- `Request.vue`: Component for configuring and sending SOAP requests
- `Response.vue`: Component for displaying SOAP responses
- `Attachments.vue`: Component for managing SOAP attachments
- `History.vue`: Component for viewing SOAP request history

## Features

### WSDL Parsing
- Parse WSDL files to extract operations, services, and endpoints
- Support both SOAP 1.1 and 1.2
- Detect endpoints from service information

### SOAP Request/Response
- Send SOAP requests with proper headers based on SOAP version
- Handle SOAP responses and display them in a user-friendly way
- Support for SOAPAction header in 1.1 and action parameter in 1.2

### Attachments (MTOM/XOP)
- Support for binary attachments using MTOM/XOP
- File uploads with content type detection
- MIME multipart message generation

### History
- Track and display SOAP request/response history
- Star/unstar important requests
- Reuse requests from history

## Usage

1. Enter a WSDL URL and fetch the WSDL
2. Select an operation from the parsed WSDL
3. Configure parameters, headers, and authentication
4. Add attachments if needed
5. Send the request and view the response

## Planned Enhancements

- Support for importing WSDL files from disk
- Collections for SOAP requests
- Advanced MTOM handling with streaming
- Integration with environment variables
- SOAP fault handling and visualization
