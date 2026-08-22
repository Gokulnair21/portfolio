import { Injectable, computed, signal } from '@angular/core';
import { ClusterStatus, LogEntry, PortfolioData } from '../data/portfolio-data';
import { DEFAULT_TAB, TabId } from './tabs';

export type DataStatus = 'loading' | 'ready' | 'failed';

export interface OutageOverlay {
  readonly status: ClusterStatus;
  readonly errorRate: number;
}

const DEFAULT_LIVENESS = 'UP';
const DEFAULT_BROKER_ACTIVE = 2;
const DEFAULT_BROKER_TOTAL = 2;
const DEFAULT_ERROR_RATE = 0;
export const LOG_CAP = 200;

@Injectable()
export class ClusterStateService {
  readonly #tab = signal<TabId>(DEFAULT_TAB);
  readonly #dataStatus = signal<DataStatus>('loading');
  readonly #content = signal<PortfolioData | null>(null);
  readonly #logs = signal<LogEntry[]>([]);
  readonly #outage = signal<OutageOverlay | null>(null);

  readonly selectedTab = this.#tab.asReadonly();
  readonly dataStatus = this.#dataStatus.asReadonly();
  readonly content = this.#content.asReadonly();
  readonly logs = this.#logs.asReadonly();
  readonly outage = this.#outage.asReadonly();

  readonly livenessStatus = computed<ClusterStatus>(() => {
    if (this.#outage() !== null) return this.#outage()!.status;
    return (this.#content()?.health?.liveness ?? DEFAULT_LIVENESS) as ClusterStatus;
  });
  readonly livenessUp = computed(() => this.livenessStatus() === DEFAULT_LIVENESS);
  readonly brokerConnections = computed(
    () =>
      `${this.#content()?.health?.brokerActive ?? DEFAULT_BROKER_ACTIVE} / ${
        this.#content()?.health?.brokerTotal ?? DEFAULT_BROKER_TOTAL
      }`,
  );
  readonly #currentErrorRate = computed(
    () => this.#outage()?.errorRate ?? (this.#content()?.health?.errorRate ?? DEFAULT_ERROR_RATE),
  );
  readonly errorRate = computed(() => `${this.#currentErrorRate().toFixed(2)}%`);
  readonly errorRateIsZero = computed(() => this.#currentErrorRate() === 0);

  selectTab(id: TabId): void {
    this.#tab.set(id);
  }

  hydrate(data: PortfolioData): void {
    this.#content.set(data);
    this.#dataStatus.set('ready');
  }

  markLoadFailed(): void {
    this.#content.set(null);
    this.#dataStatus.set('failed');
  }

  appendLog(entry: LogEntry): void {
    this.#logs.update((current) => [...current, entry].slice(-LOG_CAP));
  }

  beginOutage(errorRate: number): boolean {
    if (this.#outage() !== null) return false;
    this.#outage.set({ status: 'DEGRADED', errorRate });
    return true;
  }

  clearOutage(): boolean {
    if (this.#outage() === null) return false;
    this.#outage.set(null);
    return true;
  }
}
