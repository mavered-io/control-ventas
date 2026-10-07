import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import mysql from 'mysql2/promise';
import { DataSource, Repository } from 'typeorm';
import { ProductEntity } from '../products/entities/product.entity.js';
import { SalesRecordEntity } from '../sales/entities/sales-record.entity.js';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  public isConnected = false;
  private dataSource: DataSource | null = null;
  public productRepo: Repository<ProductEntity> | null = null;
  public salesRepo: Repository<SalesRecordEntity> | null = null;

  async onModuleInit() {
    await this.initDatabase();
  }

  async onModuleDestroy() {
    if (this.dataSource && this.dataSource.isInitialized) {
      await this.dataSource.destroy();
    }
  }

  public async initDatabase(): Promise<boolean> {
    const isEnabled = process.env.DB_ENABLED !== 'false';
    if (!isEnabled) {
      this.logger.log('ℹ️ Base de datos MySQL deshabilitada en .env. Usando almacenamiento JSON.');
      this.isConnected = false;
      return false;
    }

    const host = process.env.DB_HOST || 'localhost';
    const port = parseInt(process.env.DB_PORT || '3306', 10);
    const user = process.env.DB_USERNAME || 'root';
    const password = process.env.DB_PASSWORD || '';
    const database = process.env.DB_DATABASE || 'control_ventas';

    try {
      this.logger.log(`Conectando a MySQL en ${host}:${port}...`);
      // 1. Verificar y crear la base de datos si no existe
      const connection = await mysql.createConnection({
        host,
        port,
        user,
        password,
        connectTimeout: 2500,
      });

      await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
      await connection.end();

      // 2. Inicializar TypeORM DataSource
      this.dataSource = new DataSource({
        type: 'mysql',
        host,
        port,
        username: user,
        password,
        database,
        entities: [ProductEntity, SalesRecordEntity],
        synchronize: process.env.DB_SYNCHRONIZE !== 'false',
        logging: false,
      });

      await this.dataSource.initialize();
      this.productRepo = this.dataSource.getRepository(ProductEntity);
      this.salesRepo = this.dataSource.getRepository(SalesRecordEntity);
      this.isConnected = true;

      this.logger.log(`✅ ¡Conexión exitosa a MySQL! Base de datos: '${database}'`);
      return true;
    } catch (err: any) {
      this.isConnected = false;
      this.logger.warn(`⚠️ MySQL no disponible (${err.code || err.message}).`);
      this.logger.warn(`👉 Modo de Respaldo Activo: Usando almacenamiento JSON en disco.`);
      this.logger.warn(`💡 Para usar MySQL: Inicia Apache/MySQL en XAMPP y recarga la página.`);
      return false;
    }
  }

  getStatus() {
    return {
      connected: this.isConnected,
      engine: this.isConnected ? 'MySQL / MariaDB' : 'JSON Local Storage',
      database: process.env.DB_DATABASE || 'control_ventas',
      host: `${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '3306'}`,
    };
  }
}
