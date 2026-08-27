import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationInitStatus } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { appConfig } from './app.config';
import { EmailJsAdapter } from './delivery/emailjs/emailjs.adapter';
import { MESSAGE_DELIVERY, MessageDelivery } from './delivery/message-delivery.port';
import { PortfolioData } from './core/data/portfolio-data';
import { PortfolioDataLoader } from './core/data/portfolio-data-loader.service';
import { SimulationEngine } from './core/simulation/simulation-engine';
import { ClusterStateService } from './core/state/cluster-state.service';
import { TABS, TabId } from './core/state/tabs';

const VALID_DATA: PortfolioData = {
  projects: [
    {
      name: 'cluster-control',
      description: 'Ops console.',
      stack: ['Angular'],
    },
  ],
  experience: [],
  topology: {
    nodes: [
      {
        id: 'payment-service',
        label: 'payment-service',
        description: 'Payments.',
        techStack: ['Java'],
        metrics: [{ label: 'Error Rate', value: '0.02%' }],
      },
    ],
    links: [],
  },
  contact: {
    email: 'you@example.com',
    github: 'https://github.com/your-handle',
    linkedin: 'https://www.linkedin.com/in/your-handle',
  },
  envProperties: [{ key: 'cluster.region', value: 'eu-central-1' }],
  health: { liveness: 'UP', brokerTotal: 2, brokerActive: 2, errorRate: 0 },
};

const DATA_URL = '/portfolio-data.json';

const FAKE_DELIVERY: MessageDelivery = {
  send: () => Promise.resolve({ ok: false, failure: { reason: 'provider-error', detail: 'unused' } }),
};

