import { Injectable, inject } from '@angular/core';
import { LogEntry } from '../data/portfolio-data';
import { ClusterStateService } from '../state/cluster-state.service';

export const OUTAGE_ERROR_RATE = 41.37;

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

@Injectable()
export class SimulationEngine {
  readonly #store = inject(ClusterStateService);

  triggerNetworkOutage(): void {
    if (this.#store.dataStatus() !== 'ready') return;
    if (!this.#store.beginOutage(OUTAGE_ERROR_RATE)) return;
    for (const [index, entry] of SCRIPT.entries()) {
      this.#store.appendLog({ ...entry, timestamp: new Date(Date.now() + index).toISOString() });
    }
  }
}
