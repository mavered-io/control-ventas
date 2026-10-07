import { Controller, Get, Post } from '@nestjs/common';
import { DatabaseService } from './database.service.js';

@Controller('api/database')
export class DatabaseController {
  constructor(private readonly dbService: DatabaseService) {}

  @Get('status')
  getStatus() {
    return this.dbService.getStatus();
  }

  @Post('reconnect')
  async reconnect() {
    const success = await this.dbService.initDatabase();
    return {
      success,
      ...this.dbService.getStatus(),
    };
  }
}
