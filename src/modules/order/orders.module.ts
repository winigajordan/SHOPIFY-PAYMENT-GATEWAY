import { Module } from '@nestjs/common';
import { OrdersService } from './order.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';

@Module({
  providers: [OrdersService],
  exports: [OrdersService],
  imports: [
    TypeOrmModule.forFeature([Order]),
  ],
})
export class OrdersModule {}
