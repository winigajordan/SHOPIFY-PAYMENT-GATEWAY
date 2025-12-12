// src/shopify/shopify.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseUUIDPipe,
  DefaultValuePipe,
  ParseBoolPipe,
} from '@nestjs/common';
import { ShopifyService } from './shopify.service';
import { CreateShopifyStoreDto } from './dto/create-shopify-store.dto';
import { UpdateShopifyStoreDto } from './dto/update-shopify-store.dto';

@Controller('shopify/stores')
export class ShopifyController {
  constructor(private readonly shopifyService: ShopifyService) {}

  /**
   * POST /shopify/stores
   * Créer une nouvelle boutique Shopify
   */
  @Post()
  create(@Body() createShopifyStoreDto: CreateShopifyStoreDto) {
    return this.shopifyService.create(createShopifyStoreDto);
  }

  /**
   * GET /shopify/stores
   * Récupérer toutes les boutiques
   */
  @Get()
  findAll() {
    return this.shopifyService.findAll();
  }
  /**
   * GET /shopify/stores/:id
   * Récupérer une boutique par ID
   */
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.shopifyService.findOne(id);
  }

  /**
   * PATCH /shopify/stores/:id
   * Mettre à jour une boutique
   */
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateShopifyStoreDto: UpdateShopifyStoreDto,
  ) {
    return this.shopifyService.update(id, updateShopifyStoreDto);
  }

  /**
   * DELETE /shopify/stores/:id
   * Supprimer une boutique (soft delete)
   */
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.shopifyService.remove(id);
  }

  /**
   * POST /shopify/stores/:id/deactivate
   * Désactiver une boutique
   */
  @Post(':id/deactivate')
  deactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.shopifyService.deactivate(id);
  }

  /**
   * POST /shopify/stores/:id/activate
   * Réactiver une boutique
   */
  @Post(':id/activate')
  activate(@Param('id', ParseUUIDPipe) id: string) {
    return this.shopifyService.activate(id);
  }
}