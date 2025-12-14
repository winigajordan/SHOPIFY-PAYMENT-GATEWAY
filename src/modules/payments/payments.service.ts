// src/payments/payments.service.ts
import { 
    Injectable, 
    NotFoundException,
    Logger,
  } from '@nestjs/common';
  import { InjectRepository } from '@nestjs/typeorm';
  import { Repository } from 'typeorm';
  import { PaymentTransaction } from './entities/payment-transaction.entity';
  import { CreatePaymentTransactionDto } from './dto/create-payment-transaction.dto';
import { Order } from '../order/entities/order.entity';
import { PaymentStatus } from './enum/payment-status.enum';

  
  @Injectable()
  export class PaymentsService {
    private readonly logger = new Logger(PaymentsService.name);
  
    constructor(
      @InjectRepository(PaymentTransaction)
      private readonly paymentTransactionRepository: Repository<PaymentTransaction>,
    ) {}
  
    /**
     * Créer une transaction de paiement pour une commande
     */
    async createPaymentForOrder(order: Order): Promise<PaymentTransaction> {
      this.logger.log(`Creating payment transaction for order #${order.shopifyOrderName}`);
  
      const transaction = this.paymentTransactionRepository.create({
        order,
        paymentChannel: order.paymentMethod,
        amount: order.totalAmount,
        currency: order.currency,
        status: PaymentStatus.INITIATED,
        metadata: {
          orderId: order.id,
          shopifyOrderId: order.shopifyOrderId,
          shopifyOrderNumber: order.shopifyOrderName,
        },
      });
  
      const savedTransaction = await this.paymentTransactionRepository.save(transaction);
  
      this.logger.log(`✅ Payment transaction created: ${savedTransaction.id}`);
  
      return savedTransaction;
    }
  
    /**
     * Créer une transaction avec DTO
     */
    async create(dto: CreatePaymentTransactionDto, order: Order): Promise<PaymentTransaction> {
      const transaction = this.paymentTransactionRepository.create({
        ...dto,
        order,
      });
  
      return this.paymentTransactionRepository.save(transaction);
    }
  
    /**
     * Trouver une transaction par ID
     */
    async findOne(id: string): Promise<PaymentTransaction> {
      const transaction = await this.paymentTransactionRepository.findOne({
        where: { id },
        relations: ['order', 'order.customer', 'order.store'],
      });
  
      if (!transaction) {
        throw new NotFoundException(`Payment transaction with ID ${id} not found`);
      }
  
      return transaction;
    }
  
    /**
     * Trouver les transactions d'une commande
     */
    async findByOrder(orderId: string): Promise<PaymentTransaction[]> {
      return this.paymentTransactionRepository.find({
        where: { order: { id: orderId } },
        order: { createdAt: 'DESC' },
      });
    }
  
    /**
     * Trouver par provider transaction ID
     */
    async findByProviderTransactionId(providerTransactionId: string): Promise<PaymentTransaction | null> {
      return this.paymentTransactionRepository.findOne({
        where: { providerTransactionId },
        relations: ['order', 'order.customer', 'order.store'],
      });
    }
  
    /**
     * Mettre à jour le statut d'une transaction
     */
    async updateStatus(
      transactionId: string,
      status: PaymentStatus,
      metadata?: any,
    ): Promise<PaymentTransaction> {
      const transaction = await this.findOne(transactionId);
  
      transaction.status = status;
  
      if (metadata) {
        transaction.metadata = {
          ...transaction.metadata,
          ...metadata,
        };
      }
  
      const updated = await this.paymentTransactionRepository.save(transaction);
  
      this.logger.log(`Transaction ${transactionId} status updated to ${status}`);
  
      return updated;
    }
  
    /**
     * Mettre à jour avec le lien de paiement (après appel Bictorys)
     */
    async updateWithPaymentLink(
      transactionId: string,
      paymentLinkUrl: string,
      providerTransactionId: string,
      expiresAt?: Date,
    ): Promise<PaymentTransaction> {
      const transaction = await this.findOne(transactionId);
  
      transaction.paymentLinkUrl = paymentLinkUrl;
      transaction.providerTransactionId = providerTransactionId;
      transaction.status = PaymentStatus.PENDING;
  
      if (expiresAt) {
        transaction.expiresAt = expiresAt;
      }
  
      const updated = await this.paymentTransactionRepository.save(transaction);
  
      this.logger.log(`✅ Payment link added to transaction ${transactionId}`);
      this.logger.log(`🔗 Link: ${paymentLinkUrl}`);
  
      return updated;
    }
  
    /**
     * Marquer comme succès
     */
async markAsSuccess(
      transactionId: string,
      providerTransactionId?: string,
    ): Promise<PaymentTransaction> {
      const transaction = await this.findOne(transactionId);
  
      transaction.status = PaymentStatus.SUCCESS;
  
      if (providerTransactionId && !transaction.providerTransactionId) {
        transaction.providerTransactionId = providerTransactionId;
      }
  
      const updated = await this.paymentTransactionRepository.save(transaction);
  
      this.logger.log(`✅ Transaction ${transactionId} marked as SUCCESS`);
  
      return updated;
    }
  
    /**
     * Marquer comme échoué
     */
    async markAsFailed(
      transactionId: string,
      reason?: string,
    ): Promise<PaymentTransaction> {
      const transaction = await this.findOne(transactionId);
  
      transaction.status = PaymentStatus.FAILED;
  
      if (reason) {
        transaction.metadata = {
          ...transaction.metadata,
          failureReason: reason,
        };
      }
  
      const updated = await this.paymentTransactionRepository.save(transaction);
  
      this.logger.log(`❌ Transaction ${transactionId} marked as FAILED`);
      if (reason) {
        this.logger.log(`Reason: ${reason}`);
      }
  
      return updated;
    }
  
    /**
     * Marquer comme expiré
     */
    async markAsExpired(transactionId: string): Promise<PaymentTransaction> {
      const transaction = await this.findOne(transactionId);
  
      transaction.status = PaymentStatus.EXPIRED;
  
      const updated = await this.paymentTransactionRepository.save(transaction);
  
      this.logger.log(`⏰ Transaction ${transactionId} marked as EXPIRED`);
  
      return updated;
    }
  
    /**
     * Récupérer toutes les transactions
     */
    async findAll(): Promise<PaymentTransaction[]> {
      return this.paymentTransactionRepository.find({
        relations: ['order', 'order.customer', 'order.store'],
        order: { createdAt: 'DESC' },
      });
    }
  
    /**
     * Récupérer les transactions par statut
     */
    async findByStatus(status: PaymentStatus): Promise<PaymentTransaction[]> {
      return this.paymentTransactionRepository.find({
        where: { status },
        relations: ['order', 'order.customer', 'order.store'],
        order: { createdAt: 'DESC' },
      });
    }
  
    /**
     * Récupérer les transactions expirées (à traiter)
     */
    async findExpired(): Promise<PaymentTransaction[]> {
      return this.paymentTransactionRepository
        .createQueryBuilder('transaction')
        .where('transaction.status = :status', { status: PaymentStatus.PENDING })
        .andWhere('transaction.expiresAt < :now', { now: new Date() })
        .leftJoinAndSelect('transaction.order', 'order')
        .getMany();
    }
  }