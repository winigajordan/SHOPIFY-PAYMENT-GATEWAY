// src/orders/dto/create-order.dto.ts
import { 
    IsNotEmpty, 
    IsString, 
    IsNumber, 
    IsEnum,
    IsObject,
  } from 'class-validator';
import { PaymentMethod } from 'src/modules/shopify/enum/payment-method.enum';
import { OrderStatus } from '../enum/order-status.enum';
  
  export class CreateOrderDto {
    @IsNotEmpty()
    @IsString()
    shopifyOrderId: string;
  
    @IsNotEmpty()
    @IsNumber()
    shopifyOrderNumber: number;
  
    @IsNotEmpty()
    @IsNumber()
    totalAmount: number;
  
    @IsNotEmpty()
    @IsString()
    currency: string;
  
    @IsNotEmpty()
    @IsEnum(PaymentMethod)
    paymentMethod: PaymentMethod;
  
    @IsNotEmpty()
    @IsEnum(OrderStatus)
    status: OrderStatus;
  
    @IsNotEmpty()
    @IsObject()
    rawPayload: any;
  }