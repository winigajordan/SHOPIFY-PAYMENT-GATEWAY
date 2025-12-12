import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

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
}
