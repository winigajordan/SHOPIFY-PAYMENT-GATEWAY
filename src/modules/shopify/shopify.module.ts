// src/shopify/shopify.module.ts
import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShopifyService } from './services/shopify.service';
import { ShopifyController } from './shopify.controller';
import { ShopifyWebhookService } from './services/shopify-webhook.service';
import { ShopifyWebhookController } from './shopify-webhook.controller';
import { ShopifyStore } from './entities/shopify-store.entity';
import { CustomersModule } from '../customers/customers.module';
import { OrdersModule } from '../order/orders.module';
import { PaymentsModule } from '../payments/payments.module';
import { CommonModule } from '../common/common.module';
import { BictorysModule } from '../bictorys/bictorys.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ShopifyApiService } from './services/shopify-api.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ShopifyStore]),
    CustomersModule,
    OrdersModule,
    PaymentsModule,
    CommonModule,
    forwardRef(() => BictorysModule),
    forwardRef(() => NotificationsModule)
  ],
  controllers: [
    ShopifyController,
    ShopifyWebhookController,
  ],
  providers: [
    ShopifyService,
    ShopifyApiService,
    ShopifyWebhookService,
  ],
  exports: [
    ShopifyService,
    ShopifyWebhookService,
    ShopifyApiService
  ],
})
export class ShopifyModule {}