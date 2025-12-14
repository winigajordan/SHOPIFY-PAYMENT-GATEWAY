// src/bictorys/bictorys.service.ts
import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentTransaction } from '../payments/entities/payment-transaction.entity';
import { ShopifyService } from '../shopify/services/shopify.service';
import { BictorysCreateChargeDto } from './dto/bictorys-create-charge.dto';
import { BictorysChargeResponseDto } from './dto/bictorys-charge-response.dto';
import { BictorysOrderDetailDto } from './dto/bictorys-order-detail.dto';
import { BictorysCustomerDto } from './dto/bictorys-customer.dto';
import { BictorysWebhookDto } from './dto/bictorys-webhook.dto';
import { OrdersService } from '../order/order.service';
import { PaymentsService } from '../payments/payments.service';
import { ShopifyApiService } from '../shopify/services/shopify-api.service';

@Injectable()
export class BictorysService {
  private readonly logger = new Logger(BictorysService.name);
  private readonly apiUrl: string;
  private readonly paymentPath : string;

  constructor(
    private readonly configService: ConfigService,
    private readonly shopifyService: ShopifyService,
    private readonly ordersService: OrdersService,
    private readonly paymentsService: PaymentsService,
   private readonly shopifyApiService: ShopifyApiService,
) {
    // URL de l'API Bictorys (test ou prod selon l'env)
    this.apiUrl = this.configService.get('bictorys').key;
    this.paymentPath = this.configService.get('bictorys').paymentPath;
  }


// src/bictorys/bictorys.service.ts (partie handlePaymentWebhook)

  // src/bictorys/bictorys.service.ts

  async handlePaymentWebhook(payload: BictorysWebhookDto): Promise<void> {
    const { status, paymentReference, id: webhookId } = payload;

    this.logger.log(`Processing webhook ${webhookId} - Status: ${status}`);
    this.logger.log(`Payment reference received: ${paymentReference}`);

    // Ignorer les statuts autres que "succeeded" et "failed"
    if (status !== 'succeeded' && status !== 'failed') {
      this.logger.log(`⏭️ Ignoring webhook with status: ${status}`);
      return;
    }

    // Rajouter le # au début
    const orderName = `#${paymentReference}`; // ← NOUVEAU : #EDEN-1018

    this.logger.log(`Looking for order: ${orderName}`);

    // Retrouver la commande via le nom
    let order;
    try {
      order = await this.ordersService.findByShopifyOrderName(orderName);
    } catch (error) {
      this.logger.error(`Order not found for name: ${orderName}`);
      throw new NotFoundException(`Order not found for name: ${orderName}`);
    }

    this.logger.log(`Order found: ${order.shopifyOrderName} (${order.id})`);

    // Retrouver la transaction
    const transactions = await this.paymentsService.findByOrder(order.id);

    if (!transactions || transactions.length === 0) {
      this.logger.error(`No payment transaction found for order ${order.id}`);
      throw new NotFoundException(`No payment transaction found for order ${order.id}`);
    }

    const transaction = transactions[0];

    this.logger.log(`Payment transaction found: ${transaction.id}`);
    this.logger.log(`Current status: ${transaction.status}`);

    // Traiter selon le statut
    if (status === 'succeeded') {
      this.logger.log('✅ Payment SUCCEEDED');

      await this.paymentsService.markAsSuccess(transaction.id, payload.id);

      await this.ordersService.markAsPaid(order.id);

      this.logger.log(`✅ Order ${order.shopifyOrderName} marked as PAID`);

      // Mettre à jour la commande Shopify
      try {
        await this.shopifyApiService.markOrderAsPaidWithNote(order, 'Bictorys');
        this.logger.log(`✅ Shopify order ${order.shopifyOrderId} marked as PAID`);
      } catch (error) {
        this.logger.error(`❌ Failed to update Shopify order: ${error.message}`);
        // Continue quand même
      }

    } else if (status === 'failed') {
      this.logger.log('❌ Payment FAILED');

      await this.paymentsService.markAsFailed(
        transaction.id,
        `Payment failed via Bictorys webhook`,
      );

      await this.ordersService.markAsFailed(order.id);

      this.logger.log(`❌ Order ${order.shopifyOrderName} marked as FAILED (internal only)`);
      this.logger.log(`⏭️ Shopify order not modified (payment failed)`);
    }

    this.logger.log(`✅ Webhook ${webhookId} processed successfully`);
  }





  async createPaymentLink(
    transaction: PaymentTransaction,
  ): Promise<BictorysChargeResponseDto> {
    this.logger.log(`Creating Bictorys payment link for transaction ${transaction.id}`);

    const order = transaction.order;
    const store = order.store;
    const customer = order.customer;

    const apiKey = this.shopifyService.getBictorysApiKey(store);

    const orderDetails: BictorysOrderDetailDto[] = order.lineItems?.map(item => ({
      name: item.name,
      price: item.price,
      quantity: item.quantity,
    })) || [];

    const customerObject: BictorysCustomerDto = {
      name: `${customer.firstName} ${customer.lastName}`,
      phone: customer.phoneNumber || '',
      email: customer.email || '',
    };

    // Retirer le # du nom de la commande pour Bictorys
    const paymentReference = order.shopifyOrderName.replace('#', ''); // ← NOUVEAU

    this.logger.log(`Order name: ${order.shopifyOrderName}`);
    this.logger.log(`Payment reference (without #): ${paymentReference}`);

    const payload: BictorysCreateChargeDto = {
      amount: Math.round(transaction.amount),
      currency: transaction.currency.toLowerCase(),
      paymentReference, // ← EDEN-1018 (sans le #)
      successRedirectUrl: order.orderStatusUrl || 'https://google.com',
      orderDetails,
      customerObject,
    };

    this.logger.log(`Bictorys payload: ${JSON.stringify(payload, null, 2)}`);

    try {
      const response = await fetch(
        `${this.apiUrl}/pay/v1/charges?payment_type=card`,
        {
          method: 'POST',
          headers: {
            'accept': 'application/json',
            'content-type': 'application/json',
            'X-API-Key': apiKey,
          },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Bictorys API error: ${response.status} - ${errorText}`);
        throw new BadRequestException(
          `Bictorys API error: ${response.status} - ${errorText}`,
        );
      }

      const data: BictorysChargeResponseDto = await response.json();

      this.logger.log(`✅ Bictorys payment link created: ${data.link}`);
      this.logger.log(`Charge ID: ${data.chargeId}`);

      return data;
    } catch (error) {
      this.logger.error(`Failed to create Bictorys payment link: ${error.message}`);
      throw error;
    }
  }
  /**
   * Vérifier le statut d'un paiement Bictorys
   */
  async checkPaymentStatus(chargeId: string, apiKey: string): Promise<any> {
    this.logger.log(`Checking payment status for charge ${chargeId}`);

    try {
      const response = await fetch(
        `${this.apiUrl}/pay/v1/charges/${chargeId}`,
        {
          method: 'GET',
          headers: {
            'accept': 'application/json',
            'X-API-Key': apiKey,
          },
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Bictorys API error: ${response.status} - ${errorText}`);
        throw new BadRequestException(
          `Bictorys API error: ${response.status} - ${errorText}`,
        );
      }

      const data = await response.json();

      this.logger.log(`Payment status: ${JSON.stringify(data)}`);

      return data;
    } catch (error) {
      this.logger.error(`Failed to check payment status: ${error.message}`);
      throw error;
    }
  }
}