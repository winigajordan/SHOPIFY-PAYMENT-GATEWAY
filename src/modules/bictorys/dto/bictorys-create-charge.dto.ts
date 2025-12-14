// src/bictorys/dto/bictorys-create-charge.dto.ts
import { BictorysOrderDetailDto } from './bictorys-order-detail.dto';
import { BictorysCustomerDto } from './bictorys-customer.dto';

export class BictorysCreateChargeDto {
  amount: number;
  currency: string;
  paymentReference: string;
  successRedirectUrl: string;
  orderDetails: BictorysOrderDetailDto[];
  customerObject: BictorysCustomerDto; // ← NOUVEAU


}