import { InjectionToken } from '@angular/core';

/**
 * Contact message handed to the delivery seam by the playground (FR6).
 */
export interface MessagePayload {
  readonly name: string;
  readonly email: string;
  readonly message: string;
}

/**
 * Kafka-style producer acknowledgement rendered verbatim by the playground.
 * Pure client-side artifact; mirrors what a real ingest broker would ack.
 */
export interface DeliveryReceipt {
  readonly topic: string;
  readonly partition: number;
  readonly offset: number;
  readonly timestamp: string;
  readonly messageId: string;
  readonly status: 'QUEUED';
}

export type DeliveryFailureReason = 'invalid-request' | 'provider-error';

export interface DeliveryFailure {
  readonly reason: DeliveryFailureReason;
  readonly detail: string;
}

/**
 * Typed result at the delivery seam: failures return as data, never as
 * thrown provider errors (AD-11).
 */
export type DeliveryResult =
  | { readonly ok: true; readonly receipt: DeliveryReceipt }
  | { readonly ok: false; readonly failure: DeliveryFailure };

/**
 * Outbound contact delivery port (AD-4). Implementations wrap a concrete
 * provider behind this seam; consumers depend only on this interface.
 */
export interface MessageDelivery {
  send(payload: MessagePayload): Promise<DeliveryResult>;
}

export const MESSAGE_DELIVERY = new InjectionToken<MessageDelivery>('MESSAGE_DELIVERY');
