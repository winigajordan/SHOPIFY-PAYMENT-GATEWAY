// src/bictorys/dto/bictorys-webhook.dto.ts
import { IsNotEmpty, IsString, IsNumber, IsObject, IsOptional } from 'class-validator';

export class BictorysWebhookDto {
  @IsNotEmpty()
  @IsString()
  id: string;

  @IsNotEmpty()
  @IsString()
  status: string; // "succeeded", "failed", "pending", etc.

  @IsNotEmpty()
  @IsString()
  paymentReference: string; // shopifyOrderNumber

  @IsNotEmpty()
  @IsNumber()
  amount: number;

  @IsNotEmpty()
  @IsString()
  currency: string;

}