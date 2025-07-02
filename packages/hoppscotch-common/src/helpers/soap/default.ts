import { HoppSOAPRequest, makeSOAPRequest, SOAP_VERSION_1_1 } from "@hoppscotch/data"

export const getDefaultSOAPRequest = (): HoppSOAPRequest => 
  makeSOAPRequest({
    name: "Untitled",
    endpoint: "",
    wsdlUrl: "",
    soapVersion: SOAP_VERSION_1_1,
    auth: {
      authType: "none",
      authActive: true,
    },
    headers: [],
    params: [],
    operation: "",
    body: `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Header>
  </soap:Header>
  <soap:Body>
    <!-- Your SOAP request body goes here -->
  </soap:Body>
</soap:Envelope>`,
    preRequestScript: "",
    testScript: "",
    attachments: [],
    useMtom: false,
  })