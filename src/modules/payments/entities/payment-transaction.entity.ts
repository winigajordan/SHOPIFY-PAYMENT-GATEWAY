// src/payments/entities/payment-transaction.entity.ts

import { BaseEntity } from '../../../utils/entities/base.entity';
import { Order } from '../../order/entities/order.entity';
import { PaymentMethod } from '../../shopify/enum/payment-method.enum';
import { 
    Entity, 
    Column, 
    ManyToOne, 
    JoinColumn,
    Index,
    BeforeInsert,
  } from 'typeorm';
import { PaymentStatus } from '../enum/payment-status.enum';
  
  @Entity('payment_transactions')
  export class PaymentTransaction extends BaseEntity {
    @ManyToOne(() => Order, { eager: false })
    @JoinColumn({ name: 'orderId' })
    order: Order;
  
    @Column({
      type: 'enum',
      enum: PaymentMethod,
    })
    paymentChannel: PaymentMethod;
  
    @Column({ type: 'decimal', precision: 10, scale: 2 })
    amount: number;
  
    @Column({ type: 'varchar', length: 10 })
    currency: string;
  
    @Column({
      type: 'enum',
      enum: PaymentStatus,
      default: PaymentStatus.INITIATED,
    })
    @Index()
    status: PaymentStatus;
  
    @Column({ type: 'varchar', length: 255, nullable: true })
    providerTransactionId: string | null;
  
    @Column({ type: 'text', nullable: true })
    paymentLinkUrl: string | null;
  
    @Column({ type: 'timestamptz', nullable: true })
    expiresAt: Date | null;
  
    @Column({ type: 'jsonb', nullable: true })
    metadata: any;
  
    @BeforeInsert()
    setDefaultStatus() {
      if (!this.status) {
        this.status = PaymentStatus.INITIATED;
      }
    }
  }