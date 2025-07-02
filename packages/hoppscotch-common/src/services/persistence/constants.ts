/**
 * Constants for persistence service
 */
export const STORE_NAMESPACE = "persistence.v1"

export const STORE_KEYS = {
  VUEX: "vuex",
  SETTINGS: "settings",
  LOCAL_STATE: "localState",
  SOAP_TABS: "soapTabs",
  SOAP_HISTORY: "soapHistory",
  REST_HISTORY: "restHistory",
  GQL_HISTORY: "gqlHistory",
  REST_COLLECTIONS: "restCollections",
  GQL_COLLECTIONS: "gqlCollections",
  ENVIRONMENTS: "environments",
  SELECTED_ENV: "selectedEnv",
  WEBSOCKET: "websocket",
  SOCKETIO: "socketio",
  SSE: "sse",
  MQTT: "mqtt",
  GLOBAL_ENV: "globalEnv",
  REST_TABS: "restTabs",
  GQL_TABS: "gqlTabs",
  SECRET_ENVIRONMENTS: "secretEnvironments",
  SCHEMA_VERSION: "schema_version",
} as const
