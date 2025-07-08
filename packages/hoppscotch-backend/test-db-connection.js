// test-db-connection.js
const { PrismaClient } = require('@prisma/client');

async function testConnection() {
  console.log('Attempting to connect to the database...');
  
  try {
    const prisma = new PrismaClient({
      log: ['query', 'info', 'warn', 'error'],
    });
    
    console.log('PrismaClient instance created.');
    
    // Test connection
    await prisma.$connect();
    console.log('Connected to database successfully!');
    
    // Disconnect
    await prisma.$disconnect();
    console.log('Disconnected from database.');
    
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}

testConnection()
  .then((success) => {
    console.log('Test completed:', success ? 'SUCCESS' : 'FAILED');
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
