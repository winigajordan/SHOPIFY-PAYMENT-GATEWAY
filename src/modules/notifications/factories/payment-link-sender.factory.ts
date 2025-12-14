// src/notifications/factories/payment-link-sender.factory.ts
import { Injectable, Logger } from '@nestjs/common';
import { ISendPaymentLink } from '../interfaces/send-payment-link.interface';
import { MailService } from '../services/mail.service';
import { SmsService } from '../services/sms.service';
import { Customer } from '../../customers/entities/customer.entity';
import { ShopifyStore } from '../../shopify/entities/shopify-store.entity';

@Injectable()
export class PaymentLinkSenderFactory {
  private readonly logger = new Logger(PaymentLinkSenderFactory.name);

  constructor(
    private readonly mailService: MailService,
    private readonly smsService: SmsService,
  ) {}

  /**
   * Créer le bon service d'envoi selon le contact du client
   */
  create(customer: Customer, store: ShopifyStore): ISendPaymentLink {
    // Priorité 1 : Email (si présent et brevoConfig configuré)
    if (customer.email && store.brevoConfig) {
      this.logger.log(`📧 Using MailService for customer ${customer.id}`);
      return this.mailService;
    }

    // Priorité 2 : SMS (si pas d'email mais phone présent)
    if (customer.phoneNumber) {
      this.logger.log(`📱 Using SmsService for customer ${customer.id}`);
      return this.smsService;
    }

    // Ne devrait jamais arriver (validation en amont)
    throw new Error(
      `No valid contact method for customer ${customer.id}`,
    );
  }
}