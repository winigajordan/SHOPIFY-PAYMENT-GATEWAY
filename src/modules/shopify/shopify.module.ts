// src/shopify/shopify.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShopifyService } from './shopify.service';
import { ShopifyController } from './shopify.controller';
import { ShopifyWebhookService } from './shopify-webhook.service';
import { ShopifyWebhookController } from './shopify-webhook.controller';
import { ShopifyStore } from './entities/shopify-store.entity';
import { CustomersModule } from '../customers/customers.module';
import { OrdersModule } from '../order/orders.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ShopifyStore]),
    CustomersModule,
    OrdersModule,
  ],
  controllers: [
    ShopifyController,
    ShopifyWebhookController,
  ],
  providers: [
    ShopifyService,
    ShopifyWebhookService,
  ],
  exports: [
    ShopifyService,
    ShopifyWebhookService,
  ],
})
export class ShopifyModule {}