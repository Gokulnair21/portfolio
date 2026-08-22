import { TestBed } from '@angular/core/testing';
import { ClusterStateService } from './cluster-state.service';
import { TabId } from './tabs';

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
});
