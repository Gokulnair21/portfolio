import { Injectable } from '@angular/core';
import { send } from '@emailjs/browser';
import { DeliveryResult, MessageDelivery, MessagePayload } from '../message-delivery.port';
import { EMAILJS_PUBLIC_KEY, EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID } from './emailjs.config';

const RECEIPT_TOPIC = 'contact-ingest';
const RECEIPT_PARTITION = 0;
const RECEIPT_STATUS = 'QUEUED';

@Injectable()
export class EmailJsAdapter implements MessageDelivery {
  #nextOffset = 0;

  async send(payload: MessagePayload): Promise<DeliveryResult> {
    let response: { status: number; text: string };
    try {
      response = await send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        {
          from_name: payload.name,
          reply_to: payload.email,
          message: payload.message,
        },
        { publicKey: EMAILJS_PUBLIC_KEY },
      );
    } catch (error) {
      return {
        ok: false,
        failure: {
          reason: 'provider-error',
          detail: error instanceof Error ? error.message : String(error),
        },
      };
    }

    if (response.status < 200 || response.status >= 300) {
      return {
        ok: false,
        failure: {
          reason: 'provider-error',
          detail: `EmailJS responded with ${response.status}: ${response.text}`,
        },
      };
    }

    const offset = this.#nextOffset;
    this.#nextOffset += 1;
    return {
      ok: true,
      receipt: {
        topic: RECEIPT_TOPIC,
        partition: RECEIPT_PARTITION,
        offset,
        timestamp: new Date().toISOString(),
        messageId: `contact-${offset}-${Date.now()}`,
        status: RECEIPT_STATUS,
      },
    };
  }
}
