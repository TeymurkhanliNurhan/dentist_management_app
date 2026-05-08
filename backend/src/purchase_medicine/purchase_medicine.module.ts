import { Module } from '@nestjs/common';
import { PurchaseMedicineController } from './purchase_medicine.controller';
import { PurchaseMedicineService } from './purchase_medicine.service';
import { PurchaseMedicineRepository } from './purchase_medicine.repository';

@Module({
  controllers: [PurchaseMedicineController],
  providers: [PurchaseMedicineService, PurchaseMedicineRepository],
})
export class PurchaseMedicineModule {}