describe('App', () => {
  let http: HttpTestingController;
  let store: ClusterStateService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        ClusterStateService,
        PortfolioDataLoader,
        SimulationEngine,
        { provide: MESSAGE_DELIVERY, useValue: FAKE_DELIVERY },
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    store = TestBed.inject(ClusterStateService);
  });

  afterEach(() => http.verify());

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('app-terminal-console .terminal-console'),
    ).toBeTruthy();
  });

  it('should render title', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.top-nav__title')?.textContent).toContain('SpringActuator-Portfolio');
  });

  it('should render UP status in header and main content area', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    // The status is shown in the header title area, not a separate badge
    expect(compiled.querySelector('.top-nav__title')?.textContent).toContain('SpringActuator-Portfolio');
    expect(compiled.querySelector('.main-content')).toBeTruthy();
  });

  it('should render one tab button per configured tab, in order', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const buttons = Array.from(compiled.querySelectorAll<HTMLButtonElement>('.top-nav__tab'));

    expect(buttons.length).toBe(TABS.length);
    expect(buttons.map((b) => b.textContent?.trim())).toEqual(TABS.map((t) => t.label));
  });

  describe('with hydrated content', () => {
    beforeEach(() => {
      store.hydrate(VALID_DATA);
    });

    it('should show only the health dashboard panel initially with active styling', async () => {
      const fixture = TestBed.createComponent(App);
      await fixture.whenStable();
      const compiled = fixture.nativeElement as HTMLElement;

      const healthDashboard = compiled.querySelector('app-health-dashboard');
      expect(healthDashboard).toBeTruthy();

      const activeButtons = compiled.querySelectorAll('.top-nav__tab--active');
      expect(activeButtons.length).toBe(1);
      expect(activeButtons[0].getAttribute('aria-selected')).toBe('true');
      expect(activeButtons[0].textContent?.trim()).toBe('Health Dashboard');

      const tabButtons = compiled.querySelectorAll<HTMLButtonElement>('.top-nav__tab');
      for (const button of tabButtons) {
        expect(button.disabled).toBe(false);
      }
    });

    it('should swap visible panel and active styling on tab click without reload', async () => {
      const fixture = TestBed.createComponent(App);
      await fixture.whenStable();
      const compiled = fixture.nativeElement as HTMLElement;
      const buttons = Array.from(compiled.querySelectorAll<HTMLButtonElement>('.top-nav__tab'));
      const envRegistryButton = buttons.find((b) => b.textContent?.trim() === 'Env Registry')!;

      envRegistryButton.click();
      await fixture.whenStable();

      const activeButtons = compiled.querySelectorAll('.top-nav__tab--active');
      expect(activeButtons.length).toBe(1);
      expect(activeButtons[0].textContent?.trim()).toBe('Env Registry');

      const panelArea = compiled.querySelector('.main-content')!;
      expect(panelArea.querySelector('app-env-registry')).toBeTruthy();
    });

    it('should keep state unchanged when clicking the already-active tab', async () => {
      const fixture = TestBed.createComponent(App);
      await fixture.whenStable();
      const compiled = fixture.nativeElement as HTMLElement;
      const healthButton = compiled.querySelector<HTMLButtonElement>('.top-nav__tab')!;

      healthButton.click();
      await fixture.whenStable();

      const activeButtons = compiled.querySelectorAll('.top-nav__tab--active');
      expect(activeButtons.length).toBe(1);
      expect(activeButtons[0].textContent?.trim()).toBe('Health Dashboard');
      expect(compiled.querySelector('app-health-dashboard')).toBeTruthy();
    });

    it('should wire each exploration tab to its feature component instead of the placeholder', async () => {
      const fixture = TestBed.createComponent(App);
      await fixture.whenStable();
      const compiled = fixture.nativeElement as HTMLElement;

      const expected: ReadonlyArray<readonly [TabId, string]> = [
        ['service-topology', 'app-service-topology'],
        ['env-registry', 'app-env-registry'],
        ['career-pods', 'app-career-pods'],
        ['swagger-playground', 'app-swagger-playground'],
      ];

      for (const [tabId, selector] of expected) {
        store.selectTab(tabId);
        fixture.detectChanges();

        const panelArea = compiled.querySelector('.main-content')!;
        expect(panelArea.querySelector(selector)).toBeTruthy();
        expect(panelArea.querySelector('.panel__placeholder-text')).toBeNull();
      }
    });
  });

  it('should show a loading placeholder while content has not arrived', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    const placeholders = Array.from(compiled.querySelectorAll('.panel__placeholder-text'));
    expect(placeholders.length).toBe(1);
    expect(placeholders[0].textContent).toContain('LOADING CONTENT');
    expect(compiled.querySelector('[role="status"][aria-live="polite"]')).toBeTruthy();

    const tabButtons = compiled.querySelectorAll<HTMLButtonElement>('.top-nav__tab');
    expect(tabButtons.length).toBe(TABS.length);
    for (const button of tabButtons) {
      expect(button.disabled).toBe(true);
      expect(button.getAttribute('aria-disabled')).toBe('true');
    }
  });

  it('should show exactly one panel for every tab selection without navigation', async () => {
    store.hydrate(VALID_DATA);
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const hrefBefore = window.location.href;

    for (const tab of TABS) {
      store.selectTab(tab.id);
      fixture.detectChanges();
      // Each tab should render its component (or placeholder for terminal-console)
      const mainContent = compiled.querySelector('.main-content');
      expect(mainContent).toBeTruthy();
      expect(mainContent?.children.length ?? 0).toBeGreaterThan(0);
    }

    expect(window.location.href).toBe(hrefBefore);
  });

  it('should support keyboard navigation on tabs (ArrowRight, ArrowLeft, Home, End)', async () => {
    store.hydrate(VALID_DATA);
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const buttons = Array.from(compiled.querySelectorAll<HTMLButtonElement>('.top-nav__tab'));

    // ArrowRight from first to second
    buttons[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    fixture.detectChanges();
    expect(store.selectedTab()).toBe('env-registry');

    // ArrowLeft from second to first
    buttons[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
    fixture.detectChanges();
    expect(store.selectedTab()).toBe('health-dashboard');

    // End -> last
    buttons[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    fixture.detectChanges();
    expect(store.selectedTab()).toBe('swagger-playground');

    // Home -> first
    buttons[buttons.length - 1].dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    fixture.detectChanges();
    expect(store.selectedTab()).toBe('health-dashboard');
  });

  it('should render terminal glyph in header', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const glyph = compiled.querySelector('.top-nav__glyph');
    expect(glyph).toBeTruthy();
    expect(glyph?.textContent?.trim()).toBe('terminal');
  });

  it('should render icon buttons for settings and terminal', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const iconButtons = compiled.querySelectorAll('.top-nav__icon-btn');
    expect(iconButtons.length).toBe(2);
    expect(iconButtons[0].querySelector('.material-symbols-outlined')?.textContent?.trim()).toBe('settings');
    expect(iconButtons[1].querySelector('.material-symbols-outlined')?.textContent?.trim()).toBe('terminal');
  });

  it('should render footer with build info and system status', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const footer = compiled.querySelector('.footer');
    expect(footer).toBeTruthy();
    expect(footer?.querySelector('.footer__status')?.textContent).toContain('Build: v3.2.1-RELEASE');
    const statusItems = Array.from(footer?.querySelectorAll('.footer__status') || []).map((s) => s.textContent?.trim());
    expect(statusItems).toContain('System Health: Healthy');
    expect(statusItems).toContain('Uptime: 99.9%');
  });

  describe('terminal toggle visibility', () => {
    it('should hide terminal by default (small aspect ratio and desktop initially)', async () => {
      const fixture = TestBed.createComponent(App);
      await fixture.whenStable();
      const compiled = fixture.nativeElement as HTMLElement;
      const terminal = compiled.querySelector('.terminal-console') as HTMLElement;
      expect(terminal.classList.contains('terminal-console--hidden')).toBe(true);
      expect(terminal.getAttribute('aria-hidden')).toBe('true');
      expect(terminal.hasAttribute('inert')).toBe(true);
      expect(compiled.querySelector('.main-content')?.classList.contains('main-content--terminal-visible')).toBe(false);
      expect(compiled.querySelector('#terminal-console')).toBeTruthy();
      const button = Array.from(compiled.querySelectorAll<HTMLButtonElement>('.top-nav__icon-btn')).find(
        (b) => b.getAttribute('aria-controls') === 'terminal-console',
      )!;
      expect(button.getAttribute('aria-controls')).toBe(compiled.querySelector('#terminal-console')?.id);
    });

    it('should show terminal when clicking terminal icon button (hidden -> visible)', async () => {
      const fixture = TestBed.createComponent(App);
      await fixture.whenStable();
      const compiled = fixture.nativeElement as HTMLElement;
      const button = Array.from(compiled.querySelectorAll<HTMLButtonElement>('.top-nav__icon-btn')).find(
        (b) => b.getAttribute('aria-controls') === 'terminal-console',
      )!;
      expect(button.getAttribute('aria-controls')).toBe('terminal-console');
      expect(button.getAttribute('aria-expanded')).toBe('false');
      expect(compiled.querySelector('#terminal-console')).toBeTruthy();

      button.click();
      fixture.detectChanges();
      await fixture.whenStable();

      const terminal = compiled.querySelector('.terminal-console') as HTMLElement;
      expect(terminal.classList.contains('terminal-console--visible')).toBe(true);
      expect(terminal.classList.contains('terminal-console--hidden')).toBe(false);
      expect(terminal.getAttribute('aria-hidden')).toBe('false');
      expect(terminal.hasAttribute('inert')).toBe(false);
      expect(compiled.querySelector('.main-content')?.classList.contains('main-content--terminal-visible')).toBe(true);
      expect(button.getAttribute('aria-expanded')).toBe('true');
      expect(button.getAttribute('aria-label')).toBe('Hide terminal');
      expect(compiled.querySelector('#terminal-console')).toBeTruthy();
      expect(button.getAttribute('aria-controls')).toBe(compiled.querySelector('#terminal-console')?.id);
    });

    it('should hide terminal when clicking terminal icon again (visible -> hidden)', async () => {
      const fixture = TestBed.createComponent(App);
      await fixture.whenStable();
      const compiled = fixture.nativeElement as HTMLElement;
      const button = Array.from(compiled.querySelectorAll<HTMLButtonElement>('.top-nav__icon-btn')).find(
        (b) => b.getAttribute('aria-controls') === 'terminal-console',
      )!;
      button.click();
      fixture.detectChanges();
      await fixture.whenStable();
      expect(store.terminalVisible()).toBe(true);

      button.click();
      fixture.detectChanges();
      await fixture.whenStable();

      const terminal = compiled.querySelector('.terminal-console') as HTMLElement;
      expect(terminal.classList.contains('terminal-console--hidden')).toBe(true);
      expect(terminal.hasAttribute('inert')).toBe(true);
      expect(terminal.getAttribute('aria-hidden')).toBe('true');
      expect(compiled.querySelector('.main-content')?.classList.contains('main-content--terminal-visible')).toBe(false);
      expect(button.getAttribute('aria-expanded')).toBe('false');
      expect(button.getAttribute('aria-label')).toBe('Show terminal');
    });

    it('should toggle terminal identically on desktop (>=768px) — parity with mobile', async () => {
      // No media-specific branch: same signal toggle applies on desktop viewport
      const fixture = TestBed.createComponent(App);
      await fixture.whenStable();
      const compiled = fixture.nativeElement as HTMLElement;
      const button = Array.from(compiled.querySelectorAll<HTMLButtonElement>('.top-nav__icon-btn')).find(
        (b) => b.getAttribute('aria-controls') === 'terminal-console',
      )!;
      button.click();
      fixture.detectChanges();
      expect(store.terminalVisible()).toBe(true);
      expect(compiled.querySelector('.main-content--terminal-visible')).toBeTruthy();
      expect(button.getAttribute('aria-label')).toBe('Hide terminal');
      button.click();
      fixture.detectChanges();
      expect(store.terminalVisible()).toBe(false);
      expect(compiled.querySelector('.main-content--terminal-visible')).toBeNull();
      expect(button.getAttribute('aria-label')).toBe('Show terminal');
    });

    it('should preserve toggle state through rapid toggles without layout loss', async () => {
      const fixture = TestBed.createComponent(App);
      await fixture.whenStable();
      const compiled = fixture.nativeElement as HTMLElement;
      const button = Array.from(compiled.querySelectorAll<HTMLButtonElement>('.top-nav__icon-btn')).find(
        (b) => b.getAttribute('aria-controls') === 'terminal-console',
      )!;
      button.click();
      button.click();
      button.click();
      fixture.detectChanges();
      expect(store.terminalVisible()).toBe(true);
      expect(compiled.querySelector('.terminal-console--visible')).toBeTruthy();
      expect(compiled.querySelector('.terminal-console')?.hasAttribute('inert')).toBe(false);
      button.click();
      fixture.detectChanges();
      expect(store.terminalVisible()).toBe(false);
      expect(compiled.querySelector('.terminal-console--hidden')).toBeTruthy();
      expect(compiled.querySelector('.terminal-console')?.hasAttribute('inert')).toBe(true);
    });
  });
});

