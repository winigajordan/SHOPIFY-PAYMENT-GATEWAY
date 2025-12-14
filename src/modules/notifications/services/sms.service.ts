// src/notifications/services/sms.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ISendPaymentLink } from '../interfaces/send-payment-link.interface';
import { Customer } from '../../customers/entities/customer.entity';
import { Order } from '../../order/entities/order.entity';

@Injectable()
export class SmsService implements ISendPaymentLink {
  private readonly logger = new Logger(SmsService.name);

  /**
   * Envoyer le lien de paiement par SMS (placeholder)
   */
  async sendPaymentLink(
    customer: Customer,
    paymentLink: string,
    order: Order,
  ): Promise<void> {
    this.logger.log('📱 SMS SENDING (PLACEHOLDER)');
    this.logger.log(`To: ${customer.phoneNumber}`);
    this.logger.log(`Order: #${order.shopifyOrderName}`);
    this.logger.log(`Amount: ${order.totalAmount} ${order.currency}`);
    this.logger.log(`Link: ${paymentLink}`);
    this.logger.log('✅ SMS logged (not actually sent yet)');

    // TODO: Implémenter l'envoi SMS réel plus tard
  }
}