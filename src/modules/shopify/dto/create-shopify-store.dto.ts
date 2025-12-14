import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class BrevoConfigDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(10)
  apiKey: string;

  @IsNotEmpty()
  @IsEmail()
  senderEmail: string;

  @IsNotEmpty()
  @IsNumber()
  templateId: number;
}

export class CreateShopifyStoreDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/, {
    message: 'shopDomain must be a valid Shopify domain (e.g., store-name.myshopify.com)',
  })
  shopDomain: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(10)
  accessToken: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(10)
  webhookSecret: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(10)
  bictorysApiKey: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => BrevoConfigDto)
  brevoConfig?: BrevoConfigDto;
}
