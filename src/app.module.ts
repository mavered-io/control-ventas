import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import * as path from 'path';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { DatabaseModule } from './database/database.module.js';
import { SalesModule } from './sales/sales.module.js';
import { ProductsModule } from './products/products.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ServeStaticModule.forRoot({
      rootPath: path.join(process.cwd(), 'public'),
    }),
    DatabaseModule,
    SalesModule,
    ProductsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
