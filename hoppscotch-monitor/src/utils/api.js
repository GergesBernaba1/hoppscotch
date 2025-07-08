/**
 * API client for interacting with Hoppscotch backend services
 */
const axios = require('axios');
const logger = require('./logger');
const config = require('../config');

// Create an axios instance with default configuration
const apiClient = axios.create({
  baseURL: config.api.url,
  timeout: config.api.timeout,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
});

// Authentication token storage
let authToken = null;

/**
 * Authenticate with the Hoppscotch API
 * @returns {Promise<boolean>} - Whether authentication was successful
 */
const authenticate = async () => {
  try {
    // If we have a token in env config, use that directly
    if (config.auth.token) {
      authToken = config.auth.token;
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
      logger.info('Using pre-configured auth token');
      return true;
    }
    
    // Otherwise try to authenticate with credentials
    if (!config.auth.email || !config.auth.password) {
      logger.warn('No authentication credentials provided');
      return false;
    }

    const response = await apiClient.post('/auth/login', {
      email: config.auth.email,
      password: config.auth.password
    });

    if (response.data && response.data.access_token) {
      authToken = response.data.access_token;
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
      logger.info('Successfully authenticated with the API');
      return true;
    } else {
      logger.error('Authentication failed: Invalid response format');
      return false;
    }
  } catch (error) {
    logger.error('Authentication failed', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    return false;
  }
};

/**
 * Check API health
 * @returns {Promise<Object>} Health check result
 */
const checkHealth = async () => {
  try {
    const startTime = Date.now();
    const response = await apiClient.get('/health');
    const duration = Date.now() - startTime;
    
    return {
      success: response.status === 200,
      duration,
      status: response.status,
      data: response.data
    };
  } catch (error) {
    logger.error('API health check failed', {
      message: error.message,
      status: error.response?.status
    });
    
    return {
      success: false,
      duration: Date.now() - startTime,
      error: error.message,
      status: error.response?.status || 'ERROR'
    };
  }
};

/**
 * Execute a GraphQL query
 * @param {string} query - GraphQL query
 * @param {Object} variables - Query variables
 * @returns {Promise<Object>} Query result
 */
const executeGraphQL = async (query, variables = {}) => {
  try {
    const startTime = Date.now();
    const response = await apiClient.post(config.api.graphqlEndpoint, {
      query,
      variables
    });
    const duration = Date.now() - startTime;
    
    if (response.data.errors) {
      logger.error('GraphQL query returned errors', {
        errors: response.data.errors,
        query
      });
      
      return {
        success: false,
        duration,
        errors: response.data.errors
      };
    }
    
    return {
      success: true,
      duration,
      data: response.data.data
    };
  } catch (error) {
    logger.error('GraphQL query execution failed', {
      message: error.message,
      query
    });
    
    return {
      success: false,
      duration: 0,
      error: error.message
    };
  }
};

/**
 * Get current user information
 * @returns {Promise<Object>} User information or error
 */
const getCurrentUser = async () => {
  // First ensure we're authenticated
  if (!authToken) {
    await authenticate();
  }
  
  const query = `
    query GetMe {
      me {
        uid
        displayName
        email
        photoURL
        isAdmin
      }
    }
  `;
  
  return executeGraphQL(query);
};

/**
 * Test creating a collection
 * @returns {Promise<Object>} Test result
 */
const testCreateCollection = async () => {
  const testName = `Test Collection ${Date.now()}`;
  
  const mutation = `
    mutation CreateCollection($title: String!) {
      createCollection(data: { title: $title, type: "REST" }) {
        id
        title
      }
    }
  `;
  
  const result = await executeGraphQL(mutation, { title: testName });
  if (result.success) {
    result.collectionId = result.data.createCollection.id;
  }
  
  return result;
};

/**
 * Test deleting a collection
 * @param {string} collectionId - The ID of the collection to delete
 * @returns {Promise<Object>} Test result
 */
const testDeleteCollection = async (collectionId) => {
  const mutation = `
    mutation DeleteCollection($collectionID: ID!) {
      deleteCollection(collectionID: $collectionID)
    }
  `;
  
  return executeGraphQL(mutation, { collectionID: collectionId });
};

/**
 * Run a complete CRUD test for collections
 * @returns {Promise<Object>} Test results
 */
const testCollectionCRUD = async () => {
  try {
    // Create a test collection
    const createResult = await testCreateCollection();
    if (!createResult.success) {
      return {
        success: false,
        stage: 'create',
        error: createResult.errors || createResult.error,
      };
    }
    
    const collectionId = createResult.collectionId;
    logger.info(`Created test collection with ID: ${collectionId}`);
    
    // Query for the collection
    const readQuery = `
      query GetCollection($collectionID: ID!) {
        collection(collectionID: $collectionID) {
          id
          title
        }
      }
    `;
    
    const readResult = await executeGraphQL(readQuery, { collectionID: collectionId });
    if (!readResult.success) {
      return {
        success: false,
        stage: 'read',
        error: readResult.errors || readResult.error,
      };
    }
    
    // Update the collection
    const updateMutation = `
      mutation UpdateCollection($collectionID: ID!, $data: UpdateCollectionInput!) {
        updateCollection(collectionID: $collectionID, data: $data) {
          id
          title
        }
      }
    `;
    
    const updateResult = await executeGraphQL(updateMutation, {
      collectionID: collectionId,
      data: { title: `Updated Collection ${Date.now()}` }
    });
    
    if (!updateResult.success) {
      return {
        success: false,
        stage: 'update',
        error: updateResult.errors || updateResult.error,
      };
    }
    
    // Delete the collection
    const deleteResult = await testDeleteCollection(collectionId);
    if (!deleteResult.success) {
      return {
        success: false,
        stage: 'delete',
        error: deleteResult.errors || deleteResult.error,
      };
    }
    
    // All steps succeeded
    return {
      success: true,
      stages: {
        create: { success: true, duration: createResult.duration },
        read: { success: true, duration: readResult.duration },
        update: { success: true, duration: updateResult.duration },
        delete: { success: true, duration: deleteResult.duration }
      }
    };
  } catch (error) {
    logger.error('Collection CRUD test failed with exception', error);
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  apiClient,
  authenticate,
  checkHealth,
  executeGraphQL,
  getCurrentUser,
  testCreateCollection,
  testDeleteCollection,
  testCollectionCRUD
};
