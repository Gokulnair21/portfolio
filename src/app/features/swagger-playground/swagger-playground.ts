import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ClusterStateService } from '../../core/state/cluster-state.service';
import {
  MESSAGE_DELIVERY,
  DeliveryReceipt,
  DeliveryResult,
  MessagePayload,
} from '../../delivery/message-delivery.port';

type BodyParseResult =
  | { readonly ok: true; readonly value: MessagePayload }
  | { readonly ok: false; readonly reason: string };

const HTTP_METHOD = 'POST';
const ENDPOINT_PATH = '/api/v1/contact';
const LOG_SOURCE_CONTROLLER = 'ContactController';
const LOG_SOURCE_PRODUCER = 'ContactKafkaProducer';

const RESPONSE_HEADERS = ['HTTP/1.1 200 OK', 'Content-Type: application/json', 'X-Mock-Mode: true'];

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function parseMessageBody(text: string): BodyParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'Request body is not valid JSON.' };
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { ok: false, reason: 'Request body must be a JSON object.' };
  }
  const { name, email, message } = parsed as Record<string, unknown>;
  if (!isNonEmptyString(name)) return { ok: false, reason: "'name' is required and must be a non-empty string." };
  if (!isNonEmptyString(email)) return { ok: false, reason: "'email' is required and must be a non-empty string." };
  if (!isNonEmptyString(message)) return { ok: false, reason: "'message' is required and must be a non-empty string." };
  return { ok: true, value: { name, email, message } };
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-swagger-playground',
  templateUrl: './swagger-playground.html',
  styleUrl: './swagger-playground.css',
})
export class SwaggerPlayground {
  protected readonly store = inject(ClusterStateService);
  protected readonly delivery = inject(MESSAGE_DELIVERY);

  protected readonly httpMethod = HTTP_METHOD;
  protected readonly endpointPath = ENDPOINT_PATH;
  protected readonly responseHeadersText = RESPONSE_HEADERS.join('\n');

  protected readonly tryItOut = signal(false);
  protected readonly validationError = signal<string | null>(null);
  protected readonly sending = signal(false);
  protected readonly receipt = signal<DeliveryReceipt | null>(null);
  protected readonly deliveryError = signal<string | null>(null);

  protected readonly defaultBody = computed(() =>
    JSON.stringify(
      {
        name: '',
        email: this.store.content()?.contact.email ?? '',
        message: '',
      },
      null,
      2,
    ),
  );

  protected readonly bodyText = signal('');

  #lastTimestampMs = 0;

  constructor() {
    this.bodyText.set(this.defaultBody());
  }

  protected toggleTryItOut(): void {
    this.tryItOut.update((active) => !active);
    if (!this.tryItOut()) {
      this.bodyText.set(this.defaultBody());
      this.validationError.set(null);
      this.receipt.set(null);
      this.deliveryError.set(null);
    }
  }

  protected onBodyInput(event: Event): void {
    this.bodyText.set((event.target as HTMLTextAreaElement).value);
    this.validationError.set(null);
  }

  protected async execute(): Promise<void> {
    if (this.sending()) return;
    const result = parseMessageBody(this.bodyText());
    if (!result.ok) {
      this.validationError.set(result.reason);
      return;
    }
    this.validationError.set(null);
    this.receipt.set(null);
    this.deliveryError.set(null);

    this.#appendLog(
      LOG_SOURCE_CONTROLLER,
      `${HTTP_METHOD} ${ENDPOINT_PATH}: controller received contact POST from ${result.value.email}`,
    );
    this.sending.set(true);
    let deliveryResult: DeliveryResult;
    try {
      deliveryResult = await this.delivery.send(result.value);
    } finally {
      this.sending.set(false);
    }

    if (deliveryResult.ok) {
      this.#appendLog(
        LOG_SOURCE_PRODUCER,
        `Published contact message to topic ${deliveryResult.receipt.topic} partition ${deliveryResult.receipt.partition} offset ${deliveryResult.receipt.offset}`,
      );
      this.receipt.set(deliveryResult.receipt);
    } else {
      this.deliveryError.set(deliveryResult.failure.detail);
    }
  }

  protected formatReceipt(receipt: DeliveryReceipt): string {
    return JSON.stringify(receipt, null, 2);
  }

  protected clearReceipt(): void {
    this.receipt.set(null);
  }

  protected async copyReceipt(receipt: DeliveryReceipt): Promise<void> {
    const text = this.formatReceipt(receipt);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      }
    } catch {
      // clipboard fallback ignored
    }
  }

  #appendLog(source: string, message: string): void {
    const timestampMs = Math.max(Date.now(), this.#lastTimestampMs + 1);
    this.#lastTimestampMs = timestampMs;
    this.store.appendLog({
      source,
      level: 'INFO',
      message,
      timestamp: new Date(timestampMs).toISOString(),
    });
  }
}