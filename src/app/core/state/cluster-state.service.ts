import { Injectable, computed, signal } from '@angular/core';
import {
  ClusterStatus,
  LogEntry,
  PortfolioData,
  TopologyMetric,
  TopologyNode,
} from '../data/portfolio-data';
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

const NO_NODE_ID = null;

const OUTAGE_PAYMENT_NODE_ID = 'payment-service';
export const OUTAGE_DEGRADED_NODE_IDS: readonly string[] = [
  OUTAGE_PAYMENT_NODE_ID,
  'postgresql-db',
];
const OUTAGE_METRIC_KEYWORD = 'error';
const OUTAGE_ERROR_RATE_DISPLAY = '100%';
const EMPTY_NODE_ID_SET: ReadonlySet<string> = new Set<string>();

@Injectable()
export class ClusterStateService {
  readonly #tab = signal<TabId>(DEFAULT_TAB);
  readonly #dataStatus = signal<DataStatus>('loading');
  readonly #content = signal<PortfolioData | null>(null);
  readonly #logs = signal<LogEntry[]>([]);
  readonly #outage = signal<OutageOverlay | null>(null);
  readonly #selectedNodeId = signal<string | null>(NO_NODE_ID);
  readonly #selectedPodIndex = signal<number | null>(null);

  readonly selectedTab = this.#tab.asReadonly();
  readonly dataStatus = this.#dataStatus.asReadonly();
  readonly content = this.#content.asReadonly();
  readonly logs = this.#logs.asReadonly();
  readonly outage = this.#outage.asReadonly();
  readonly selectedNodeId = this.#selectedNodeId.asReadonly();
  readonly selectedPodIndex = this.#selectedPodIndex.asReadonly();

  readonly topologyNodes = computed<TopologyNode[]>(
    () => this.#content()?.topology?.nodes ?? [],
  );
  readonly topologyLinks = computed(() => this.#content()?.topology?.links ?? []);
  readonly selectedNode = computed<TopologyNode | null>(() => {
    const id = this.#selectedNodeId();
    return this.topologyNodes().find((node) => node.id === id) ?? null;
  });

  readonly outageActive = computed(() => this.#outage() !== null);
  readonly outageDegradedNodeIds = computed<ReadonlySet<string>>(() =>
    this.outageActive() ? new Set(OUTAGE_DEGRADED_NODE_IDS) : EMPTY_NODE_ID_SET,
  );
  readonly selectedNodeMetrics = computed<readonly TopologyMetric[]>(() => {
    const node = this.selectedNode();
    if (!node) return [];
    if (!this.outageActive() || node.id !== OUTAGE_PAYMENT_NODE_ID) return node.metrics;
    return node.metrics.map((metric) =>
      metric.label.toLowerCase().includes(OUTAGE_METRIC_KEYWORD)
        ? { ...metric, value: OUTAGE_ERROR_RATE_DISPLAY }
        : metric,
    );
  });

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

  selectNode(id: string | null): void {
    this.#selectedNodeId.set(id);
  }

  selectPod(index: number | null): void {
    this.#selectedPodIndex.set(index);
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

  markHalfOpen(): boolean {
    let changed = false;
    this.#outage.update((overlay) => {
      if (overlay?.status !== 'DEGRADED') return overlay;
      changed = true;
      return { ...overlay, status: 'HALF-OPEN' };
    });
    return changed;
  }

  clearOutage(): boolean {
    if (this.#outage() === null) return false;
    this.#outage.set(null);
    return true;
  }
}
