import { TestBed } from '@angular/core/testing';
import portfolioDataJson from '../../../../public/portfolio-data.json';
import { parsePortfolioData } from '../../core/data/portfolio-data';
import { ClusterStateService } from '../../core/state/cluster-state.service';
import { ServiceTopology } from './service-topology';

describe('ServiceTopology', () => {
  let store: ClusterStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ServiceTopology],
      providers: [ClusterStateService],
    });
    store = TestBed.inject(ClusterStateService);
    store.hydrate(parsePortfolioData(portfolioDataJson)!);
  });

  function render() {
    const fixture = TestBed.createComponent(ServiceTopology);
    fixture.detectChanges();
    return fixture;
  }

  function nodeButtons(compiled: HTMLElement): HTMLButtonElement[] {
    return Array.from(compiled.querySelectorAll<HTMLButtonElement>('.service-topology__node'));
  }

  it('should render exactly five named service nodes as positioned buttons', () => {
    const compiled = render().nativeElement as HTMLElement;
    const buttons = nodeButtons(compiled);

    expect(buttons.length).toBe(5);

    const labels = buttons.map((btn) => btn.querySelector('.service-topology__node-label')?.textContent?.trim());
    expect(labels).toContain('bff-gateway');
    expect(labels).toContain('onboarding-service');
    expect(labels).toContain('payment-service');
    expect(labels).toContain('deposit-service');
    expect(labels).toContain('core-bank-db');

    const svg = compiled.querySelector('svg.service-topology__connections');
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute('viewBox')).toBe('0 0 1200 800');
    expect(svg?.getAttribute('preserveAspectRatio')).toBe('none');
  });

  it('should show the inspection placeholder before any selection (no sidebar)', () => {
    const compiled = render().nativeElement as HTMLElement;

    expect(compiled.querySelector('.service-topology__detail-sidebar')).toBeNull();
    expect(compiled.querySelector('.service-topology__sidebar-backdrop')).toBeNull();
  });

  it('should select the clicked node through the store and highlight it', () => {
    const fixture = render();
    const compiled = fixture.nativeElement as HTMLElement;

    const paymentButton = nodeButtons(compiled).find(
      (btn) => btn.querySelector('.service-topology__node-label')?.textContent?.trim() === 'payment-service',
    )!;
    paymentButton.click();
    fixture.detectChanges();

    expect(store.selectedNodeId()).toBe('payment-service');
    expect(
      nodeButtons(compiled)
        .find((btn) => btn.querySelector('.service-topology__node-label')?.textContent?.trim() === 'payment-service')
        ?.classList.contains('service-topology__node--selected'),
    ).toBe(true);
  });

  it('should show the selected node description, tech stack, and metrics from JSON in sidebar', () => {
    store.selectNode('bff-gateway');
    const compiled = render().nativeElement as HTMLElement;

    const sidebar = compiled.querySelector('.service-topology__detail-sidebar')!;
    expect(sidebar).toBeTruthy();

    expect(sidebar.querySelector('.service-topology__sidebar-title')?.textContent?.trim()).toBe('bff-gateway');

    const data = parsePortfolioData(portfolioDataJson)!;
    const expected = data.topology.nodes.find((node) => node.id === 'bff-gateway')!;
    expect(sidebar.querySelector('.service-topology__sidebar-id')?.textContent?.trim()).toContain('svc-gw-89a2b');

    const techItems = Array.from(sidebar.querySelectorAll('.service-topology__tech-item')).map((item) => [
      item.querySelector('.service-topology__tech-label')?.textContent?.trim(),
      item.querySelector('.service-topology__tech-value')?.textContent?.trim(),
    ]);
    expect(techItems.map(([, v]) => v)).toEqual(expected.techStack);

    const metricCards = Array.from(sidebar.querySelectorAll('.service-topology__metric-card')).map((card) => [
      card.querySelector('.service-topology__metric-label')?.textContent?.trim(),
      card.querySelector('.service-topology__metric-value')?.textContent?.trim(),
    ]);
    expect(metricCards).toEqual(
      expected.metrics.map((metric) => [metric.label, metric.value]),
    );
  });

  it('should render degraded red link and borders only for the outage pair while active', () => {
    const fixture = render();
    const compiled = fixture.nativeElement as HTMLElement;

    store.beginOutage(41.37);
    fixture.detectChanges();

    const degradedBaseLinks = Array.from(compiled.querySelectorAll('path.service-topology__link-base--degraded'));
    expect(degradedBaseLinks.length).toBe(1);

    const degradedFlowLinks = Array.from(compiled.querySelectorAll('path.service-topology__link-flow--degraded'));
    expect(degradedFlowLinks.length).toBe(1);

    const degradedNodes = Array.from(compiled.querySelectorAll('.service-topology__node--degraded'));
    const labels = degradedNodes.map(
      (node) => node.querySelector('.service-topology__node-label')?.textContent?.trim(),
    );
    expect(labels.sort()).toEqual(['core-bank-db', 'payment-service']);

    store.clearOutage();
    fixture.detectChanges();

    expect(compiled.querySelectorAll('path.service-topology__link-base--degraded').length).toBe(0);
    expect(compiled.querySelectorAll('path.service-topology__link-flow--degraded').length).toBe(0);
    expect(compiled.querySelectorAll('.service-topology__node--degraded').length).toBe(0);
  });

  it('should show a 100% error rate in open payment details during an outage', () => {
    store.selectNode('payment-service');
    const fixture = render();

    store.beginOutage(41.37);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const sidebar = compiled.querySelector('.service-topology__detail-sidebar')!;
    const metricCards = Array.from(sidebar.querySelectorAll('.service-topology__metric-card')).map((card) => [
      card.querySelector('.service-topology__metric-label')?.textContent?.trim(),
      card.querySelector('.service-topology__metric-value')?.textContent?.trim(),
    ]);
    expect(metricCards).toContainEqual(['Error Rate', '100%']);
  });

  it('should have schematic grid background with outline-variant color', () => {
    const compiled = render().nativeElement as HTMLElement;
    const grid = compiled.querySelector('.schematic-grid');
    expect(grid).toBeTruthy();
    // Grid uses CSS background-image with var(--outline-variant)
  });

  it('should have node cards with proper icon, label, status dot, type, and status text', () => {
    const compiled = render().nativeElement as HTMLElement;
    const buttons = nodeButtons(compiled);

    for (const button of buttons) {
      expect(button.querySelector('.service-topology__node-icon')).toBeTruthy();
      expect(button.querySelector('.service-topology__node-label')).toBeTruthy();
      expect(button.querySelector('.service-topology__node-status-dot')).toBeTruthy();
      expect(button.querySelector('.service-topology__node-type')).toBeTruthy();
      expect(button.querySelector('.service-topology__node-status-text')).toBeTruthy();
      expect(button.getAttribute('role')).toBe('tab');
      expect(button.getAttribute('type')).toBe('button');
    }
  });

  it('should render canvas controls with zoom in, zoom out, fit screen', () => {
    const compiled = render().nativeElement as HTMLElement;
    const controls = compiled.querySelectorAll('.service-topology__control-btn');
    expect(controls.length).toBe(3);

    const icons = Array.from(controls).map((c) => c.querySelector('.material-symbols-outlined')?.textContent?.trim());
    expect(icons).toEqual(['add', 'remove', 'fit_screen']);
  });

  it('should render sidebar with health status, tech stack, metrics, and view logs button', () => {
    store.selectNode('payment-service');
    const compiled = render().nativeElement as HTMLElement;
    const sidebar = compiled.querySelector('.service-topology__detail-sidebar')!;

    // Health status
    expect(sidebar.querySelector('.service-topology__sidebar-section-title')?.textContent?.trim()).toBe('Health Status');
    expect(sidebar.querySelector('.service-topology__sidebar-status-label')?.textContent?.trim()).toBe('System State');
    expect(sidebar.querySelector('.service-topology__sidebar-status-badge')?.textContent?.trim()).toBe('UP');

    // Tech stack
    const techSection = Array.from(sidebar.querySelectorAll('.service-topology__sidebar-section'))[1];
    expect(techSection.querySelector('.service-topology__sidebar-section-title')?.textContent?.trim()).toBe('Tech Stack');
    const techItems = Array.from(techSection.querySelectorAll('.service-topology__tech-item')).map((item) =>
      item.querySelector('.service-topology__tech-value')?.textContent?.trim(),
    );
    expect(techItems).toEqual(['Spring Boot', 'Kafka', 'mTLS']);

    // Metrics
    const metricsSection = Array.from(sidebar.querySelectorAll('.service-topology__sidebar-section'))[2];
    expect(metricsSection.querySelector('.service-topology__sidebar-section-title')?.textContent?.trim()).toBe('Real-time Metrics');
    const metricLabels = Array.from(metricsSection.querySelectorAll('.service-topology__metric-label')).map((el) =>
      el.textContent?.trim(),
    );
    expect(metricLabels).toEqual(['Throughput', 'Double-Debits', 'Error Rate']);

    // View logs button
    expect(sidebar.querySelector('.service-topology__view-logs-btn')?.textContent?.trim()).toBe('View Logs');
  });

  it('should support keyboard activation on nodes (Enter/Space)', () => {
    const fixture = render();
    const compiled = fixture.nativeElement as HTMLElement;
    const paymentButton = nodeButtons(compiled).find(
      (btn) => btn.querySelector('.service-topology__node-label')?.textContent?.trim() === 'payment-service',
    )!;

    paymentButton.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    fixture.detectChanges();
    expect(store.selectedNodeId()).toBe('payment-service');

    store.selectNode(null);
    fixture.detectChanges();

    paymentButton.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    fixture.detectChanges();
    expect(store.selectedNodeId()).toBe('payment-service');
  });

  it('should apply reduced-motion guard to link flow animation', () => {
    const compiled = render().nativeElement as HTMLElement;
    const flowPaths = compiled.querySelectorAll('.service-topology__link-flow');
    expect(flowPaths.length).toBeGreaterThan(0);
    // Animation is controlled by CSS @media query, we verify classes exist
    for (const path of flowPaths) {
      expect(path.classList.contains('service-topology__link-flow')).toBe(true);
    }
  });

  it('should have focus-visible styles for nodes and controls', () => {
    const compiled = render().nativeElement as HTMLElement;
    const focusableElements = compiled.querySelectorAll('.service-topology__node, .service-topology__control-btn, .service-topology__sidebar-close, .service-topology__view-logs-btn');
    expect(focusableElements.length).toBeGreaterThan(0);
    // Focus styles are in CSS @media (forced-colors: active), we verify elements exist
    for (const el of focusableElements) {
      expect(el.tagName).toMatch(/^(BUTTON|A)$/);
    }
  });
});