// SOAP Authentication types
export const HOPP_SOAP_AUTH_NONE = "none"
export const HOPP_SOAP_AUTH_BASIC = "basic"
export const HOPP_SOAP_AUTH_BEARER = "bearer"
export const HOPP_SOAP_AUTH_APIKEY = "apiKey"

export const SOAP_AUTH_TYPES = [
  HOPP_SOAP_AUTH_NONE,
  HOPP_SOAP_AUTH_BASIC,
  HOPP_SOAP_AUTH_BEARER,
  HOPP_SOAP_AUTH_APIKEY,
] as const

// SOAP versions
export const SOAP_VERSION_1_1 = "1.1"
export const SOAP_VERSION_1_2 = "1.2"

export const SOAP_VERSIONS = [SOAP_VERSION_1_1, SOAP_VERSION_1_2] as const
