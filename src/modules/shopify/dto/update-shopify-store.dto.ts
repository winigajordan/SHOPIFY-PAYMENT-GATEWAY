import { PartialType } from '@nestjs/mapped-types';
import { CreateShopifyStoreDto } from './create-shopify-store.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateShopifyStoreDto extends PartialType(CreateShopifyStoreDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
