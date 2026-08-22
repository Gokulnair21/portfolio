import { TestBed } from '@angular/core/testing';
import { send } from '@emailjs/browser';
import { EmailJsAdapter } from './emailjs.adapter';
import { EMAILJS_PUBLIC_KEY, EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID } from './emailjs.config';
import {
  MESSAGE_DELIVERY,
  MessageDelivery,
  MessagePayload,
} from '../message-delivery.port';

vi.mock('@emailjs/browser', () => ({
  send: vi.fn(),
}));

const PAYLOAD: MessagePayload = {
  name: 'Gokul',
  email: 'you@example.com',
  message: 'Hello from the playground.',
};

describe('EmailJsAdapter', () => {
  let adapter: EmailJsAdapter;
  let sdkSend: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [EmailJsAdapter] });
    adapter = TestBed.inject(EmailJsAdapter);
    sdkSend = vi.mocked(send);
    sdkSend.mockReset();
  });

  it('should send through the SDK with placeholder config and template params, then queue a receipt', async () => {
    sdkSend.mockResolvedValue({ status: 200, text: 'OK' });

    const result = await adapter.send(PAYLOAD);

    expect(sdkSend).toHaveBeenCalledWith(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      { from_name: PAYLOAD.name, reply_to: PAYLOAD.email, message: PAYLOAD.message },
      { publicKey: EMAILJS_PUBLIC_KEY },
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.receipt).toMatchObject({
        topic: 'contact-ingest',
        partition: 0,
        offset: 0,
        status: 'QUEUED',
      });
      expect(result.receipt.messageId).toContain('contact-0-');
    }
  });

  it('should hand out monotonically increasing offsets across successful sends', async () => {
    sdkSend.mockResolvedValue({ status: 200, text: 'OK' });

    const first = await adapter.send(PAYLOAD);
    const second = await adapter.send(PAYLOAD);

    expect(first.ok && second.ok).toBe(true);
    if (first.ok && second.ok) {
      expect(second.receipt.offset).toBe(first.receipt.offset + 1);
    }
  });

  it('should map every SDK rejection to a typed provider-error result instead of throwing', async () => {
    sdkSend.mockRejectedValue(new Error('headless request blocked'));

    const result = await adapter.send(PAYLOAD);

    expect(sdkSend).toHaveBeenCalledOnce();
    expect(result).toEqual({
      ok: false,
      failure: { reason: 'provider-error', detail: 'headless request blocked' },
    });
  });
});

describe('MessageDelivery port binding', () => {
  it('should resolve the injection token to the bound adapter and round-trip a typed result', async () => {
    const fakeReceipt = {
      topic: 'contact-ingest',
      partition: 0,
      offset: 7,
      timestamp: new Date().toISOString(),
      messageId: 'contact-7-1',
      status: 'QUEUED',
    };
    const fakeDelivery: MessageDelivery = {
      send: vi.fn().mockResolvedValue({ ok: true, receipt: fakeReceipt }),
    };

    TestBed.configureTestingModule({
      providers: [{ provide: MESSAGE_DELIVERY, useValue: fakeDelivery }],
    });

    const delivery = TestBed.inject(MESSAGE_DELIVERY);
    const result = await delivery.send(PAYLOAD);

    expect(delivery).toBe(fakeDelivery);
    expect(fakeDelivery.send).toHaveBeenCalledWith(PAYLOAD);
    expect(result).toEqual({ ok: true, receipt: fakeReceipt });
  });
});
