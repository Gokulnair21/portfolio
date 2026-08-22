import { Injectable, inject } from '@angular/core';
import { LogEntry } from '../data/portfolio-data';
import { ClusterStateService } from '../state/cluster-state.service';

export const OUTAGE_ERROR_RATE = 41.37;

export const AUTO_RECOVERY_DELAY_MS = 1500;

const SCRIPT = [
  {
    source: 'NetworkMonitor',
    level: 'WARN',
    message: 'Network partition detected: payment-cluster node unreachable',
  },
  {
    source: 'SqlExceptionHelper',
    level: 'ERROR',
    message:
      'Connection limit exceeded: could not open JDBC connection for transaction [payment-processing]',
  },
  {
    source: 'PaymentCircuitBreaker',
    level: 'WARN',
    message: 'PaymentCircuitBreaker CLOSED -> OPEN',
  },
] as const satisfies ReadonlyArray<Omit<LogEntry, 'timestamp'>>;

const RECOVERY_STAGE_1 = [
  {
    source: 'PaymentCircuitBreaker',
    level: 'INFO',
    message: 'PaymentCircuitBreaker OPEN -> HALF-OPEN',
  },
  {
    source: 'FallbackCacheService',
    level: 'WARN',
    message: 'Serving stale cached reads from fallback cache (circuit half-open)',
  },
] as const satisfies ReadonlyArray<Omit<LogEntry, 'timestamp'>>;

const RECOVERY_STAGE_2 = [
  {
    source: 'ConnectionValidator',
    level: 'INFO',
    message: 'Mock connection validation succeeded: payment-cluster node reachable',
  },
  {
    source: 'PaymentCircuitBreaker',
    level: 'INFO',
    message: 'PaymentCircuitBreaker HALF-OPEN -> CLOSED',
  },
] as const satisfies ReadonlyArray<Omit<LogEntry, 'timestamp'>>;

@Injectable()
export class SimulationEngine {
  readonly #store = inject(ClusterStateService);
  #lastTimestampMs = 0;

  triggerNetworkOutage(): void {
    if (this.#store.dataStatus() !== 'ready') return;
    if (!this.#store.beginOutage(OUTAGE_ERROR_RATE)) return;
    this.#appendScript(SCRIPT);
  }

  triggerAutoRecovery(): void {
    if (this.#store.dataStatus() !== 'ready') return;
    if (!this.#store.markHalfOpen()) return;
    this.#appendScript(RECOVERY_STAGE_1);
    setTimeout(() => {
      if (this.#store.outage()?.status !== 'HALF-OPEN') return;
      this.#appendScript(RECOVERY_STAGE_2);
      this.#store.clearOutage();
    }, AUTO_RECOVERY_DELAY_MS);
  }

  #appendScript(
    script: ReadonlyArray<Omit<LogEntry, 'timestamp'>>,
  ): void {
    for (const entry of script) {
      const timestampMs = Math.max(Date.now(), this.#lastTimestampMs + 1);
      this.#lastTimestampMs = timestampMs;
      this.#store.appendLog({ ...entry, timestamp: new Date(timestampMs).toISOString() });
    }
  }
}
