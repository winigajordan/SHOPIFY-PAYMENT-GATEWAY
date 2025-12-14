// src/bictorys/bictorys.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { BictorysService } from './bictorys.service';
import { BictorysController } from './bictorys.controller';
import { ShopifyModule } from '../shopify/shopify.module';
import { PaymentsModule } from '../payments/payments.module';
import { OrdersModule } from '../order/orders.module';

@Module({
  imports: [
    forwardRef(() => ShopifyModule),
    PaymentsModule,
    OrdersModule
  ],
  controllers: [BictorysController],
  providers: [BictorysService],
  exports: [BictorysService]
})
export class BictorysModule {}