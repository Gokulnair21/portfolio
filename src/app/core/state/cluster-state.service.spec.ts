import { TestBed } from '@angular/core/testing';
import { LogEntry, PortfolioData, TopologyNode } from '../data/portfolio-data';
import { ClusterStateService, LOG_CAP } from './cluster-state.service';
import { TabId } from './tabs';

function makeLog(index: number): LogEntry {
  return {
    timestamp: new Date(Date.UTC(2026, 0, 1, 0, 0, index)).toISOString(),
    source: 'test-source',
    level: index % 3 === 2 ? 'ERROR' : index % 3 === 1 ? 'WARN' : 'INFO',
    message: `entry-${index}`,
  };
}

export function makeTopologyNode(id: string): TopologyNode {
  return {
    id,
    label: id,
    description: `${id} description`,
    techStack: ['Java'],
    metrics: [{ label: 'Error Rate', value: '0.01%' }],
  };
}

const VALID_DATA: PortfolioData = {
  projects: [
    {
      name: 'cluster-control',
      description: 'Ops console.',
      stack: ['Angular'],
      repoUrl: 'https://github.com/example/cluster-control',
    },
  ],
  experience: [],
  topology: {
    nodes: [makeTopologyNode('payment-service'), makeTopologyNode('postgresql-db')],
    links: [{ source: 'payment-service', target: 'postgresql-db' }],
  },
  contact: {
    email: 'you@example.com',
    github: 'https://github.com/your-handle',
    linkedin: 'https://www.linkedin.com/in/your-handle',
  },
  envProperties: [{ key: 'cluster.region', value: 'eu-central-1' }],
  health: { liveness: 'UP', brokerTotal: 2, brokerActive: 2, errorRate: 0 },
};

