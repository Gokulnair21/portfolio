import { TestBed } from '@angular/core/testing';
import { PortfolioData } from '../data/portfolio-data';
import { ClusterStateService } from './cluster-state.service';
import { TabId } from './tabs';

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
});
