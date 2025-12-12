import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateShopifyStoreDto } from './dto/create-shopify-store.dto';
import { UpdateShopifyStoreDto } from './dto/update-shopify-store.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ShopifyStore } from './entities/shopify-store.entity';

@Injectable()
export class ShopifyService {

  constructor(
    @InjectRepository(ShopifyStore)
    private readonly shopifyStoreRepository: Repository<ShopifyStore>,
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

    // Créer la boutique
    const store = this.shopifyStoreRepository.create(dto);

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

    // Mettre à jour
    Object.assign(store, dto);
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
