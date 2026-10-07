import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service.js';

@Controller('api/health')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): { status: string; timestamp: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
