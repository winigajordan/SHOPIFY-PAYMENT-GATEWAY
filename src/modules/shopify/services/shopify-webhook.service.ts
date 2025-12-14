// src/shopify/shopify-webhook.service.ts
import { Injectable, Logger, BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';
import { ShopifyService } from './shopify.service';
import { CustomersService } from '../../customers/customers.service';
import { ShopifyOrderWebhookDto } from '../dto/hopify-order-webhook.dto';
import { PaymentMethod } from '../enum/payment-method.enum';
import { OrdersService } from '../../order/order.service';
import { PaymentsService } from '../../payments/payments.service';
import { BictorysService } from '../../bictorys/bictorys.service';
import { PaymentLinkSenderFactory } from '../../notifications/factories/payment-link-sender.factory';

interface ProcessWebhookParams {
  hmacHeader: string;
  shopDomain: string;
  topic: string;
  rawBody: string;
  payload: any;
}

export interface ProcessWebhookResult {
  success: boolean;
  message: string;
  orderNumber?: number;
}

@Injectable()
export class ShopifyWebhookService {
  private readonly logger = new Logger(ShopifyWebhookService.name);

  constructor(
    private readonly shopifyService: ShopifyService,
    private readonly customersService: CustomersService,
    private readonly ordersService: OrdersService,
    private readonly paymentsService: PaymentsService,
    private readonly bictorysService: BictorysService,
    private readonly paymentLinkSenderFactory: PaymentLinkSenderFactory, // ← Ajouter


  ) {}

  /**
   * MÉTHODE PRINCIPALE : Traiter un webhook order/create
   */
  async processOrderCreateWebhook(params: ProcessWebhookParams): Promise<ProcessWebhookResult> {
    const { hmacHeader, shopDomain, topic, rawBody, payload } = params;

    try {

      // 1. Vérifier le topic
      if (topic !== 'orders/create') {
        throw new BadRequestException('Invalid topic');
      }

      // 1. Vérifier headers requis
      if (!hmacHeader || !shopDomain) {
        throw new BadRequestException('Missing required Shopify headers');
      }

      // 2. Vérifier raw body
      if (!rawBody) {
        throw new BadRequestException('Raw body not available');
      }

      // 3. Trouver la boutique
      let store;
      try {
        store = await this.shopifyService.findByDomain(shopDomain);
      } catch (error) {
        throw new UnauthorizedException(`Store not found: ${shopDomain}`);
      }

      // 4. SKIP HMAC pour le moment (à réactiver plus tard)
      this.logger.warn('⚠️ HMAC verification SKIPPED for testing');
      /*
      const isValidSignature = this.verifyWebhookSignature(
        rawBody,
        hmacHeader,
        store.webhookSecret,
      );

      if (!isValidSignature) {
        throw new UnauthorizedException('Invalid webhook signature');
      }
      */

      this.logger.log(`✅ Store found: ${shopDomain}`);

      // 5. Parser le payload
      const parsedPayload = this.parseOrderPayload(payload);

      // 6. Traiter la commande
      await this.handleOrderCreate(parsedPayload, shopDomain);

      return {
        success: true,
        message: 'Webhook processed successfully',
        orderNumber: parsedPayload.order_number,
      };

    } catch (error) {
      this.logger.error('Error processing webhook:', error.message);

      return {
        success: false,
        message: error.message || 'Error processing webhook',
      };
    }
  }

  /**
   * Vérifier la signature HMAC
   */
  verifyWebhookSignature(
    rawBody: string,
    hmacHeader: string,
    webhookSecret: string,
  ): boolean {
    if (!rawBody || !hmacHeader || !webhookSecret) {
      this.logger.warn('Missing parameters for HMAC verification');
      return false;
    }

    try {
      const calculatedHmac = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody, 'utf8')
        .digest('base64');

      return crypto.timingSafeEqual(
        Buffer.from(calculatedHmac),
        Buffer.from(hmacHeader),
      );
    } catch (error) {
      this.logger.error('Error verifying HMAC signature', error);
      return false;
    }
  }

  /**
   * Parser le payload
   */
  parseOrderPayload(payload: any): ShopifyOrderWebhookDto {
    if (!payload.id || !payload.order_number) {
      throw new BadRequestException('Invalid Shopify order payload: missing required fields');
    }

    this.logger.log(`Parsing order #${payload.order_number} (ID: ${payload.id})`);
    return payload as ShopifyOrderWebhookDto;
  }

  /**
   * Extraire le téléphone
   */
  extractPhoneNumber(payload: ShopifyOrderWebhookDto): string | null {
    if (payload.customer?.phone) {
      return payload.customer.phone;
    }

    if (payload.phone) {
      return payload.phone;
    }

    return null;
  }

  /**
   * Extraire l'email
   */
  extractEmail(payload: ShopifyOrderWebhookDto): string | null {
    if (payload.customer?.email) {
      return payload.customer.email;
    }

    if (payload.email) {
      return payload.email;
    }

    return null;
  }

  /**
   * Extraire le moyen de paiement (STRICT - doit retourner un résultat)
   */
  extractPaymentMethod(payload: ShopifyOrderWebhookDto): PaymentMethod {
    // 1. Chercher dans payment_gateway_names
    if (payload.payment_gateway_names && payload.payment_gateway_names.length > 0) {
      const gateway = payload.payment_gateway_names[0].toLowerCase();
      
      if (gateway.includes('wave')) {
        return PaymentMethod.WAVE;
      }
      
      if (gateway.includes('orange') || gateway.includes('om')) {
        return PaymentMethod.ORANGE_MONEY;
      }

      if (gateway.includes('bictorys')) {
        return PaymentMethod.BICTORYS;
      }



      /*
      // Si COD, chercher dans note_attributes
      if (gateway.includes('cod') || gateway.includes('cash on delivery')) {
        const methodFromNotes = this.extractFromNoteAttributes(payload);
        if (methodFromNotes) {
          return methodFromNotes;
        }
      }

       */
    }

    /*
    // 2. Alternative : note_attributes
    const methodFromNotes = this.extractFromNoteAttributes(payload);
    if (methodFromNotes) {
      return methodFromNotes;
    }

     */

    // 3. Aucun moyen de paiement trouvé → ERREUR
    throw new BadRequestException(
      `Could not determine payment method for order #${payload.order_number}. ` +
      `Payment gateway: ${payload.payment_gateway_names?.join(', ') || 'none'}`
    );
  }

  /**
   * Extraire depuis note_attributes

  private extractFromNoteAttributes(payload: ShopifyOrderWebhookDto): PaymentMethod | null {
    if (payload.note_attributes && payload.note_attributes.length > 0) {
      const paymentNote = payload.note_attributes.find(
        (attr: any) => 
          attr.name === 'payment_method' || 
          attr.name === 'moyen_paiement' ||
          attr.name === 'mode_paiement',
      );

      if (paymentNote) {
        const value = paymentNote.value.toLowerCase();
        
        if (value.includes('wave')) {
          return PaymentMethod.WAVE;
        }
        
        if (value.includes('orange') || value.includes('om')) {
          return PaymentMethod.ORANGE_MONEY;
        }

        if (value.includes('Bictorys')) {
          return PaymentMethod.BICTORYS;
        }
      }
    }

    return null;
  }
   */
  /**
   * Valider la commande (STRICT)
   */
  validateOrderForPayment(payload: ShopifyOrderWebhookDto): void {
    const phoneNumber = this.extractPhoneNumber(payload);
    const email = this.extractEmail(payload);

    // 1. Vérifier qu'au moins un contact existe (OBLIGATOIRE)
    if (!phoneNumber && !email) {
      throw new BadRequestException(
        `Order #${payload.order_number} rejected: Customer must have at least email or phone number`
      );
    }

    // 2. Vérifier le moyen de paiement (OBLIGATOIRE - throw si non trouvé)
    // Cette méthode throw automatiquement si non trouvé
    this.extractPaymentMethod(payload);

    this.logger.log(`✅ Order #${payload.order_number} validation passed`);
  }

  /**
   * Traiter la commande
   */
  async handleOrderCreate(
    payload: ShopifyOrderWebhookDto,
    shopDomain: string,
  ): Promise<void> {
    this.logger.log(`Processing order/create for ${shopDomain}`);
    this.logger.log(`Order #${payload.order_number} - ${payload.total_price} ${payload.currency}`);

    // 1. Validation STRICTE (throw si échec)
    try {
      this.validateOrderForPayment(payload);
    } catch (error) {
      this.logger.error(`❌ Order #${payload.order_number} validation failed: ${error.message}`);
      throw error; // Propagate l'erreur pour retourner success: false
    }

    // 2. Extraire les infos (on sait qu'elles sont valides maintenant)
    const phoneNumber = this.extractPhoneNumber(payload);
    const email = this.extractEmail(payload);
    const paymentMethod = this.extractPaymentMethod(payload); // Ne throw plus car déjà validé

    this.logger.log(`✅ Payment method: ${paymentMethod}`);
    this.logger.log(`✅ Contact: ${phoneNumber ? `Phone: ${phoneNumber}` : `Email: ${email}`}`);

    // 3. Trouver le store
    const store = await this.shopifyService.findByDomain(shopDomain);

    // 4. Créer/récupérer le customer
    const customer = await this.customersService.findOrCreateFromShopify(
      payload.customer,
      phoneNumber,
      email,
      store,
    );

    this.logger.log(`✅ Customer: ${customer.firstName} ${customer.lastName} (${customer.id})`);

    // 5. Créer la commande
    const order = await this.ordersService.createFromShopifyPayload(
      payload,
      store,
      customer,
      paymentMethod,
    );

    this.logger.log(`✅ Order created: ${order.shopifyOrderName} (${order.id})`); // ← CHANGÉ
    this.logger.log(`💰 Amount: ${order.totalAmount} ${order.currency}`);
    this.logger.log(`📊 Status: ${order.status}`);
    this.logger.log(`🔗 Order status URL: ${order.orderStatusUrl}`);

    // 6. Créer PaymentTransaction
    const paymentTransaction = await this.paymentsService.createPaymentForOrder(order);

    this.logger.log(`✅ Payment transaction created: ${paymentTransaction.id}`);
    this.logger.log(`📱 Channel: ${paymentTransaction.paymentChannel}`);
    this.logger.log(`📊 Status: ${paymentTransaction.status}`);


    // 7. Générer le lien de paiement Bictorys
    let bictorysResponse;
    try {
      bictorysResponse = await this.bictorysService.createPaymentLink(paymentTransaction);

      // 8. Mettre à jour la transaction avec le lien
      await this.paymentsService.updateWithPaymentLink(
        paymentTransaction.id,
        bictorysResponse.link,
        bictorysResponse.chargeId,
      );

      this.logger.log(`✅ Payment link generated: ${bictorysResponse.link}`);
    } catch (error) {
      this.logger.error(`❌ Failed to generate payment link: ${error.message}`);

      await this.paymentsService.markAsFailed(
        paymentTransaction.id,
        `Failed to generate payment link: ${error.message}`,
      );

      throw error;
    }

    // 9. Envoyer le lien au client (Email ou SMS)
    // ❌ SUPPRIMÉ le try/catch pour que l'exception remonte
    const sender = this.paymentLinkSenderFactory.create(customer, store);
    await sender.sendPaymentLink(customer, bictorysResponse.link, order);
    this.logger.log('✅ Payment link sent to customer');

    this.logger.log(`✅ Order #${payload.order_number} processed successfully`);



    // TODO: Envoyer le lien au client (SMS ou Email)

    this.logger.log(`✅ Order #${payload.order_number} processed successfully`);
  }
}