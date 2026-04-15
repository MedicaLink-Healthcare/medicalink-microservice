import { Controller, Post, Body, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { MicroserviceService } from '../utils/microservice.service';
import { CloudinarySignatureResponse, Public } from '@app/contracts';

@Controller('utilities')
export class UtilitiesController {
  constructor(
    @Inject('CONTENT_SERVICE')
    private readonly contentClient: ClientProxy,
    @Inject('NOTIFICATION_SERVICE')
    private readonly notificationClient: ClientProxy,
    private readonly microserviceService: MicroserviceService,
  ) {}

  @Public()
  @Post('upload-signature')
  async generateUploadSignature(): Promise<CloudinarySignatureResponse> {
    return this.microserviceService.sendWithTimeout<CloudinarySignatureResponse>(
      this.contentClient,
      'assets.generate_upload_signature',
      {},
    );
  }

  @Public()
  @Post('contact')
  handleContactForm(@Body() payload: any): {
    success: boolean;
    message: string;
  } {
    this.notificationClient.emit('notification.email.send', {
      templateKey: 'contact-form',
      to: 'dinhducbkdn2004@gmail.com',
      subject: `New Contact Message from ${payload.name || 'User'}`,
      context: {
        name: payload.name || 'Anonymous',
        email: payload.email || 'No email provided',
        subjectStr: payload.subject || 'No subject',
        number: payload.number || 'No number provided',
        message: payload.message || 'No message provided',
      },
    });
    return { success: true, message: 'Message sent successfully' };
  }
}
