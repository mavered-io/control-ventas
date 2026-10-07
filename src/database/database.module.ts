import { Module, Global } from '@nestjs/common';
import { DatabaseService } from './database.service.js';
import { DatabaseController } from './database.controller.js';

@Global()
@Module({
  controllers: [DatabaseController],
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}
