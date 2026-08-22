import { TestBed } from '@angular/core/testing';
import { PortfolioData } from '../data/portfolio-data';
import { ClusterStateService } from '../state/cluster-state.service';
import { OUTAGE_ERROR_RATE, SimulationEngine } from './simulation-engine';

const SCRIPT_SOURCES = ['NetworkMonitor', 'SqlExceptionHelper', 'PaymentCircuitBreaker'];

const VALID_DATA: PortfolioData = {
  projects: [],
  experience: [],
  contact: {
    email: 'you@example.com',
    github: 'https://github.com/your-handle',
    linkedin: 'https://www.linkedin.com/in/your-handle',
  },
  envProperties: [],
  health: { liveness: 'UP', brokerTotal: 2, brokerActive: 2, errorRate: 0 },
};

describe('SimulationEngine', () => {
  let store: ClusterStateService;
  let engine: SimulationEngine;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ClusterStateService, SimulationEngine],
    });
    store = TestBed.inject(ClusterStateService);
    engine = TestBed.inject(SimulationEngine);
    store.hydrate(VALID_DATA);
  });

  it('should be created with the store injected', () => {
    expect(engine).toBeTruthy();
  });

  it('should transition an UP system to DEGRADED with a spiked error rate', () => {
    expect(store.livenessStatus()).toBe('UP');

    engine.triggerNetworkOutage();

    expect(store.livenessStatus()).toBe('DEGRADED');
    expect(store.livenessUp()).toBe(false);
    expect(store.errorRateIsZero()).toBe(false);
    expect(store.errorRate()).toBe(`${OUTAGE_ERROR_RATE.toFixed(2)}%`);
  });

  it('should append the scripted failure logs in order ending with the circuit breaker transition', () => {
    engine.triggerNetworkOutage();

    const logs = store.logs();
    const sources = logs.map((entry) => entry.source);
    expect(logs.length).toBe(SCRIPT_SOURCES.length);
    expect(sources).toEqual(SCRIPT_SOURCES);

    expect(
      logs.find((entry) => entry.source === 'SqlExceptionHelper')!.message,
    ).toContain('Connection limit exceeded');
    expect(
      logs.find((entry) => entry.source === 'PaymentCircuitBreaker')!.message,
    ).toContain('PaymentCircuitBreaker CLOSED -> OPEN');

    for (const entry of logs) {
      expect(() => new Date(entry.timestamp).toISOString()).not.toThrow();
      expect(new Date(entry.timestamp).toISOString()).toBe(entry.timestamp);
      expect(['INFO', 'WARN', 'ERROR']).toContain(entry.level);
    }
  });

  it('should stagger scripted log timestamps so entries do not collide', () => {
    engine.triggerNetworkOutage();

    const timestamps = store.logs().map((entry) => entry.timestamp);
    expect(new Set(timestamps).size).toBe(timestamps.length);
  });

  it('should ignore commands before hydration or after a load failure', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [ClusterStateService, SimulationEngine],
    });
    store = TestBed.inject(ClusterStateService);
    engine = TestBed.inject(SimulationEngine);

    engine.triggerNetworkOutage();
    expect(store.outage()).toBeNull();
    expect(store.logs()).toEqual([]);
    expect(store.livenessStatus()).toBe('UP');

    store.markLoadFailed();
    engine.triggerNetworkOutage();
    expect(store.outage()).toBeNull();
    expect(store.logs()).toEqual([]);
    expect(store.livenessStatus()).toBe('UP');
  });

  it('should ignore repeat commands while an outage is active (no duplicate script)', () => {
    engine.triggerNetworkOutage();
    const statusAfterFirst = store.livenessStatus();
    const rateAfterFirst = store.errorRate();
    const logCountAfterFirst = store.logs().length;

    engine.triggerNetworkOutage();

    expect(store.livenessStatus()).toBe(statusAfterFirst);
    expect(store.errorRate()).toBe(rateAfterFirst);
    expect(store.logs().length).toBe(logCountAfterFirst);
  });

  it('should leave hydrated JSON content untouched (overlay-only write)', () => {
    engine.triggerNetworkOutage();

    expect(store.content()).toEqual(VALID_DATA);
  });

  it('should be the only mutation path needed by UI controls', () => {
    engine.triggerNetworkOutage();

    expect(store.outage()).not.toBeNull();
    expect(store.outage()!.status).toBe('DEGRADED');
    expect((store as { outage: unknown }).outage).not.toHaveProperty('set');

    const componentSurface = Object.getOwnPropertyNames(Object.getPrototypeOf(engine));
    expect(componentSurface).toContain('triggerNetworkOutage');
  });
});
