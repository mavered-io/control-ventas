import { Controller, Get, Post, Delete, Body, Param, NotFoundException } from '@nestjs/common';
import { SalesService } from './sales.service.js';
import { ControlVentasRecord } from './sales.interface.js';

@Controller('api/sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Get()
  async getAll(): Promise<ControlVentasRecord[]> {
    return this.salesService.getAllRecords();
  }

  @Get('sample/image')
  getSample() {
    return this.salesService.getSampleFromImage();
  }

  @Get(':id')
  async getById(@Param('id') id: string): Promise<ControlVentasRecord> {
    const record = await this.salesService.getRecordById(id);
    if (!record) {
      throw new NotFoundException(`Registro con id ${id} no encontrado`);
    }
    return record;
  }

  @Post('calculate')
  calculate(@Body() body: any) {
    return this.salesService.calculateSummary(body);
  }

  @Post()
  async save(@Body() body: Partial<ControlVentasRecord>): Promise<ControlVentasRecord> {
    return this.salesService.saveRecord(body);
  }

  @Delete(':id')
  async delete(@Param('id') id: string): Promise<{ success: boolean }> {
    const success = await this.salesService.deleteRecord(id);
    return { success };
  }
}
