import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super();
  }
  async onModuleInit() {
    try {
      await this.$connect();
      console.log('✅ Database connected successfully');
    } catch (error) {
      console.warn('⚠️  Database connection failed:', error.message);
      console.warn('⚠️  The app will start but database operations will fail');
      console.warn('⚠️  To fix this, start SQL Server or set DATABASE_URL');
    }
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
    } catch (error) {
      console.warn('⚠️  Error disconnecting from database:', error.message);
    }
  }
}