describe('App with real application providers', () => {
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [...appConfig.providers, provideHttpClientTesting()],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should bind MESSAGE_DELIVERY to the production EmailJsAdapter', () => {
    expect(TestBed.inject(MESSAGE_DELIVERY)).toBeInstanceOf(EmailJsAdapter);
    http.expectOne(DATA_URL).flush(VALID_DATA);
  });

  it('should create the app and hydrate from the boot fetch', async () => {
    const fixture = TestBed.createComponent(App);
    void TestBed.inject(ApplicationInitStatus);

    const req = http.expectOne(DATA_URL);
    expect(req.request.method).toBe('GET');
    req.flush(VALID_DATA);

    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(fixture.componentInstance).toBeTruthy();
    const activeButtons = compiled.querySelectorAll('.top-nav__tab--active');
    expect(activeButtons.length).toBe(1);
    expect(activeButtons[0].textContent?.trim()).toBe('Health Dashboard');

    // Title is in header
    expect(compiled.querySelector('.top-nav__title')?.textContent).toContain('SpringActuator-Portfolio');
  });

  it('should show SERVICE UNAVAILABLE with retry when the boot fetch fails, then recover', async () => {
    const fixture = TestBed.createComponent(App);
    void TestBed.inject(ApplicationInitStatus);

    http.expectOne(DATA_URL).flush(null, { status: 404, statusText: 'Not Found' });
    await fixture.whenStable();

    let compiled = fixture.nativeElement as HTMLElement;
    const degraded = compiled.querySelector('.panel__placeholder-text--degraded');
    expect(degraded?.textContent).toContain('SERVICE UNAVAILABLE');
    expect(compiled.querySelector('[role="alert"]')).toBeTruthy();

    // Header title still shows, no status badge
    expect(compiled.querySelector('.top-nav__title')?.textContent).toContain('SpringActuator-Portfolio');

    const tabButtons = Array.from(compiled.querySelectorAll<HTMLButtonElement>('.top-nav__tab'));
    expect(tabButtons.length).toBe(TABS.length);
    for (const button of tabButtons) {
      expect(button.disabled).toBe(true);
      expect(button.getAttribute('aria-disabled')).toBe('true');
    }

    const retryButton = compiled.querySelector<HTMLButtonElement>('.failure-panel__retry');
    expect(retryButton).toBeTruthy();

    retryButton!.click();
    const retryReq = http.expectOne(DATA_URL);
    fixture.detectChanges();
    expect(retryButton!.disabled).toBe(true);
    retryReq.flush(VALID_DATA);
    await fixture.whenStable();

    compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.failure-panel__retry')).toBeNull();
    const activeButtons = compiled.querySelectorAll('.top-nav__tab--active');
    expect(activeButtons.length).toBe(1);
    expect(activeButtons[0].textContent?.trim()).toBe('Health Dashboard');

    for (const button of Array.from(compiled.querySelectorAll<HTMLButtonElement>('.top-nav__tab'))) {
      expect(button.disabled).toBe(false);
      expect(button.getAttribute('aria-disabled')).toBe('false');
    }
  });
});