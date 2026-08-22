import { TestBed } from '@angular/core/testing';
import { PortfolioData } from '../data/portfolio-data';
import { ClusterStateService } from '../state/cluster-state.service';
import { vi } from 'vitest';
import {
  AUTO_RECOVERY_DELAY_MS,
  OUTAGE_ERROR_RATE,
  SimulationEngine,
} from './simulation-engine';

const SCRIPT_SOURCES = ['NetworkMonitor', 'SqlExceptionHelper', 'PaymentCircuitBreaker'];

const RECOVERY_STAGE_1_SOURCES = ['PaymentCircuitBreaker', 'FallbackCacheService'];
const RECOVERY_STAGE_2_SOURCES = ['ConnectionValidator', 'PaymentCircuitBreaker'];

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

  describe('triggerAutoRecovery', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should run the full UP -> DEGRADED -> HALF-OPEN -> UP lifecycle in two staged phases', () => {
      engine.triggerNetworkOutage();
      expect(store.livenessStatus()).toBe('DEGRADED');
      const outageLogCount = store.logs().length;

      vi.advanceTimersByTime(10);
      engine.triggerAutoRecovery();

      const stage1 = store.logs().slice(outageLogCount);
      expect(store.outage()!.status).toBe('HALF-OPEN');
      expect(store.livenessStatus()).toBe('HALF-OPEN');
      expect(store.livenessUp()).toBe(false);
      expect(store.errorRate()).toBe(`${OUTAGE_ERROR_RATE.toFixed(2)}%`);
      expect(stage1.map((entry) => entry.source)).toEqual(RECOVERY_STAGE_1_SOURCES);
      expect(stage1[0].level).toBe('INFO');
      expect(stage1[0].message).toContain('PaymentCircuitBreaker OPEN -> HALF-OPEN');
      expect(stage1[1].level).toBe('WARN');
      expect(stage1[1].message).toContain('fallback cache');

      vi.advanceTimersByTime(AUTO_RECOVERY_DELAY_MS - 1);
      expect(store.livenessStatus()).toBe('HALF-OPEN');
      expect(store.logs().length).toBe(outageLogCount + stage1.length);

      vi.advanceTimersByTime(1);

      const stage2 = store.logs().slice(outageLogCount + stage1.length);
      expect(stage2.map((entry) => entry.source)).toEqual(RECOVERY_STAGE_2_SOURCES);
      expect(stage2[0].level).toBe('INFO');
      expect(stage2[0].message).toContain('Mock connection validation succeeded');
      expect(stage2[1].message).toContain('PaymentCircuitBreaker HALF-OPEN -> CLOSED');

      expect(store.outage()).toBeNull();
      expect(store.livenessStatus()).toBe('UP');
      expect(store.livenessUp()).toBe(true);
      expect(store.errorRate()).toBe('0.00%');
      expect(store.errorRateIsZero()).toBe(true);

      const all = store.logs();
      const timestamps = all.map((entry) => entry.timestamp);
      expect(new Set(timestamps).size).toBe(timestamps.length);
      for (const entry of all) {
        expect(new Date(entry.timestamp).toISOString()).toBe(entry.timestamp);
        expect(['INFO', 'WARN', 'ERROR']).toContain(entry.level);
      }
    });

    it('should silently no-op when the system is UP with no active outage', () => {
      engine.triggerAutoRecovery();

      expect(store.outage()).toBeNull();
      expect(store.logs()).toEqual([]);
      expect(store.livenessStatus()).toBe('UP');
      vi.advanceTimersByTime(AUTO_RECOVERY_DELAY_MS * 10);
      expect(store.logs()).toEqual([]);
    });

    it('should silently no-op before hydration', () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [ClusterStateService, SimulationEngine],
      });
      store = TestBed.inject(ClusterStateService);
      engine = TestBed.inject(SimulationEngine);

      engine.triggerAutoRecovery();

      expect(store.outage()).toBeNull();
      expect(store.logs()).toEqual([]);
      expect(store.livenessStatus()).toBe('UP');
    });

    it('should ignore repeat clicks mid-recovery so exactly one recovery runs per outage', () => {
      engine.triggerNetworkOutage();
      vi.advanceTimersByTime(10);
      engine.triggerAutoRecovery();
      const logCountAfterStage1 = store.logs().length;

      engine.triggerAutoRecovery();

      expect(store.logs().length).toBe(logCountAfterStage1);

      vi.advanceTimersByTime(AUTO_RECOVERY_DELAY_MS);

      const stage2 = store.logs().slice(logCountAfterStage1);
      expect(stage2.map((entry) => entry.message)).toEqual([
        expect.stringContaining('Mock connection validation succeeded'),
        expect.stringContaining('PaymentCircuitBreaker HALF-OPEN -> CLOSED'),
      ]);
      expect(store.logs().length).toBe(logCountAfterStage1 + RECOVERY_STAGE_2_SOURCES.length);
      expect(store.livenessStatus()).toBe('UP');
    });

    it('should leave hydrated JSON content untouched during recovery (overlay-only write)', () => {
      engine.triggerNetworkOutage();
      engine.triggerAutoRecovery();
      vi.advanceTimersByTime(AUTO_RECOVERY_DELAY_MS);

      expect(store.content()).toEqual(VALID_DATA);
    });

    it('should yield unique strictly-ordered timestamps when recovery starts immediately after an outage', () => {
      engine.triggerNetworkOutage();
      engine.triggerAutoRecovery();
      vi.advanceTimersByTime(AUTO_RECOVERY_DELAY_MS);

      const timestamps = store.logs().map((entry) => entry.timestamp);
      expect(new Set(timestamps).size).toBe(timestamps.length);
      const ms = timestamps.map((timestamp) => new Date(timestamp).getTime());
      for (let i = 1; i < ms.length; i++) {
        expect(ms[i]).toBeGreaterThan(ms[i - 1]);
      }
    });

    it('should reject a network outage while the overlay is HALF-OPEN (no-op)', () => {
      engine.triggerNetworkOutage();
      vi.advanceTimersByTime(10);
      engine.triggerAutoRecovery();
      const logCountAfterStage1 = store.logs().length;

      engine.triggerNetworkOutage();

      expect(store.logs().length).toBe(logCountAfterStage1);
      expect(store.outage()!.status).toBe('HALF-OPEN');
    });
  });
});
