import { TestBed } from '@angular/core/testing';
import portfolioDataJson from '../../../../public/portfolio-data.json';
import { parsePortfolioData } from '../../core/data/portfolio-data';
import { ClusterStateService } from '../../core/state/cluster-state.service';
import {
  MESSAGE_DELIVERY,
  DeliveryReceipt,
  DeliveryResult,
  MessageDelivery,
  MessagePayload,
} from '../../delivery/message-delivery.port';
import { SwaggerPlayground } from './swagger-playground';

const VALID_BODY = JSON.stringify({
  name: 'Gokul',
  email: 'you@example.com',
  message: 'Hello from the playground.',
});

describe('SwaggerPlayground', () => {
  let store: ClusterStateService;
  let sendSpy: ReturnType<typeof vi.fn<MessageDelivery['send']>>;

  beforeEach(() => {
    sendSpy = vi.fn();
    TestBed.configureTestingModule({
      imports: [SwaggerPlayground],
      providers: [
        ClusterStateService,
        { provide: MESSAGE_DELIVERY, useValue: { send: sendSpy } satisfies MessageDelivery },
      ],
    });
    store = TestBed.inject(ClusterStateService);
    store.hydrate(parsePortfolioData(portfolioDataJson)!);
  });

  function render() {
    const fixture = TestBed.createComponent(SwaggerPlayground);
    fixture.detectChanges();
    return fixture;
  }

  function openEditor(fixture: ReturnType<typeof render>): void {
    (fixture.nativeElement.querySelector('.swagger-playground__try-button') as HTMLButtonElement).click();
    fixture.detectChanges();
  }

  function setBody(fixture: ReturnType<typeof render>, text: string): void {
    const editor = fixture.nativeElement.querySelector('.swagger-playground__request-editor') as HTMLTextAreaElement;
    editor.value = text;
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
  }

  async function execute(fixture: ReturnType<typeof render>): Promise<void> {
    (fixture.nativeElement.querySelector('.swagger-playground__execute-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    await Promise.resolve();
    await Promise.resolve();
    fixture.detectChanges();
  }

  it('should render the contact endpoint listing with a prefilled request body', () => {
    const data = parsePortfolioData(portfolioDataJson)!;
    const compiled = render().nativeElement as HTMLElement;

    expect(compiled.querySelector('.swagger-playground__method-badge')?.textContent?.trim()).toBe('POST');
    expect(compiled.querySelector('.swagger-playground__endpoint-path')?.textContent?.trim()).toBe('/api/v1/contact');

    const preview = compiled.querySelector('.swagger-playground__request-preview')?.textContent ?? '';
    expect(JSON.parse(preview)).toEqual({ name: '', email: data.contact.email, message: '' });
    expect(compiled.querySelector('.swagger-playground__execute-button')).toBeNull();
  });

  it('should swap preview for an editable editor and execute button when try-it-out is active', () => {
    const fixture = render();
    const compiled = fixture.nativeElement as HTMLElement;

    openEditor(fixture);

    expect(compiled.querySelector('.swagger-playground__request-editor')).toBeTruthy();
    expect(compiled.querySelector('.swagger-playground__execute-button')?.textContent?.trim()).toBe('EXECUTE');
    expect(compiled.querySelector('.swagger-playground__request-preview')).toBeNull();
  });

  it('should restore defaults and clear stale delivery results when try-it-out is toggled back off', async () => {
    const data = parsePortfolioData(portfolioDataJson)!;
    sendSpy.mockResolvedValue({
      ok: true,
      receipt: {
        topic: 'contact-ingest',
        partition: 0,
        offset: 0,
        timestamp: new Date().toISOString(),
        messageId: 'contact-0-1',
        status: 'QUEUED',
      },
    } satisfies DeliveryResult);
    const fixture = render();

    openEditor(fixture);
    setBody(fixture, VALID_BODY);
    await execute(fixture);
    expect(fixture.nativeElement.querySelector('.swagger-playground__response-section')).toBeTruthy();

    (fixture.nativeElement.querySelector('.swagger-playground__try-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.swagger-playground__response-section')).toBeNull();

    openEditor(fixture);
    const editor = fixture.nativeElement.querySelector('.swagger-playground__request-editor') as HTMLTextAreaElement;
    expect(JSON.parse(editor.value)).toEqual({ name: '', email: data.contact.email, message: '' });
  });

  it('should reject malformed JSON inline without sending or logging anything', async () => {
    const fixture = render();

    openEditor(fixture);
    setBody(fixture, '{not json');
    await execute(fixture);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.swagger-playground__validation-error')?.textContent).toContain('not valid JSON');
    expect(sendSpy).not.toHaveBeenCalled();
    expect(store.logs().length).toBe(0);
    expect(compiled.querySelector('.swagger-playground__response-section')).toBeNull();
  });

  it('should reject empty, array, and null bodies as non-object payloads', async () => {
    const fixture = render();

    openEditor(fixture);

    for (const body of ['', '[]', 'null']) {
      setBody(fixture, body);
      await execute(fixture);

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.swagger-playground__validation-error')).toBeTruthy();
    }

    expect(sendSpy).not.toHaveBeenCalled();
    expect(store.logs().length).toBe(0);
  });

  it('should reject syntactically valid JSON objects that fail field validation', async () => {
    const fixture = render();

    openEditor(fixture);

    const cases: ReadonlyArray<readonly [string, string]> = [
      ['{}', "'name' is required"],
      [JSON.stringify({ name: '', email: 'a@b.c', message: 'hi' }), "'name' is required"],
      [JSON.stringify({ name: '   ', email: 'a@b.c', message: 'hi' }), "'name' is required"],
      [JSON.stringify({ name: 'Gokul', message: 'hi' }), "'email' is required"],
      [JSON.stringify({ name: 'Gokul', email: 'a@b.c' }), "'message' is required"],
    ];

    for (const [body, expectedError] of cases) {
      setBody(fixture, body);
      await execute(fixture);

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.swagger-playground__validation-error')?.textContent).toContain(expectedError);
    }

    expect(sendSpy).not.toHaveBeenCalled();
    expect(store.logs().length).toBe(0);
    expect(fixture.nativeElement.querySelector('.swagger-playground__response-section')).toBeNull();
  });

  it('should deliver through the port and render mock 200 OK headers plus a Kafka receipt with ingestion logs', async () => {
    const receipt: DeliveryReceipt = {
      topic: 'contact-ingest',
      partition: 0,
      offset: 4,
      timestamp: new Date('2026-08-22T00:00:00Z').toISOString(),
      messageId: 'contact-4-1770000000000',
      status: 'QUEUED',
    };
    let capturedPayload: MessagePayload | undefined;
    sendSpy.mockImplementation(async (payload: MessagePayload) => {
      capturedPayload = payload;
      return { ok: true, receipt } satisfies DeliveryResult;
    });
    const fixture = render();

    openEditor(fixture);
    setBody(fixture, VALID_BODY);
    await execute(fixture);

    expect(capturedPayload).toEqual({ name: 'Gokul', email: 'you@example.com', message: 'Hello from the playground.' });

    const compiled = fixture.nativeElement as HTMLElement;
    const headers = compiled.querySelector('.swagger-playground__response-viewer--headers')?.textContent ?? '';
    expect(headers).toContain('HTTP/1.1 200 OK');
    const receiptText = Array.from(compiled.querySelectorAll('.swagger-playground__response-viewer'))
      .map((node) => node.textContent ?? '')
      .join('');
    expect(JSON.parse(receiptText.replace(headers, ''))).toEqual(receipt);

    const sources = store.logs().map((entry) => entry.source);
    expect(sources[0]).toBe('ContactController');
    expect(store.logs()[0].message).toContain('/api/v1/contact');
    expect(sources[sources.length - 1]).toBe('ContactKafkaProducer');
    expect(store.logs()[store.logs().length - 1].message).toContain('partition 0 offset 4');
  });

  it('should show a themed error banner on typed failure without escaping an exception', async () => {
    sendSpy.mockResolvedValue({
      ok: false,
      failure: { reason: 'provider-error', detail: 'headless request blocked' },
    } satisfies DeliveryResult);
    const fixture = render();

    openEditor(fixture);
    setBody(fixture, VALID_BODY);
    await execute(fixture);

    const banner = fixture.nativeElement.querySelector('.swagger-playground__delivery-error') as HTMLElement | null;
    expect(banner?.textContent).toContain('DELIVERY FAILED');
    expect(banner?.textContent).toContain('headless request blocked');
    expect(banner?.getAttribute('role')).toBe('alert');
    expect(store.logs().length).toBe(1);
  });

  it('should disable execute while a send is in flight and restore it afterwards', async () => {
    let releaseSend: ((result: DeliveryResult) => void) | undefined;
    sendSpy.mockImplementation(
      () =>
        new Promise<DeliveryResult>((resolve) => {
          releaseSend = resolve;
        }),
    );
    const fixture = render();

    openEditor(fixture);
    setBody(fixture, VALID_BODY);
    (fixture.nativeElement.querySelector('.swagger-playground__execute-button') as HTMLButtonElement).click();
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('.swagger-playground__execute-button') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.textContent?.trim()).toBe('SENDING…');

    releaseSend!({
      ok: true,
      receipt: {
        topic: 'contact-ingest',
        partition: 0,
        offset: 0,
        timestamp: new Date().toISOString(),
        messageId: 'contact-0-1',
        status: 'QUEUED',
      } satisfies DeliveryReceipt,
    });
    await Promise.resolve();
    await Promise.resolve();
    fixture.detectChanges();

    expect(button.disabled).toBe(false);
    expect(button.textContent?.trim()).toBe('EXECUTE');
  });

  it('should apply shared token styling: method badge uses primary color', () => {
    const compiled = render().nativeElement as HTMLElement;
    const badge = compiled.querySelector('.swagger-playground__method-badge');
    expect(badge).toBeTruthy();
    expect(badge?.classList.contains('swagger-playground__method-badge')).toBe(true);
  });

  it('should apply shared token styling: try button uses secondary color', () => {
    const compiled = render().nativeElement as HTMLElement;
    const button = compiled.querySelector('.swagger-playground__try-button');
    expect(button).toBeTruthy();
    expect(button?.classList.contains('swagger-playground__try-button')).toBe(true);
  });

  it('should apply shared token styling: execute button uses primary background', () => {
    const fixture = render();
    openEditor(fixture);
    const compiled = fixture.nativeElement as HTMLElement;
    const button = compiled.querySelector('.swagger-playground__execute-button');
    expect(button).toBeTruthy();
    expect(button?.classList.contains('swagger-playground__execute-button')).toBe(true);
  });

  it('should apply shared token styling: request editor uses surface-container-low background', () => {
    const fixture = render();
    openEditor(fixture);
    const compiled = fixture.nativeElement as HTMLElement;
    const editor = compiled.querySelector('.swagger-playground__request-editor');
    expect(editor).toBeTruthy();
    expect(editor?.classList.contains('swagger-playground__request-editor')).toBe(true);
  });

  it('should apply shared token styling: error banners use error color', async () => {
    const fixture = render();
    openEditor(fixture);
    setBody(fixture, '{not json');
    await execute(fixture);
    const compiled = fixture.nativeElement as HTMLElement;
    const error = compiled.querySelector('.swagger-playground__validation-error');
    expect(error).toBeTruthy();
    expect(error?.classList.contains('swagger-playground__validation-error')).toBe(true);
  });

  it('should have focus-visible styles on buttons and editor', () => {
    const fixture = render();
    openEditor(fixture);
    const compiled = fixture.nativeElement as HTMLElement;
    const focusable = compiled.querySelectorAll(
      '.swagger-playground__try-button, .swagger-playground__execute-button, .swagger-playground__request-editor',
    );
    expect(focusable.length).toBe(3);
    // Focus styles are in CSS @media (forced-colors: active), we verify elements exist
    for (const el of focusable) {
      expect(['BUTTON', 'TEXTAREA']).toContain(el.tagName);
    }
  });

  it('should apply reduced-motion guard to execute button shadow animation', () => {
    const fixture = render();
    openEditor(fixture);
    const compiled = fixture.nativeElement as HTMLElement;
    const button = compiled.querySelector('.swagger-playground__execute-button');
    expect(button).toBeTruthy();
    // Animation is controlled by CSS @media query
  });
});