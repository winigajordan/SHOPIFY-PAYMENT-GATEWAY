// src/orders/entities/order.entity.ts
import { 
    Entity, 
    Column, 
    ManyToOne, 
    JoinColumn,
    Index,
    BeforeInsert,
  } from 'typeorm';
  import { ShopifyStore } from '../../shopify/entities/shopify-store.entity';
  import { Customer } from '../../customers/entities/customer.entity';
import { BaseEntity } from 'src/common/entities/base.entity';
import { PaymentMethod } from 'src/modules/shopify/enum/payment-method.enum';
import { OrderStatus } from '../enum/order-status.enum';
  
  @Entity('orders')
  export class Order extends BaseEntity {
    @Column({ type: 'varchar', length: 255, unique: true })
    @Index()
    shopifyOrderId: string;
  
    @Column({ type: 'integer' })
    shopifyOrderNumber: number;
  
    @ManyToOne(() => ShopifyStore, { eager: false })
    @JoinColumn({ name: 'storeId' })
    store: ShopifyStore;
  
    @ManyToOne(() => Customer, { eager: false })
    @JoinColumn({ name: 'customerId' })
    customer: Customer;
  
    @Column({ type: 'decimal', precision: 10, scale: 2 })
    totalAmount: number;
  
    @Column({ type: 'varchar', length: 10 })
    currency: string;
  
    @Column({
      type: 'enum',
      enum: PaymentMethod,
    })
    paymentMethod: PaymentMethod;
  
    @Column({
      type: 'enum',
      enum: OrderStatus,
      default: OrderStatus.PENDING_PAYMENT,
    })
    @Index()
    status: OrderStatus;

  
    @BeforeInsert()
    setDefaultStatus() {
      if (!this.status) {
        this.status = OrderStatus.PENDING_PAYMENT;
      }
    }
  }