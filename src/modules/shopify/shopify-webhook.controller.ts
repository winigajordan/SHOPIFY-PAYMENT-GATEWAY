// src/shopify/shopify-webhook.controller.ts
import {
  Controller,
  Post,
  Headers,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
  Req,
} from '@nestjs/common';
import { ShopifyWebhookService } from './services/shopify-webhook.service';

@Controller('shopify/webhooks')
export class ShopifyWebhookController {
  private readonly logger = new Logger(ShopifyWebhookController.name);

  constructor(
    private readonly shopifyWebhookService: ShopifyWebhookService,
  ) {}

  @Post('order-create')
  @HttpCode(HttpStatus.OK)
  async handleOrderCreate(
    @Headers('x-shopify-hmac-sha256') hmacHeader: string,
    @Headers('x-shopify-shop-domain') shopDomain: string,
    @Headers('x-shopify-topic') topic: string,
    @Body() payload: any,
    @Req() req: Request,
  ) {
    this.logger.log('=== WEBHOOK RECEIVED ===');
    this.logger.log(`Topic: ${topic}`);
    this.logger.log(`Shop: ${shopDomain}`);

    const rawBody = (req as any).rawBody;

    if (!rawBody) {
      this.logger.error('❌ Raw body not found - check main.ts middleware');
      return { success: false, message: 'Raw body not available' };
    }

    const result = await this.shopifyWebhookService.processOrderCreateWebhook({
      hmacHeader: hmacHeader || '',
      shopDomain: shopDomain || '',
      topic: topic || '',
      rawBody,
      payload,
    });

    if (result.success) {
      this.logger.log(`✅ Webhook processed successfully`);
    } else {
      this.logger.error(`❌ Webhook processing failed: ${result.message}`);
    }

    return result;
  }
}