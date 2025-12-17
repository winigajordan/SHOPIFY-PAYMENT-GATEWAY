// src/customers/entities/customer.entity.ts
import { 
    Entity, 
    Column, 
    ManyToOne, 
    JoinColumn, 
    BeforeInsert, 
    BeforeUpdate,
    Index,
  } from 'typeorm';
  import { ShopifyStore } from '../../shopify/entities/shopify-store.entity';
import { BaseEntity } from '../../../utils/entities/base.entity';
  
  @Entity('customers')
  export class Customer extends BaseEntity {
    @Column({ type: 'varchar', length: 255, unique: true })
    @Index()
    shopifyCustomerId: string;
  
    @Column({ type: 'varchar', length: 255, nullable: true })
    email: string | null;
  
    @Column({ type: 'varchar', length: 50, nullable: true })
    phoneNumber: string | null;
  
    @Column({ type: 'varchar', length: 255 })
    firstName: string;
  
    @Column({ type: 'varchar', length: 255 })
    lastName: string;
  
    @ManyToOne(() => ShopifyStore, { eager: false })
    @JoinColumn({ name: 'storeId' })
    store: ShopifyStore;
  
    // Validation : au moins email OU phoneNumber
    @BeforeInsert()
    @BeforeUpdate()
    validateContactInfo() {
      if (!this.email && !this.phoneNumber) {
        throw new Error('Customer must have at least email or phone number');
      }
    }
  }