// src/notifications/interfaces/send-payment-link.interface.ts
import { Customer } from '../../customers/entities/customer.entity';
import { Order } from '../../order/entities/order.entity';

export interface ISendPaymentLink {
  sendPaymentLink(
    customer: Customer,
    paymentLink: string,
    order: Order,
  ): Promise<void>;
}