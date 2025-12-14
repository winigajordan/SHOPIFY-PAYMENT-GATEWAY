// src/payments/dto/create-payment-transaction.dto.ts
import { 
    IsNotEmpty, 
    IsEnum,
    IsNumber,
    IsString,
    IsOptional,
    IsObject,
  } from 'class-validator';
import { PaymentMethod } from 'src/modules/shopify/enum/payment-method.enum';
import { PaymentStatus } from '../enum/payment-status.enum';
  
  export class CreatePaymentTransactionDto {
    @IsNotEmpty()
    @IsEnum(PaymentMethod)
    paymentChannel: PaymentMethod;
  
    @IsNotEmpty()
    @IsNumber()
    amount: number;
  
    @IsNotEmpty()
    @IsString()
    currency: string;
  
    @IsOptional()
    @IsEnum(PaymentStatus)
    status?: PaymentStatus;
  
    @IsOptional()
    @IsString()
    providerTransactionId?: string;
  
    @IsOptional()
    @IsString()
    paymentLinkUrl?: string;
  
    @IsOptional()
    expiresAt?: Date;
  
    @IsOptional()
    @IsObject()
    metadata?: any;
  }