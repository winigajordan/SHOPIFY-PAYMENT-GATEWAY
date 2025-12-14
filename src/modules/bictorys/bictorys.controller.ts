// src/bictorys/bictorys.controller.ts
import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { BictorysWebhookDto } from './dto/bictorys-webhook.dto';
import { BictorysService } from './bictorys.service';

@Controller('bictorys/webhooks')
export class BictorysController {
  private readonly logger = new Logger(BictorysController.name);

  constructor(private readonly bictorysService: BictorysService) {}

  /**
   * POST /bictorys/webhooks/payment
   * Reçoit les webhooks de Bictorys
   */
  @Post('payment')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: false, // ← Ignore les champs supplémentaires
    transform: true,
  }))
  async handlePaymentWebhook(@Body() payload: BictorysWebhookDto) {
    this.logger.log('📥 Bictorys webhook received');
    this.logger.log(`Webhook ID: ${payload.id}`);
    this.logger.log(`Status: ${payload.status}`);
    this.logger.log(`Payment Reference: ${payload.paymentReference}`);
    this.logger.log(`Amount: ${payload.amount} ${payload.currency}`);

    try {
      await this.bictorysService.handlePaymentWebhook(payload);

      this.logger.log('✅ Webhook processed successfully');

      return { success: true, message: 'Webhook received' };
    } catch (error) {
      this.logger.error(`❌ Error processing webhook: ${error.message}`);

      // Retourner 200 quand même pour éviter que Bictorys retry
      return { success: false, message: error.message };
    }
  }
}