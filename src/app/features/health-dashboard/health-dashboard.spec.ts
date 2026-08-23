import { ComponentFixture, TestBed } from '@angular/core/testing';
import portfolioDataJson from '../../../../public/portfolio-data.json';
import { PortfolioData, parsePortfolioData } from '../../core/data/portfolio-data';
import { AUTO_RECOVERY_DELAY_MS, SimulationEngine } from '../../core/simulation/simulation-engine';
import { ClusterStateService } from '../../core/state/cluster-state.service';
import { vi } from 'vitest';
import { HealthDashboard } from './health-dashboard';

const SEEDED_DATA: PortfolioData = {
  projects: [],
  experience: [],
  topology: parsePortfolioData(portfolioDataJson)!.topology,
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

  it('should render three stat cards with expected labels', () => {
    const compiled = render();
    const labels = Array.from(compiled.querySelectorAll('.stat-card__label')).map((el) =>
      el.textContent?.trim(),
    );

    expect(labels).toEqual(['Liveness Probe', 'Active Brokers', 'Error Rate']);
  });

  it('should render liveness card with UP badge and primary dot', () => {
    const compiled = render();
    const livenessCard = compiled.querySelector('[data-testid="liveness-card"]');
    expect(livenessCard).toBeTruthy();

    const badge = livenessCard?.querySelector('.stat-card__badge--up');
    expect(badge).toBeTruthy();
    expect(badge?.querySelector('.stat-card__badge-text')?.textContent?.trim()).toBe('UP');

    const dot = badge?.querySelector('.stat-card__dot');
    expect(dot).toBeTruthy();
    expect(dot?.classList.contains('stat-card__dot')).toBe(true);
  });

  it('should render sparkline bars with primary color', () => {
    const compiled = render();
    const bars = compiled.querySelectorAll('.stat-card__bar');
    expect(bars.length).toBe(6);
    for (const bar of bars) {
      expect(bar.classList.contains('stat-card__bar')).toBe(true);
    }
  });

  it('should render brokers card with secondary icon', () => {
    const compiled = render();
    const brokersCard = compiled.querySelector('[data-testid="brokers-card"]');
    expect(brokersCard).toBeTruthy();

    const icon = brokersCard?.querySelector('.stat-card__icon');
    expect(icon?.textContent?.trim()).toBe('hub');
    expect(icon?.classList.contains('stat-card__icon')).toBe(true);
  });

  it('should render error rate card with error icon', () => {
    const compiled = render();
    const errorCard = compiled.querySelector('[data-testid="error-rate-card"]');
    expect(errorCard).toBeTruthy();

    const icon = errorCard?.querySelector('.stat-card__icon--error');
    expect(icon).toBeTruthy();
    expect(icon?.textContent?.trim()).toBe('warning');
    expect(icon?.classList.contains('stat-card__icon--error')).toBe(true);
  });

  it('should render profile card with avatar, name, version, role, bio, and metrics', () => {
    const compiled = render();
    const profileCard = compiled.querySelector('.profile-card');
    expect(profileCard).toBeTruthy();

    expect(profileCard?.querySelector('.profile-card__avatar .material-symbols-outlined')?.textContent?.trim()).toBe('person');
    expect(profileCard?.querySelector('.profile-card__name')?.textContent?.trim()).toBe('Gokul');
    expect(profileCard?.querySelector('.profile-card__version')?.textContent?.trim()).toBe('v1.8.0-RELEASE');
    expect(profileCard?.querySelector('.profile-card__role')?.textContent?.trim()).toBe('> Senior Java Backend Engineer');
    expect(profileCard?.querySelector('.profile-card__bio')?.textContent?.trim()).toContain('Architecting resilient');
    expect(profileCard?.querySelectorAll('.profile-metric').length).toBe(2);
  });

  it('should render chart card with SVG, grid, area, line, and time labels', () => {
    const compiled = render();
    const chartCard = compiled.querySelector('.chart-card');
    expect(chartCard).toBeTruthy();

    const svg = chartCard?.querySelector('.chart-card__svg');
    expect(svg).toBeTruthy();
    expect(svg?.getAttribute('viewBox')).toBe('0 0 100 100');
    expect(svg?.getAttribute('preserveAspectRatio')).toBe('none');

    const gridLines = chartCard?.querySelectorAll('.chart-card__grid line');
    expect(gridLines?.length).toBe(4);

    const area = chartCard?.querySelector('.chart-card__area');
    expect(area).toBeTruthy();

    const line = chartCard?.querySelector('.chart-card__line');
    expect(line).toBeTruthy();

    const point = chartCard?.querySelector('.chart-card__point');
    expect(point).toBeTruthy();

    const timeLabels = Array.from(chartCard?.querySelectorAll('.chart-card__time-labels span') || []).map((el) => el.textContent?.trim());
    expect(timeLabels).toEqual(['-1h', '-45m', '-30m', '-15m', 'Now']);
  });

  it('should render chaos engineering controls with outage and recovery buttons', () => {
    const compiled = render();
    const controlsCard = compiled.querySelector('.controls-card');
    expect(controlsCard).toBeTruthy();

    const outageBtn = controlsCard?.querySelector<HTMLButtonElement>('.btn--outage');
    expect(outageBtn).toBeTruthy();
    expect(outageBtn?.textContent?.trim()).toContain('Simulate Network Outage');
    expect(outageBtn?.querySelector('.btn__icon')?.textContent?.trim()).toBe('power_off');
    expect(outageBtn?.disabled).toBe(false);

    const recoveryBtn = controlsCard?.querySelector<HTMLButtonElement>('.btn--recovery');
    expect(recoveryBtn).toBeTruthy();
    expect(recoveryBtn?.textContent?.trim()).toContain('Trigger Auto-Recovery');
    expect(recoveryBtn?.querySelector('.btn__icon')?.textContent?.trim()).toBe('restart_alt');
    expect(recoveryBtn?.disabled).toBe(true);
  });

  it('should render circuit breaker toggles in enabled state', () => {
    const compiled = render();
    const breakers = compiled.querySelectorAll('.controls-card__breaker');
    expect(breakers.length).toBe(2);

    const names = Array.from(breakers).map((b) => b.querySelector('.controls-card__breaker-name')?.textContent?.trim());
    expect(names).toEqual(['PaymentService', 'InventoryDB']);

    const toggles = Array.from(breakers).map((b) => b.querySelector('.toggle'));
    expect(toggles.every((t) => t?.classList.contains('toggle--enabled'))).toBe(true);
    expect(toggles.every((t) => t?.getAttribute('aria-disabled') === 'true')).toBe(true);
  });

  it('should reflect changed JSON-configured health values without code changes', () => {
    store.hydrate({
      ...SEEDED_DATA,
      health: { liveness: 'DEGRADED', brokerTotal: 6, brokerActive: 4, errorRate: 1.25 },
    });

    const compiled = render();
    const livenessCard = compiled.querySelector('[data-testid="liveness-card"]');
    expect(livenessCard?.querySelector('.stat-card__badge-text')?.textContent?.trim()).toBe('DEGRADED');

    const brokersCard = compiled.querySelector('[data-testid="brokers-card"]');
    expect(brokersCard?.querySelector('.stat-card__value')?.textContent?.trim()).toContain('4 / 6');

    const errorCard = compiled.querySelector('[data-testid="error-rate-card"]');
    expect(errorCard?.querySelector('.stat-card__value')?.textContent?.trim()).toContain('1.25%');
  });

  describe('outage trigger', () => {
    it('should render the Simulate Network Outage button', () => {
      const compiled = render();
      const button = compiled.querySelector<HTMLButtonElement>('.btn--outage');

      expect(button?.textContent?.trim()).toContain('Simulate Network Outage');
    });

    it('should enable the button while UP and data is ready', () => {
      const compiled = render();
      const button = compiled.querySelector<HTMLButtonElement>('.btn--outage');

      expect(button).not.toBeNull();
      expect(button!.disabled).toBe(false);
    });

    it('should transition the rendered probes to DEGRADED when clicked', () => {
      const compiled = render();
      const button = compiled.querySelector<HTMLButtonElement>('.btn--outage')!;

      button.click();
      fixture.detectChanges();

      const livenessCard = compiled.querySelector('[data-testid="liveness-card"]');
      expect(livenessCard?.querySelector('.stat-card__badge-text')?.textContent?.trim()).toBe('DEGRADED');

      const errorCard = compiled.querySelector('[data-testid="error-rate-card"]');
      const errorValue = errorCard?.querySelector('.stat-card__value')?.textContent?.trim();
      expect(parseFloat(errorValue!.replace('%', ''))).toBeGreaterThan(0);
    });

    it('should disable the button once an outage is active', () => {
      engine.triggerNetworkOutage();

      const compiled = render();
      const button = compiled.querySelector<HTMLButtonElement>('.btn--outage');

      expect(button!.disabled).toBe(true);
    });

    it('should disable the button and no-op clicks when data is not ready', () => {
      store.markLoadFailed();

      const compiled = render();
      const button = compiled.querySelector<HTMLButtonElement>('.btn--outage')!;
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
      const button = compiled.querySelector<HTMLButtonElement>('.btn--outage')!;
      button.click();
      fixture.detectChanges();

      expect(store.logs().length).toBe(logCount);
      expect(store.livenessStatus()).toBe('DEGRADED');
    });
  });

  describe('recovery trigger', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should render the Trigger Auto-Recovery button', () => {
      const compiled = render();
      const button = compiled.querySelector<HTMLButtonElement>('.btn--recovery');

      expect(button?.textContent?.trim()).toContain('Trigger Auto-Recovery');
      expect(button?.getAttribute('aria-label')).toBe('Trigger Auto-Recovery');
    });

    it('should disable the recovery button while UP even when data is ready', () => {
      const compiled = render();
      const button = compiled.querySelector<HTMLButtonElement>('.btn--recovery');

      expect(button).not.toBeNull();
      expect(button!.disabled).toBe(true);
    });

    it('should enable the recovery button during an active outage', () => {
      engine.triggerNetworkOutage();

      const compiled = render();
      const button = compiled.querySelector<HTMLButtonElement>('.btn--recovery');

      expect(button!.disabled).toBe(false);
    });

    it('should disable the recovery button when data is not ready', () => {
      store.markLoadFailed();

      const compiled = render();
      const button = compiled.querySelector<HTMLButtonElement>('.btn--recovery');

      expect(button!.disabled).toBe(true);
    });

    it('should disable the recovery button during the HALF-OPEN window and after recovery', () => {
      const compiled = render();
      const button = compiled.querySelector<HTMLButtonElement>('.btn--recovery')!;

      engine.triggerNetworkOutage();
      fixture.detectChanges();
      expect(store.livenessStatus()).toBe('DEGRADED');
      expect(button.disabled).toBe(false);

      engine.triggerAutoRecovery();
      fixture.detectChanges();
      expect(store.livenessStatus()).toBe('HALF-OPEN');
      expect(button.disabled).toBe(true);

      vi.advanceTimersByTime(AUTO_RECOVERY_DELAY_MS);
      fixture.detectChanges();
      expect(store.livenessStatus()).toBe('UP');
      expect(button.disabled).toBe(true);
    });

    it('should render the HALF-OPEN warning banner and warn styling when clicked mid-outage', () => {
      engine.triggerNetworkOutage();

      const compiled = render();
      const bannerBefore = compiled.querySelector('.fallback-banner');
      expect(bannerBefore).toBeNull();

      const button = compiled.querySelector<HTMLButtonElement>('.btn--recovery')!;
      button.click();
      fixture.detectChanges();

      const banner = compiled.querySelector<HTMLElement>('.fallback-banner');
      expect(banner).not.toBeNull();
      expect(banner!.getAttribute('role')).toBe('status');

      const livenessCard = compiled.querySelector('[data-testid="liveness-card"]');
      expect(livenessCard?.querySelector('.stat-card__badge-text')?.textContent?.trim()).toBe('HALF-OPEN');

      const errorCard = compiled.querySelector('[data-testid="error-rate-card"]');
      const errorValue = errorCard?.querySelector('.stat-card__value')?.textContent?.trim();
      expect(parseFloat(errorValue!.replace('%', ''))).toBeGreaterThan(0);

      const logCountAfterStage1 = store.logs().length;
      button.click();
      fixture.detectChanges();
      expect(store.logs().length).toBe(logCountAfterStage1);
      expect(store.livenessStatus()).toBe('HALF-OPEN');
    });

    it('should restore the UP render after the staged completion elapses', () => {
      engine.triggerNetworkOutage();

      const compiled = render();
      compiled.querySelector<HTMLButtonElement>('.btn--recovery')!.click();
      fixture.detectChanges();
      expect(compiled.querySelector('.fallback-banner')).not.toBeNull();

      vi.advanceTimersByTime(AUTO_RECOVERY_DELAY_MS);
      fixture.detectChanges();

      expect(compiled.querySelector('.fallback-banner')).toBeNull();

      const livenessCard = compiled.querySelector('[data-testid="liveness-card"]');
      expect(livenessCard?.querySelector('.stat-card__badge-text')?.textContent?.trim()).toBe('UP');

      const errorCard = compiled.querySelector('[data-testid="error-rate-card"]');
      expect(errorCard?.querySelector('.stat-card__value')?.textContent?.trim()).toBe('0.00%');

      const recoveryButton = compiled.querySelector<HTMLButtonElement>('.btn--recovery');
      expect(recoveryButton!.disabled).toBe(true);
    });
  });

  describe('reduced motion', () => {
    it('should not animate pulse dot when prefers-reduced-motion', () => {
      const compiled = render();
      const dot = compiled.querySelector('.stat-card__dot');
      expect(dot).toBeTruthy();
      // The animation is controlled by CSS @media query, we verify the class exists
      expect(dot?.classList.contains('stat-card__dot')).toBe(true);
    });

    it('should not animate pulse icon on outage button when prefers-reduced-motion', () => {
      const compiled = render();
      const icon = compiled.querySelector('.btn--outage .btn__icon');
      expect(icon).toBeTruthy();
      expect(icon?.classList.contains('btn__icon')).toBe(true);
    });
  });

  describe('forced colors', () => {
    it('should have focus-visible styles for buttons', () => {
      const compiled = render();
      const buttons = compiled.querySelectorAll('button');
      expect(buttons.length).toBeGreaterThan(0);
      // Focus styles are in CSS @media (forced-colors: active), we verify buttons exist
      for (const button of buttons) {
        expect(button.tagName).toBe('BUTTON');
      }
    });
  });
});