describe('ClusterStateService', () => {
  let store: ClusterStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [ClusterStateService] });
    store = TestBed.inject(ClusterStateService);
  });

  it('should default selectedTab to health-dashboard', () => {
    expect(store.selectedTab()).toBe('health-dashboard');
  });

  it('should expose selectedTab as read-only', () => {
    expect((store as { selectedTab: unknown }).selectedTab).not.toHaveProperty('set');
  });

  it('should transition to the selected tab', () => {
    const targets: TabId[] = [
      'terminal-console',
      'service-topology',
      'env-registry',
      'career-pods',
      'swagger-playground',
    ];

    for (const target of targets) {
      store.selectTab(target);
      expect(store.selectedTab()).toBe(target);
    }
  });

  it('should be idempotent on re-select of the active tab', () => {
    store.selectTab('career-pods');
    const before = store.selectedTab();

    store.selectTab('career-pods');

    expect(store.selectedTab()).toBe(before);
  });

  it('should default dataStatus to loading and content to null', () => {
    expect(store.dataStatus()).toBe('loading');
    expect(store.content()).toBeNull();
  });

  it('should expose FR1 health defaults before hydration', () => {
    expect(store.livenessStatus()).toBe('UP');
    expect(store.brokerConnections()).toBe('2 / 2');
    expect(store.errorRate()).toBe('0.00%');
  });

  it('should derive health selectors from hydrated JSON values', () => {
    store.hydrate({
      ...VALID_DATA,
      health: { liveness: 'DOWN', brokerTotal: 4, brokerActive: 3, errorRate: 0.5 },
    });

    expect(store.livenessStatus()).toBe('DOWN');
    expect(store.brokerConnections()).toBe('3 / 4');
    expect(store.errorRate()).toBe('0.50%');
  });

  it('should fall back to FR1 health defaults after markLoadFailed', () => {
    store.hydrate(VALID_DATA);
    store.markLoadFailed();

    expect(store.livenessStatus()).toBe('UP');
    expect(store.brokerConnections()).toBe('2 / 2');
    expect(store.errorRate()).toBe('0.00%');
  });

  it('should transition loading to ready and set content on hydrate', () => {
    store.hydrate(VALID_DATA);

    expect(store.dataStatus()).toBe('ready');
    expect(store.content()).toEqual(VALID_DATA);
  });

  it('should transition loading to failed with no content on markLoadFailed', () => {
    store.markLoadFailed();

    expect(store.dataStatus()).toBe('failed');
    expect(store.content()).toBeNull();
  });

  it('should clear content when a previously hydrated store fails', () => {
    store.hydrate(VALID_DATA);

    store.markLoadFailed();

    expect(store.dataStatus()).toBe('failed');
    expect(store.content()).toBeNull();
  });

  it('should expose content as read-only', () => {
    expect((store as { content: unknown }).content).not.toHaveProperty('set');
    expect((store as { dataStatus: unknown }).dataStatus).not.toHaveProperty('set');
  });

  it('should start with an empty log', () => {
    expect(store.logs()).toEqual([]);
  });

  it('should append entries in order below the cap', () => {
    store.appendLog(makeLog(0));
    store.appendLog(makeLog(1));
    store.appendLog(makeLog(2));

    const logs = store.logs();
    expect(logs.map((entry) => entry.message)).toEqual(['entry-0', 'entry-1', 'entry-2']);
    expect(logs[1]).toEqual({
      timestamp: makeLog(1).timestamp,
      source: 'test-source',
      level: 'WARN',
      message: 'entry-1',
    });
  });

  it('should cap logs at exactly 200 entries, dropping the oldest', () => {
    for (let index = 0; index < LOG_CAP + 5; index++) {
      store.appendLog(makeLog(index));
    }

    const logs = store.logs();
    expect(logs.length).toBe(LOG_CAP);
    expect(logs[0].message).toBe('entry-5');
    expect(logs[LOG_CAP - 1].message).toBe(`entry-${LOG_CAP + 4}`);
    expect(logs.every((entry) => !['entry-0', 'entry-4'].includes(entry.message))).toBe(true);
  });

  it('should keep length stable at the cap once reached', () => {
    for (let index = 0; index < LOG_CAP; index++) {
      store.appendLog(makeLog(index));
    }

    store.appendLog(makeLog(LOG_CAP));

    expect(store.logs().length).toBe(LOG_CAP);
    expect(store.logs()[0].message).toBe('entry-1');
  });

  it('should expose logs as read-only', () => {
    expect((store as { logs: unknown }).logs).not.toHaveProperty('set');
  });

  describe('topology node selection', () => {
    it('should default selectedNodeId to null with no selected node', () => {
      store.hydrate(VALID_DATA);

      expect(store.selectedNodeId()).toBeNull();
      expect(store.selectedNode()).toBeNull();
      expect((store as { selectedNodeId: unknown }).selectedNodeId).not.toHaveProperty('set');
    });

    it('should expose empty topology lists before hydration', () => {
      expect(store.topologyNodes()).toEqual([]);
      expect(store.topologyLinks()).toEqual([]);
    });

    it('should expose the shipped topology nodes and links from hydrated content', () => {
      store.hydrate(VALID_DATA);

      expect(store.topologyNodes().map((node) => node.id)).toEqual([
        'payment-service',
        'postgresql-db',
      ]);
      expect(store.topologyLinks()).toEqual([
        { source: 'payment-service', target: 'postgresql-db' },
      ]);
    });

    it('should resolve the selected node to its typed content entry', () => {
      store.hydrate(VALID_DATA);

      store.selectNode('postgresql-db');

      expect(store.selectedNode()?.id).toBe('postgresql-db');
      expect(store.selectedNode()?.description).toBe('postgresql-db description');
    });

    it('should resolve to null when the selection does not match any node id', () => {
      store.hydrate(VALID_DATA);

      store.selectNode('does-not-exist');

      expect(store.selectedNode()).toBeNull();
    });

    it('should keep exactly one node selected when switching selections', () => {
      store.hydrate(VALID_DATA);
      store.selectNode('payment-service');

      store.selectNode('postgresql-db');

      expect(store.selectedNodeId()).toBe('postgresql-db');
      expect(store.selectedNode()?.id).toBe('postgresql-db');
    });
  });

  describe('topology outage degradation', () => {
    it('should report no active outage or degraded nodes before any transition', () => {
      store.hydrate(VALID_DATA);

      expect(store.outageActive()).toBe(false);
      expect(store.outageDegradedNodeIds().size).toBe(0);
    });

    it('should expose payment-service and postgresql-db as degraded while an outage is active', () => {
      store.hydrate(VALID_DATA);

      store.beginOutage(41.37);

      expect(store.outageActive()).toBe(true);
      expect([...store.outageDegradedNodeIds()].sort()).toEqual([
        'payment-service',
        'postgresql-db',
      ]);
    });

    it('should overlay a 100% error rate on selected payment-service metrics during an outage', () => {
      store.hydrate(VALID_DATA);
      store.selectNode('payment-service');
      expect(store.selectedNodeMetrics()[0]!.value).toBe('0.01%');

      store.beginOutage(41.37);

      const errorMetric = store
        .selectedNodeMetrics()
        .find((metric) => metric.label.toLowerCase().includes('error'));
      expect(errorMetric!.value).toBe('100%');
    });

    it('should leave non-error metrics and other nodes untouched during an outage', () => {
      store.hydrate(VALID_DATA);
      store.selectNode('postgresql-db');

      store.beginOutage(41.37);

      expect(store.selectedNodeMetrics().map((metric) => metric.value)).toEqual(['0.01%']);
      expect(store.selectedNodeMetrics()).toEqual(
        VALID_DATA.topology.nodes.find((node) => node.id === 'postgresql-db')!.metrics,
      );
    });

    it('should restore normal styling inputs automatically once the outage clears', () => {
      store.hydrate(VALID_DATA);
      store.selectNode('payment-service');
      store.beginOutage(41.37);

      store.clearOutage();

      expect(store.outageActive()).toBe(false);
      expect(store.outageDegradedNodeIds().size).toBe(0);
      expect(store.selectedNodeMetrics()).toEqual(
        VALID_DATA.topology.nodes.find((node) => node.id === 'payment-service')!.metrics,
      );
    });
  });

  describe('outage overlay', () => {
    it('should expose outage as null before any transition', () => {
      expect(store.outage()).toBeNull();
      expect((store as { outage: unknown }).outage).not.toHaveProperty('set');
    });

    it('should layer degraded selectors over hydrated JSON defaults during an outage', () => {
      store.hydrate({
        ...VALID_DATA,
        health: { liveness: 'UP', brokerTotal: 4, brokerActive: 3, errorRate: 0.5 },
      });

      expect(store.beginOutage(41.37)).toBe(true);

      expect(store.livenessStatus()).toBe('DEGRADED');
      expect(store.livenessUp()).toBe(false);
      expect(store.errorRate()).toBe('41.37%');
      expect(store.errorRateIsZero()).toBe(false);
    });

    it('should win over JSON defaults even when content reports DOWN and a nonzero rate', () => {
      store.hydrate({
        ...VALID_DATA,
        health: { liveness: 'DOWN', brokerTotal: 2, brokerActive: 1, errorRate: 7.5 },
      });

      store.beginOutage(12.5);

      expect(store.livenessStatus()).toBe('DEGRADED');
      expect(store.errorRate()).toBe('12.50%');
    });

    it('should guard beginOutage idempotently so repeat writes are ignored', () => {
      expect(store.beginOutage(41.37)).toBe(true);
      const rate = store.errorRate();

      expect(store.beginOutage(99.99)).toBe(false);

      expect(store.errorRate()).toBe(rate);
      expect(store.livenessStatus()).toBe('DEGRADED');
    });

    it('should fall back to JSON-derived defaults once the overlay clears', () => {
      store.hydrate({
        ...VALID_DATA,
        health: { liveness: 'UP', brokerTotal: 2, brokerActive: 2, errorRate: 0 },
      });
      store.beginOutage(41.37);

      expect(store.clearOutage()).toBe(true);

      expect(store.outage()).toBeNull();
      expect(store.livenessStatus()).toBe('UP');
      expect(store.livenessUp()).toBe(true);
      expect(store.errorRate()).toBe('0.00%');
      expect(store.errorRateIsZero()).toBe(true);
    });

    it('should ignore clearOutage when no outage is active', () => {
      expect(store.clearOutage()).toBe(false);
      expect(store.livenessStatus()).toBe('UP');
    });

    it('should advance an active DEGRADED overlay to HALF-OPEN via markHalfOpen', () => {
      store.beginOutage(41.37);

      expect(store.markHalfOpen()).toBe(true);

      expect(store.outage()!.status).toBe('HALF-OPEN');
      expect(store.outage()!.errorRate).toBe(41.37);
      expect(store.livenessStatus()).toBe('HALF-OPEN');
      expect(store.livenessUp()).toBe(false);
    });

    it('should return false from markHalfOpen when no outage is active', () => {
      store.hydrate(VALID_DATA);

      expect(store.markHalfOpen()).toBe(false);
      expect(store.livenessStatus()).toBe('UP');
    });

    it('should return false from markHalfOpen when the overlay is already HALF-OPEN', () => {
      store.beginOutage(41.37);
      store.markHalfOpen();

      expect(store.markHalfOpen()).toBe(false);
      expect(store.livenessStatus()).toBe('HALF-OPEN');
    });

    it('should restore UP and zero error rate after HALF-OPEN once the overlay clears', () => {
      store.hydrate({
        ...VALID_DATA,
        health: { liveness: 'UP', brokerTotal: 2, brokerActive: 2, errorRate: 0 },
      });
      store.beginOutage(41.37);
      store.markHalfOpen();

      expect(store.clearOutage()).toBe(true);

      expect(store.outage()).toBeNull();
      expect(store.livenessStatus()).toBe('UP');
      expect(store.errorRate()).toBe('0.00%');
      expect(store.errorRateIsZero()).toBe(true);
    });
  });
});
