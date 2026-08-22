import { ComponentFixture, TestBed } from '@angular/core/testing';
import portfolioDataJson from '../../../../public/portfolio-data.json';
import { PortfolioData, parsePortfolioData } from '../../core/data/portfolio-data';
import { SimulationEngine } from '../../core/simulation/simulation-engine';
import { ClusterStateService } from '../../core/state/cluster-state.service';
import { HealthDashboard } from './health-dashboard';

const SEEDED_DATA: PortfolioData = {
  projects: [],
  experience: [],
  contact: {
    email: 'you@example.com',
    github: 'https://github.com/your-handle',
    linkedin: 'https://www.linkedin.com/in/your-handle',
  },
  envProperties: [],
  health: parsePortfolioData(portfolioDataJson)!.health,
};

describe('HealthDashboard', () => {
  let store: ClusterStateService;
  let engine: SimulationEngine;
  let fixture: ComponentFixture<HealthDashboard>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HealthDashboard],
      providers: [ClusterStateService, SimulationEngine],
    });
    store = TestBed.inject(ClusterStateService);
    engine = TestBed.inject(SimulationEngine);
    store.hydrate(SEEDED_DATA);
  });

  function render() {
    fixture = TestBed.createComponent(HealthDashboard);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('should render the three probe labels', () => {
    const compiled = render();
    const labels = Array.from(compiled.querySelectorAll('.probe-label')).map((el) =>
      el.textContent?.trim(),
    );

    expect(labels).toEqual(['Liveness Probe', 'Active Broker Connections', 'Error Rate']);
  });

  it('should render values from store selectors with expected status classes', () => {
    const compiled = render();
    const values = Array.from(compiled.querySelectorAll<HTMLElement>('.probe-value'));

    expect(values[0].textContent?.trim()).toBe(store.livenessStatus());
    expect(values[0].classList.contains('status-up')).toBe(true);

    expect(values[1].textContent?.trim()).toBe(store.brokerConnections());
    expect(values[1].classList.contains('status-info')).toBe(true);

    expect(values[2].textContent?.trim()).toBe(store.errorRate());
    expect(values[2].classList.contains('status-up')).toBe(true);
  });

  it('should reflect changed JSON-configured health values without code changes', () => {
    store.hydrate({
      ...SEEDED_DATA,
      health: { liveness: 'DOWN', brokerTotal: 6, brokerActive: 4, errorRate: 1.25 },
    });

    const compiled = render();
    const values = Array.from(compiled.querySelectorAll<HTMLElement>('.probe-value')).map(
      (el) => el.textContent?.trim(),
    );

    expect(values).toEqual([
      store.livenessStatus(),
      store.brokerConnections(),
      store.errorRate(),
    ]);
    expect(values[1]).toBe('4 / 6');
    expect(values[2]).toBe('1.25%');

    const spans = Array.from(compiled.querySelectorAll<HTMLElement>('.probe-value'));
    expect(spans[0].classList.contains('status-up')).toBe(false);
    expect(spans[0].classList.contains('status-degraded')).toBe(true);
    expect(spans[2].classList.contains('status-up')).toBe(false);
    expect(spans[2].classList.contains('status-degraded')).toBe(true);
  });

  describe('outage trigger', () => {
    it('should render the Simulate Network Outage button', () => {
      const compiled = render();
      const button = compiled.querySelector<HTMLButtonElement>('.outage-button');

      expect(button?.textContent?.trim()).toBe('SIMULATE NETWORK OUTAGE');
    });

    it('should enable the button while UP and data is ready', () => {
      const compiled = render();
      const button = compiled.querySelector<HTMLButtonElement>('.outage-button');

      expect(button).not.toBeNull();
      expect(button!.disabled).toBe(false);
    });

    it('should transition the rendered probes to DEGRADED when clicked', () => {
      const compiled = render();
      const button = compiled.querySelector<HTMLButtonElement>('.outage-button')!;

      button.click();
      fixture.detectChanges();

      const values = Array.from(compiled.querySelectorAll<HTMLElement>('.probe-value'));
      expect(values[0].textContent?.trim()).toBe('DEGRADED');
      expect(values[0].classList.contains('status-degraded')).toBe(true);
      expect(values[0].classList.contains('status-up')).toBe(false);

      expect(Number.parseFloat(values[2].textContent!.trim())).toBeGreaterThan(0);
      expect(values[2].classList.contains('status-degraded')).toBe(true);
    });

    it('should disable the button once an outage is active', () => {
      engine.triggerNetworkOutage();

      const compiled = render();
      const button = compiled.querySelector<HTMLButtonElement>('.outage-button');

      expect(button!.disabled).toBe(true);
    });

    it('should disable the button and no-op clicks when data is not ready', () => {
      store.markLoadFailed();

      const compiled = render();
      const button = compiled.querySelector<HTMLButtonElement>('.outage-button')!;
      expect(button.disabled).toBe(true);

      const logCount = store.logs().length;
      button.click();
      fixture.detectChanges();

      expect(store.logs().length).toBe(logCount);
      expect(store.livenessStatus()).toBe('UP');
    });

    it('should ignore clicks on the disabled button without duplicating the script', () => {
      engine.triggerNetworkOutage();
      const logCount = store.logs().length;

      const compiled = render();
      const button = compiled.querySelector<HTMLButtonElement>('.outage-button')!;
      button.click();
      fixture.detectChanges();

      expect(store.logs().length).toBe(logCount);
      expect(store.livenessStatus()).toBe('DEGRADED');
    });
  });
});
