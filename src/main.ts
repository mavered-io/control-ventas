import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`\n==================================================`);
  console.log(`🚀 Sistema de Control de Ventas Móvil iniciado!`);
  console.log(`📱 Accede desde tu navegador o móvil en:`);
  console.log(`   Local: http://localhost:${port}`);
  console.log(`==================================================\n`);
}
await bootstrap();
