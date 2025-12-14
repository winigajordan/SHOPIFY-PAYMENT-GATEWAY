// src/orders/orders.service.ts
import { 
  Injectable, 
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from './entities/order.entity';
import { ShopifyStore } from '../shopify/entities/shopify-store.entity';
import { Customer } from '../customers/entities/customer.entity';
import { PaymentMethod } from '../shopify/enum/payment-method.enum';
import { OrderStatus } from './enum/order-status.enum';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) {}


  /**
   * Extraire les line items du payload Shopify
   */
  private extractLineItems(payload: any): Array<{ name: string; price: number; quantity: number }> {
    if (!payload.line_items || !Array.isArray(payload.line_items)) {
      return [];
    }

    return payload.line_items.map((item: any) => ({
      name: item.name || item.title || 'Unknown Product',
      price: parseFloat(item.price || '0'),
      quantity: item.quantity || 1,
    }));
  }

  /**
   * Créer une commande depuis un webhook Shopify
   */
  async createFromShopifyPayload(
    payload: any,
    store: ShopifyStore,
    customer: Customer,
    paymentMethod: PaymentMethod,
  ): Promise<Order> {
    const shopifyOrderId = String(payload.id);
    const shopifyOrderName = payload.name;

    // Vérifier si la commande existe déjà (idempotence)
    const existing = await this.orderRepository.findOne({
      where: { shopifyOrderId },
    });

    if (existing) {
      throw new ConflictException(`Order ${shopifyOrderId} already exists`);
    }

    // Extraire les line items
    const lineItems = this.extractLineItems(payload);

    // Créer la commande
    this.logger.log(`Creating order #${payload.order_number} (${shopifyOrderId})`);
    this.logger.log(`Line items: ${lineItems.length} products`);


    const order = this.orderRepository.create({
      shopifyOrderId,
      shopifyOrderName,
      store,
      customer,
      totalAmount: parseFloat(payload.total_price),
      currency: payload.currency,
      paymentMethod,
      status: OrderStatus.PENDING_PAYMENT,
      orderStatusUrl: payload.order_status_url || null, // ← NOUVEAU
      lineItems
    });

    const savedOrder = await this.orderRepository.save(order);

    this.logger.log(`✅ Order created with ID: ${savedOrder.id}`);

    return savedOrder;
  }

  /**
   * Trouver une commande par ID Shopify
   */
  async findByShopifyOrderId(shopifyOrderId: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { shopifyOrderId },
      relations: ['store', 'customer'],
    });

    if (!order) {
      throw new NotFoundException(`Order with Shopify ID ${shopifyOrderId} not found`);
    }

    return order;
  }

  /**
   * Trouver une commande par ID interne
   */
  async findOne(id: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['store', 'customer'],
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }

    return order;
  }

  /**
   * Marquer une commande comme payée
   */
  async markAsPaid(orderId: string): Promise<Order> {
    const order = await this.findOne(orderId);

    order.status = OrderStatus.PAID;
    const updatedOrder = await this.orderRepository.save(order);

    this.logger.log(`✅ Order ${orderId} marked as PAID`);

    return updatedOrder;
  }

  /**
   * Marquer une commande comme échouée
   */
  async markAsFailed(orderId: string): Promise<Order> {
    const order = await this.findOne(orderId);

    order.status = OrderStatus.FAILED;
    const updatedOrder = await this.orderRepository.save(order);

    this.logger.log(`❌ Order ${orderId} marked as FAILED`);

    return updatedOrder;
  }

  /**
   * Marquer une commande comme annulée
   */
  async markAsCancelled(orderId: string): Promise<Order> {
    const order = await this.findOne(orderId);

    order.status = OrderStatus.CANCELLED;
    const updatedOrder = await this.orderRepository.save(order);

    this.logger.log(`🚫 Order ${orderId} marked as CANCELLED`);

    return updatedOrder;
  }

  /**
   * Récupérer toutes les commandes
   */
  async findAll(): Promise<Order[]> {
    return this.orderRepository.find({
      relations: ['store', 'customer'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Récupérer les commandes par statut
   */
  async findByStatus(status: OrderStatus): Promise<Order[]> {
    return this.orderRepository.find({
      where: { status },
      relations: ['store', 'customer'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Récupérer les commandes d'un customer
   */
  async findByCustomer(customerId: string): Promise<Order[]> {
    return this.orderRepository.find({
      where: { customer: { id: customerId } },
      relations: ['store', 'customer'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Récupérer les commandes d'une boutique
   */
  async findByStore(storeId: string): Promise<Order[]> {
    return this.orderRepository.find({
      where: { store: { id: storeId } },
      relations: ['store', 'customer'],
      order: { createdAt: 'DESC' },
    });
  }

  // src/orders/orders.service.ts

  /**
   * Trouver une commande par shopifyOrderName (ex: #EDEN-1018)
   */
  async findByShopifyOrderName(orderName: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { shopifyOrderName: orderName },
      relations: ['store', 'customer'],
    });

    if (!order) {
      throw new NotFoundException(
        `Order with name ${orderName} not found`,
      );
    }

    return order;
  }
}