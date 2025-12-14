// src/notifications/notifications.module.ts
import { forwardRef, Module } from '@nestjs/common';
import { MailService } from './services/mail.service';
import { SmsService } from './services/sms.service';
import { PaymentLinkSenderFactory } from './factories/payment-link-sender.factory';
import { ShopifyModule } from '../shopify/shopify.module';

@Module({
  imports: [
    forwardRef(() => ShopifyModule)
  ], // Pour accéder à ShopifyService (déchiffrement)
  providers: [
    MailService,
    SmsService,
    PaymentLinkSenderFactory,
  ],
  exports: [PaymentLinkSenderFactory],
})
export class NotificationsModule {}