// src/shopify/entities/shopify-store.entity.ts
import { BaseEntity } from 'src/utils/entities/base.entity';
import { Entity, Column, Index, AfterLoad, BeforeInsert, BeforeUpdate } from 'typeorm';

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

  @Column({ type: 'text', nullable: true })
  bictorysApiKey: string;

  @Column({ type: 'jsonb', nullable: true })
  brevoConfig: {
    apiKey: string;        // CHIFFRÉ
    senderEmail: string;
    templateId: number;
  } | null;

  // Propriété temporaire pour stocker la clé déchiffrée (non persistée en DB)
  private bictorysApiKeyDecrypted?: string;

  /**
   * Récupérer la clé déchiffrée
   */
  getBictorysApiKey(cryptoService: any) {
    if (this.bictorysApiKeyDecrypted) {
      return this.bictorysApiKeyDecrypted;
    }
    
    if (!this.bictorysApiKey) {
      throw new Error('Bictorys API Key is not set');
    }

    this.bictorysApiKeyDecrypted = cryptoService.decrypt(this.bictorysApiKey);
    return this.bictorysApiKeyDecrypted;
  }

  /**
   * Définir la clé (sera chiffrée avant insertion)
   */
  setBictorysApiKey(key: string, cryptoService: any): void {
    this.bictorysApiKeyDecrypted = key;
    this.bictorysApiKey = cryptoService.encrypt(key);
  }
}