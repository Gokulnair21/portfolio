import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ClusterStateService } from '../../core/state/cluster-state.service';
import { MessagePayload } from '../../delivery/message-delivery.port';

type BodyParseResult =
  | { readonly ok: true; readonly value: MessagePayload }
  | { readonly ok: false; readonly reason: string };

const HTTP_METHOD = 'POST';
const ENDPOINT_PATH = '/api/v1/contact';

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

  protected readonly httpMethod = HTTP_METHOD;
  protected readonly endpointPath = ENDPOINT_PATH;

  protected readonly tryItOut = signal(false);
  protected readonly validationError = signal<string | null>(null);

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

  constructor() {
    this.bodyText.set(this.defaultBody());
  }

  protected toggleTryItOut(): void {
    this.tryItOut.update((active) => !active);
    if (!this.tryItOut()) {
      this.bodyText.set(this.defaultBody());
      this.validationError.set(null);
    }
  }

  protected onBodyInput(event: Event): void {
    this.bodyText.set((event.target as HTMLTextAreaElement).value);
    this.validationError.set(null);
  }

  protected execute(): void {
    const result = parseMessageBody(this.bodyText());
    if (!result.ok) {
      this.validationError.set(result.reason);
      return;
    }
    this.validationError.set(null);
  }
}
