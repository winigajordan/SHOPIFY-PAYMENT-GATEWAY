// src/shopify/dto/shopify-order-webhook.dto.ts
import { IsNotEmpty, IsNumber, IsString, IsOptional, IsArray } from 'class-validator';

export class ShopifyCustomerDto {
  @IsNumber()
  id: number;

  @IsOptional()
  @IsString()
  email?: string | null;

  @IsOptional()
  @IsString()
  phone?: string | null;

  @IsOptional()
  @IsString()
  first_name?: string;

  @IsOptional()
  @IsString()
  last_name?: string;
}

export class ShopifyOrderWebhookDto {
  // === IDENTIFICATION ===
  @IsNotEmpty()
  @IsNumber()
  id: number;

  @IsNotEmpty()
  @IsNumber()
  order_number: number;

  @IsOptional()
  @IsString()
  name?: string;

  // === MONTANT ===
  @IsNotEmpty()
  @IsString()
  total_price: string;

  @IsNotEmpty()
  @IsString()
  currency: string;

  // === PAIEMENT ===
  @IsOptional()
  @IsString()
  financial_status?: string;

  @IsOptional()
  @IsArray()
  payment_gateway_names?: string[];

  @IsOptional()
  note_attributes?: Array<{ name: string; value: string }>;

  // === CLIENT ===
  @IsOptional()
  customer?: ShopifyCustomerDto;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  // === DATES ===
  @IsOptional()
  @IsString()
  created_at?: string;

  // Reste du payload
  [key: string]: any;
}