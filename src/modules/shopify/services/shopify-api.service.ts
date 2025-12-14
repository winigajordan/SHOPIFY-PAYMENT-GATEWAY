// src/shopify/shopify-api.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Order } from '../../order/entities/order.entity';
import { ShopifyService } from './shopify.service';

@Injectable()
export class ShopifyApiService {
  private readonly logger = new Logger(ShopifyApiService.name);
  private readonly apiVersion = '2025-01'; // Version GraphQL

  constructor(
    private readonly shopifyService: ShopifyService,
  ) {
  }

  /**
   * Marquer une commande Shopify comme payée via GraphQL
   */
  async markOrderAsPaid(order: Order): Promise<void> {
    const store = order.store;
    const shopDomain = store.shopDomain;

    // Déchiffrer l'access token
    const accessToken = this.shopifyService.getAccessToken(store);

    // Shopify utilise un ID global au format: gid://shopify/Order/{id}
    const shopifyGlobalId = `gid://shopify/Order/${order.shopifyOrderId}`;

    this.logger.log(`Marking Shopify order ${order.shopifyOrderId} as paid`);

    // URL de l'API GraphQL Shopify
    const url = `https://${shopDomain}/admin/api/${this.apiVersion}/graphql.json`;

    // Mutation GraphQL pour marquer comme payé
    const mutation = `
      mutation orderMarkAsPaid($input: OrderMarkAsPaidInput!) {
        orderMarkAsPaid(input: $input) {
          order {
            id
            name
            displayFinancialStatus
            totalPrice
            transactions(first: 10) {
              id
              kind
              status
              amountSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
              gateway
              createdAt
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const variables = {
      input: {
        id: shopifyGlobalId,
      },
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': accessToken,
        },
        body: JSON.stringify({
          query: mutation,
          variables,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Shopify API error: ${response.status} - ${errorText}`);
        throw new Error(`Shopify API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      // Vérifier les erreurs GraphQL
      if (data.errors) {
        this.logger.error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
        throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
      }

      // Vérifier les userErrors
      if (data.data?.orderMarkAsPaid?.userErrors?.length > 0) {
        const errors = data.data.orderMarkAsPaid.userErrors;
        this.logger.error(`User errors: ${JSON.stringify(errors)}`);
        throw new Error(`User errors: ${errors.map((e: any) => e.message).join(', ')}`);
      }

      const orderData = data.data?.orderMarkAsPaid?.order;

      if (!orderData) {
        throw new Error('No order data returned from Shopify');
      }

      this.logger.log(`✅ Shopify order ${order.shopifyOrderId} marked as paid`);
      this.logger.log(`Financial Status: ${orderData.displayFinancialStatus}`);
      this.logger.log(`Total Price: ${orderData.totalPrice}`);

      // Logger les transactions créées
      if (orderData.transactions?.length > 0) {
        const latestTransaction = orderData.transactions[0];
        this.logger.log(`Transaction created: ${latestTransaction.id}`);
        this.logger.log(`Kind: ${latestTransaction.kind}, Status: ${latestTransaction.status}`);
      }
    } catch (error) {
      this.logger.error(`Failed to mark Shopify order as paid: ${error.message}`);
      throw error;
    }
  }

  /**
   * Marquer une commande Shopify comme échouée (paiement failed)
   * On ne peut pas directement marquer comme "failed" via GraphQL,
   * mais on peut annuler la commande avec une raison
   */
  async markOrderAsFailed(order: Order, reason: string = 'Payment failed'): Promise<void> {
    const store = order.store;
    const shopDomain = store.shopDomain;

    // Déchiffrer l'access token
    const accessToken = this.shopifyService.getAccessToken(store);

    const shopifyGlobalId = `gid://shopify/Order/${order.shopifyOrderId}`;

    this.logger.log(`Marking Shopify order ${order.shopifyOrderId} as failed`);

    const url = `https://${shopDomain}/admin/api/${this.apiVersion}/graphql.json`;

    // On va annuler la commande avec une raison
    const mutation = `
      mutation orderCancel($orderId: ID!, $reason: OrderCancelReason!, $notifyCustomer: Boolean!, $refund: Boolean!) {
        orderCancel(orderId: $orderId, reason: $reason, notifyCustomer: $notifyCustomer, refund: $refund) {
          orderCancelUserErrors {
            field
            message
          }
          job {
            id
            done
          }
        }
      }
    `;

    const variables = {
      orderId: shopifyGlobalId,
      reason: 'OTHER', // Raisons possibles: CUSTOMER, INVENTORY, FRAUD, DECLINED, OTHER
      notifyCustomer: false,
      refund: false, // Pas de remboursement car le paiement n'a pas été effectué
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': accessToken,
        },
        body: JSON.stringify({
          query: mutation,
          variables,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Shopify API error: ${response.status} - ${errorText}`);
        throw new Error(`Shopify API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      if (data.errors) {
        this.logger.error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
        throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
      }

      if (data.data?.orderCancel?.orderCancelUserErrors?.length > 0) {
        const errors = data.data.orderCancel.orderCancelUserErrors;
        this.logger.error(`User errors: ${JSON.stringify(errors)}`);
        throw new Error(`User errors: ${errors.map((e: any) => e.message).join(', ')}`);
      }

      this.logger.log(`✅ Shopify order ${order.shopifyOrderId} cancelled (payment failed)`);

      // Ajouter une note pour expliquer pourquoi
      await this.addNoteToOrder(order, `Commande annulée - ${reason} - ${new Date().toISOString()}`);
    } catch (error) {
      this.logger.error(`Failed to cancel Shopify order: ${error.message}`);
      throw error;
    }
  }

  /**
   * Ajouter une note à une commande Shopify via GraphQL
   */
  async addNoteToOrder(order: Order, note: string): Promise<void> {
    const store = order.store;
    const shopDomain = store.shopDomain;

    // Déchiffrer l'access token
    const accessToken = this.shopifyService.getAccessToken(store);

    const shopifyGlobalId = `gid://shopify/Order/${order.shopifyOrderId}`;

    this.logger.log(`Adding note to Shopify order ${order.shopifyOrderId}`);

    const url = `https://${shopDomain}/admin/api/${this.apiVersion}/graphql.json`;

    // Mutation GraphQL pour ajouter une note
    const mutation = `
      mutation orderUpdate($input: OrderInput!) {
        orderUpdate(input: $input) {
          order {
            id
            name
            note
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const variables = {
      input: {
        id: shopifyGlobalId,
        note: note,
      },
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': accessToken,
        },
        body: JSON.stringify({
          query: mutation,
          variables,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Shopify API error: ${response.status} - ${errorText}`);
        throw new Error(`Shopify API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      if (data.errors) {
        this.logger.error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
        throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
      }

      if (data.data?.orderUpdate?.userErrors?.length > 0) {
        const errors = data.data.orderUpdate.userErrors;
        this.logger.error(`User errors: ${JSON.stringify(errors)}`);
        throw new Error(`User errors: ${errors.map((e: any) => e.message).join(', ')}`);
      }

      this.logger.log(`✅ Note added to Shopify order ${order.shopifyOrderId}`);
    } catch (error) {
      this.logger.error(`Failed to add note to Shopify order: ${error.message}`);
      throw error;
    }
  }

  /**
   * Ajouter un tag à une commande Shopify
   */
  async addTagToOrder(order: Order, tag: string): Promise<void> {
    const store = order.store;
    const shopDomain = store.shopDomain;
    // Déchiffrer l'access token
    const accessToken = this.shopifyService.getAccessToken(store);

    const shopifyGlobalId = `gid://shopify/Order/${order.shopifyOrderId}`;

    this.logger.log(`Adding tag "${tag}" to Shopify order ${order.shopifyOrderId}`);

    const url = `https://${shopDomain}/admin/api/${this.apiVersion}/graphql.json`;

    // Mutation GraphQL pour ajouter un tag
    const mutation = `
      mutation tagsAdd($id: ID!, $tags: [String!]!) {
        tagsAdd(id: $id, tags: $tags) {
          node {
            id
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const variables = {
      id: shopifyGlobalId,
      tags: [tag],
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': accessToken,
        },
        body: JSON.stringify({
          query: mutation,
          variables,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Shopify API error: ${response.status} - ${errorText}`);
        throw new Error(`Shopify API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      if (data.errors) {
        this.logger.error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
        throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
      }

      if (data.data?.tagsAdd?.userErrors?.length > 0) {
        const errors = data.data.tagsAdd.userErrors;
        this.logger.error(`User errors: ${JSON.stringify(errors)}`);
        throw new Error(`User errors: ${errors.map((e: any) => e.message).join(', ')}`);
      }

      this.logger.log(`✅ Tag "${tag}" added to Shopify order ${order.shopifyOrderId}`);
    } catch (error) {
      this.logger.error(`Failed to add tag to Shopify order: ${error.message}`);
      throw error;
    }
  }

  /**
   * Marquer la commande comme payée ET ajouter une note
   */
  async markOrderAsPaidWithNote(order: Order, paymentProvider: string = 'Bictorys'): Promise<void> {
    // 1. Marquer comme payée
    await this.markOrderAsPaid(order);

    // 2. Ajouter une note
    const note = `Paiement reçu via ${paymentProvider} le ${new Date().toISOString()}`;
    await this.addNoteToOrder(order, note);

    // 3. Optionnel : Ajouter un tag
    await this.addTagToOrder(order, `paid-via-${paymentProvider.toLowerCase()}`);

    this.logger.log(`✅ Shopify order ${order.shopifyOrderId} updated successfully`);
  }

  /**
   * Marquer la commande comme échouée avec note et tag

  async markOrderAsFailedWithNote(order: Order, reason: string = 'Payment failed via Bictorys'): Promise<void> {
    // 1. Annuler la commande
    await this.markOrderAsFailed(order, reason);

    // 2. Ajouter un tag
    try {
      await this.addTagToOrder(order, 'payment-failed');
    } catch (error) {
      this.logger.error(`Failed to add tag: ${error.message}`);
      // Continue quand même
    }

    this.logger.log(`✅ Shopify order ${order.shopifyOrderId} marked as failed`);
  }

   */
}