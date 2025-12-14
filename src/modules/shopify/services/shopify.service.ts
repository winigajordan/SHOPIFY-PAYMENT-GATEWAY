import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateShopifyStoreDto } from '../dto/create-shopify-store.dto';
import { UpdateShopifyStoreDto } from '../dto/update-shopify-store.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ShopifyStore } from '../entities/shopify-store.entity';
import { CryptoService } from '../../common/services/crypto/crypto.service';

@Injectable()
export class ShopifyService {

  private readonly logger = new Logger(ShopifyService.name);


  constructor(
    @InjectRepository(ShopifyStore)
    private readonly shopifyStoreRepository: Repository<ShopifyStore>,
    private readonly cryptoService: CryptoService,
  ) {}

  /**
   * Créer une nouvelle boutique Shopify
   */
  async create(dto: CreateShopifyStoreDto): Promise<ShopifyStore> {
    // Vérifier si le domaine existe déjà
    const existing = await this.shopifyStoreRepository.findOne({
      where: { shopDomain: dto.shopDomain },
    });

    if (existing) {
      throw new ConflictException(
        `Store with domain ${dto.shopDomain} already exists`,
      );
    }

    // Chiffrer brevoConfig.apiKey si présent
    let brevoConfig = null;
    if (dto.brevoConfig) {
      // @ts-ignore
      brevoConfig = {
        apiKey: this.cryptoService.encrypt(dto.brevoConfig.apiKey),
        senderEmail: dto.brevoConfig.senderEmail,
        templateId: dto.brevoConfig.templateId,
      };
    }

    // Créer la boutique
    const store = this.shopifyStoreRepository.create({
      name: dto.name,
      shopDomain: dto.shopDomain,
      accessToken: this.cryptoService.encrypt(dto.accessToken),
      webhookSecret: dto.webhookSecret,
      bictorysApiKey: this.cryptoService.encrypt(dto.bictorysApiKey), // ← Chiffrer
      brevoConfig
    });


    return this.shopifyStoreRepository.save(store);
  }

  /**
   * Récupérer toutes les boutiques
   */
  async findAll(): Promise<ShopifyStore[]> {
    return this.shopifyStoreRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Récupérer une boutique par ID
   */
  async findOne(id: string): Promise<ShopifyStore> {
    const store = await this.shopifyStoreRepository.findOne({
      where: { id },
    });

    if (!store) {
      throw new NotFoundException(`Store with ID ${id} not found`);
    }

    return store;
  }

  /**
   * Récupérer une boutique par domaine (utilisé par webhooks)
   */
  async findByDomain(shopDomain: string): Promise<ShopifyStore> {
    const store = await this.shopifyStoreRepository.findOne({
      where: { shopDomain },
    });

    if (!store) {
      throw new NotFoundException(
        `Store with domain ${shopDomain} not found`,
      );
    }

    return store;
  }


   /**
   * Récupérer la clé API Bictorys déchiffrée
   */
   getBictorysApiKey(store: ShopifyStore): string {
    return this.cryptoService.decrypt(store.bictorysApiKey);
  }


  /**
   * Récupérer la clé API Brevo déchiffrée
   */
  getBrevoApiKey(store: ShopifyStore): string {
    if (!store.brevoConfig) {
      throw new Error('Brevo config not found for this store');
    }
    return this.cryptoService.decrypt(store.brevoConfig.apiKey);
  }


  /**
   * Récupérer l'access token Shopify déchiffré
   */
  getAccessToken(store: ShopifyStore): string {
    return this.cryptoService.decrypt(store.accessToken);
  }

  /**
   * Mettre à jour une boutique
   */
  async update(
    id: string,
    dto: UpdateShopifyStoreDto,
  ): Promise<ShopifyStore> {

    // Vérifier que la boutique existe
    const store = await this.findOne(id);

    // Si le domaine est modifié, vérifier l'unicité
    if (dto.shopDomain && dto.shopDomain !== store.shopDomain) {
      const existing = await this.shopifyStoreRepository.findOne({
        where: { shopDomain: dto.shopDomain },
      });

      if (existing) {
        throw new ConflictException(
          `Store with domain ${dto.shopDomain} already exists`,
        );
      }
    }

    // Chiffrer la clé Bictorys si elle est modifiée
    if (dto.bictorysApiKey) {
      store.bictorysApiKey = this.cryptoService.encrypt(dto.bictorysApiKey);
    }

    // Chiffrer accessToken si modifié
    if (dto.accessToken) {
      store.accessToken = this.cryptoService.encrypt(dto.accessToken);
    }


    if (dto.brevoConfig) {
      store.brevoConfig = {
        apiKey: this.cryptoService.encrypt(dto.brevoConfig.apiKey),
        senderEmail: dto.brevoConfig.senderEmail,
        templateId: dto.brevoConfig.templateId,
      };
    }

    // Mettre à jour les autres champs
    if (dto.name) store.name = dto.name;
    if (dto.shopDomain) store.shopDomain = dto.shopDomain;
    if (dto.webhookSecret) store.webhookSecret = dto.webhookSecret;

    if (dto.isActive !== undefined) store.isActive = dto.isActive;

    return this.shopifyStoreRepository.save(store);
  }

  /**
   * Supprimer une boutique (soft delete)
   */
  async remove(id: string): Promise<void> {
    const store = await this.findOne(id);
    await this.shopifyStoreRepository.softRemove(store);
  }

  /**
   * Désactiver une boutique (sans supprimer)
   */
  async deactivate(id: string): Promise<ShopifyStore> {
    const store = await this.findOne(id);
    store.isActive = false;
    return this.shopifyStoreRepository.save(store);
  }

  /**
   * Réactiver une boutique
   */
  async activate(id: string): Promise<ShopifyStore> {
    const store = await this.findOne(id);
    store.isActive = true;
    return this.shopifyStoreRepository.save(store);
  }

}
