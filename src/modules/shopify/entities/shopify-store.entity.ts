import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('shopify_stores')
export class ShopifyStore extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  @Index()
  shopDomain: string;

  @Column({ type: 'text' })
  accessToken: string;

  @Column({ type: 'varchar', length: 255 })
  webhookSecret: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;
}