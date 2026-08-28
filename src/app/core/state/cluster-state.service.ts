import { effect, Injectable, computed, signal } from '@angular/core';
import {
  ClusterStatus,
  Lens,
  LensStringMap,
  LogEntry,
  PortfolioData,
  TopologyMetric,
  TopologyNode,
} from '../data/portfolio-data';
import { DEFAULT_TAB, TabId } from './tabs';

export type { Lens } from '../data/portfolio-data';
export const LENS_STORAGE_KEY = 'portfolio:lens';

function isLens(value: unknown): value is Lens {
  return value === 'recruiter' || value === 'engineer';
}

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
export const LOG_CAP_MOBILE = 100;

const NO_NODE_ID = null;

const OUTAGE_PAYMENT_NODE_ID = 'payment-service';
export const OUTAGE_DEGRADED_NODE_IDS: readonly string[] = [
  OUTAGE_PAYMENT_NODE_ID,
  'core-bank-db',
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
  readonly #terminalVisible = signal<boolean>(false);
  readonly #lens = signal<Lens>('recruiter');

  readonly selectedTab = this.#tab.asReadonly();
  readonly dataStatus = this.#dataStatus.asReadonly();
  readonly content = this.#content.asReadonly();
  readonly logs = this.#logs.asReadonly();
  readonly outage = this.#outage.asReadonly();
  readonly selectedNodeId = this.#selectedNodeId.asReadonly();
  readonly selectedPodIndex = this.#selectedPodIndex.asReadonly();
  readonly terminalVisible = this.#terminalVisible.asReadonly();
  readonly lens = this.#lens.asReadonly();

  constructor() {
    // Hydrate lens before first paint, with Recruiter default and corrupted fallback
    try {
      if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
        const stored = window.localStorage.getItem(LENS_STORAGE_KEY);
        if (isLens(stored)) {
          this.#lens.set(stored);
        } else {
          // FIRST_VISIT or CORRUPTED: ensure default persisted
          this.#lens.set('recruiter');
          try {
            window.localStorage.setItem(LENS_STORAGE_KEY, 'recruiter');
          } catch {
            // Swallow storage unavailable
          }
        }
      }
    } catch {
      // Swallow storage unavailable / SSR
    }

    // Persist lens changes immediately via effect
    effect(() => {
      const current = this.#lens();
      try {
        if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
          window.localStorage.setItem(LENS_STORAGE_KEY, current);
        }
      } catch {
        // Swallow storage unavailable
      }
    });
  }

  readonly topologyNodes = computed<TopologyNode[]>(() => this.#content()?.topology.nodes ?? []);
  readonly topologyLinks = computed(() => this.#content()?.topology.links ?? []);
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
    const isMobile =
      typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        ? window.matchMedia('(max-width: 767px)').matches
        : false;
    const cap = isMobile ? LOG_CAP_MOBILE : LOG_CAP;
    this.#logs.update((current) => [...current, entry].slice(-cap));
  }

  /** Test helper: append with explicit cap (avoids needing to mock matchMedia) */
  appendLogWithCap(entry: LogEntry, cap: number): void {
    this.#logs.update((current) => [...current, entry].slice(-cap));
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

  toggleTerminal(): void {
    this.#terminalVisible.update((v) => !v);
  }

  setTerminalVisible(visible: boolean): void {
    this.#terminalVisible.set(visible);
  }

  setLens(lens: Lens): void {
    if (isLens(lens)) this.#lens.set(lens);
  }

  toggleLens(): void {
    this.#lens.update((v) => (v === 'recruiter' ? 'engineer' : 'recruiter'));
  }

  // ---- Lens-aware computed selectors with fallback to base content ----

  private static readonly FALLBACK_RECRUITER_BIO =
    'Architecting resilient, high-throughput microservices within the Spring Boot ecosystem. Specializing in JVM performance tuning, distributed systems observability, and building self-healing infrastructures.';
  private static readonly FALLBACK_ENGINEER_BIO =
    'Spring Boot microservices (BFF, onboarding, payments, deposits) on Kafka + Redis + MySQL. P99 <51ms, 210 txn/s idempotent payments, mTLS/AES, circuit-breakers, Drools BRMS — multi-region replication (Algeria, Egypt, Tunisia).';

  readonly displayProfileBio = computed(() => {
    const byLens = this.#content()?.display?.profileBioByLens;
    const lens = this.#lens();
    const variant = byLens?.[lens]?.trim();
    if (variant && variant.length > 0) return variant;
    return lens === 'engineer' ? ClusterStateService.FALLBACK_ENGINEER_BIO : ClusterStateService.FALLBACK_RECRUITER_BIO;
  });

  readonly displayHealthTagline = computed(() => {
    const byLens = this.#content()?.display?.healthTaglineByLens;
    const lens = this.#lens();
    const variant = byLens?.[lens]?.trim();
    if (variant && variant.length > 0) return variant;
    return lens === 'engineer'
      ? 'P99 latencies <60ms, 0% double-debit, replicated MySQL — observability via Dynatrace.'
      : 'Resilient platform serving 60k+ employees across 3 countries with 99.9% uptime.';
  });

  readonly selectedNodeDisplayDescription = computed(() => {
    const node = this.selectedNode();
    if (!node) return '';
    const variant = node.lensDescription?.[this.#lens()]?.trim();
    if (variant && variant.length > 0) return variant;
    return node.description;
  });

  getNodeDisplayDescription(node: TopologyNode): string {
    const v = node.lensDescription?.[this.#lens()]?.trim();
    if (v && v.length > 0) return v;
    return node.description;
  }

  getProjectDisplayDescription(project: { description: string; lensDescription?: LensStringMap }): string {
    const v = project.lensDescription?.[this.#lens()]?.trim();
    if (v && v.length > 0) return v;
    return project.description;
  }

  getExperienceDisplayHighlights(entry: { highlights: string[]; highlightsByLens?: { recruiter?: string[]; engineer?: string[] } }): string[] {
    const arr = entry.highlightsByLens?.[this.#lens()];
    if (arr && arr.length > 0 && arr.some((s) => s.trim().length > 0)) {
      const filtered = arr.map((s) => s.trim()).filter((s) => s.length > 0);
      if (filtered.length > 0) return filtered;
    }
    return entry.highlights;
  }
}
