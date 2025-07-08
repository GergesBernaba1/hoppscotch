import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// Fix for missing enableTracing field error
const globalForPrisma = global as unknown as {
  prisma: PrismaClient | undefined;
};

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      log: ['error', 'warn'],
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      console.log('Successfully connected to SQL Server database');
    } catch (error) {
      console.error('Failed to connect to the database:', error);
      
      // Provide detailed error info for troubleshooting
      if (error.message && error.message.includes('enableTracing')) {
        console.error('This is a known issue with Prisma client initialization. Please check your Prisma configuration.');
      }
      
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
