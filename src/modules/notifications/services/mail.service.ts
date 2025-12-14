// src/notifications/services/mail.service.ts
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import * as SibApiV3Sdk from 'sib-api-v3-sdk';
import { ISendPaymentLink } from '../interfaces/send-payment-link.interface';
import { Customer } from '../../customers/entities/customer.entity';
import { ShopifyService } from '../../shopify/services/shopify.service';
import { Order } from '../../order/entities/order.entity';

@Injectable()
export class MailService implements ISendPaymentLink {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly shopifyService: ShopifyService) {}

  /**
   * Envoyer le lien de paiement par email via Brevo
   */
  async sendPaymentLink(
    customer: Customer,
    paymentLink: string,
    order: Order,
  ): Promise<void> {
    const store = order.store;

    if (!store.brevoConfig) {
      throw new Error(`Brevo config not found for store ${store.name}`);
    }

    // Déchiffrer la clé API Brevo
    const apiKey = this.shopifyService.getBrevoApiKey(store);

    // Configurer le client Brevo
    const defaultClient = SibApiV3Sdk.ApiClient.instance;
    const apiKeyAuth = defaultClient.authentications['api-key'];
    apiKeyAuth.apiKey = apiKey;

    const brevoClient = new SibApiV3Sdk.TransactionalEmailsApi();

    // Préparer l'email
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.to = [
      {
        email: customer.email!,
        name: `${customer.firstName} ${customer.lastName}`,
      },
    ];
    sendSmtpEmail.sender = {
      name: store.name,
      email: store.brevoConfig.senderEmail,
    };
    sendSmtpEmail.templateId = store.brevoConfig.templateId;
    sendSmtpEmail.params = {
      name: `${customer.firstName} ${customer.lastName}`,
      amount: order.totalAmount,
      link: paymentLink,
      orderNumber: `${order.shopifyOrderName}`,
    };

    try {
      this.logger.log(`📧 Sending payment link to ${customer.email}`);
      this.logger.log(`Template ID: ${store.brevoConfig.templateId}`);
      this.logger.log(`Params: ${JSON.stringify(sendSmtpEmail.params)}`);

      await brevoClient.sendTransacEmail(sendSmtpEmail);

      this.logger.log(`✅ Email sent successfully to ${customer.email}`);
    } catch (error) {
      const errorMsg = `Failed to send email to ${customer.email}: ${error.message}`;
      this.logger.error(errorMsg);
      this.logger.error(`Error details: ${JSON.stringify(error)}`);

      // Lever une exception pour bloquer le process
      throw new InternalServerErrorException(errorMsg);
    }
  }
}