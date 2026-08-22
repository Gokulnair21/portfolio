import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ApplicationInitStatus } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { appConfig } from './app.config';
import { PortfolioData } from './core/data/portfolio-data';
import { PortfolioDataLoader } from './core/data/portfolio-data-loader.service';
import { ClusterStateService } from './core/state/cluster-state.service';
import { TABS } from './core/state/tabs';

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
};

const DATA_URL = '/portfolio-data.json';

describe('App', () => {
  let http: HttpTestingController;
  let store: ClusterStateService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        ClusterStateService,
        PortfolioDataLoader,
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
  });

  it('should render title', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('PORTFOLIO-SERVICE');
  });

  it('should render UP status badge and panel area', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const badge = compiled.querySelector('.status-badge');
    expect(badge?.textContent).toContain('UP');
    expect(badge?.classList.contains('status-up')).toBe(true);
    expect(compiled.querySelector('.panel-area')).toBeTruthy();
  });

  it('should render one tab button per configured tab, in order', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const buttons = Array.from(compiled.querySelectorAll<HTMLButtonElement>('.tab-button'));

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

      const panels = compiled.querySelectorAll('.panel-area .panel');
      expect(panels.length).toBe(1);

      const activeButtons = compiled.querySelectorAll('.tab-button.tab-active');
      expect(activeButtons.length).toBe(1);
      expect(activeButtons[0].getAttribute('aria-selected')).toBe('true');
      expect(activeButtons[0].textContent?.trim()).toBe('Health Dashboard');

      const tabButtons = compiled.querySelectorAll<HTMLButtonElement>('.tab-button');
      for (const button of tabButtons) {
        expect(button.disabled).toBe(false);
      }
    });

    it('should swap visible panel and active styling on tab click without reload', async () => {
      const fixture = TestBed.createComponent(App);
      await fixture.whenStable();
      const compiled = fixture.nativeElement as HTMLElement;
      const buttons = Array.from(compiled.querySelectorAll<HTMLButtonElement>('.tab-button'));
      const terminalButton = buttons.find((b) => b.textContent?.trim() === 'Terminal Console')!;

      terminalButton.click();
      await fixture.whenStable();

      const activeButtons = compiled.querySelectorAll('.tab-button.tab-active');
      expect(activeButtons.length).toBe(1);
      expect(activeButtons[0].textContent?.trim()).toBe('Terminal Console');

      const placeholders = Array.from(compiled.querySelectorAll('.panel-placeholder'));
      expect(placeholders.length).toBe(1);
      expect(placeholders[0].textContent).toContain('MODULE NOT DEPLOYED');
    });

    it('should keep state unchanged when clicking the already-active tab', async () => {
      const fixture = TestBed.createComponent(App);
      await fixture.whenStable();
      const compiled = fixture.nativeElement as HTMLElement;
      const healthButton = compiled.querySelector<HTMLButtonElement>('.tab-button')!;

      healthButton.click();
      await fixture.whenStable();

      const activeButtons = compiled.querySelectorAll('.tab-button.tab-active');
      expect(activeButtons.length).toBe(1);
      expect(activeButtons[0].textContent?.trim()).toBe('Health Dashboard');
      expect(compiled.querySelectorAll('.panel-area .panel').length).toBe(1);
    });
  });

  it('should show a loading placeholder while content has not arrived', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    const placeholders = Array.from(compiled.querySelectorAll('.panel-placeholder'));
    expect(placeholders.length).toBe(1);
    expect(placeholders[0].textContent).toContain('LOADING CONTENT');
    expect(compiled.querySelector('[role="status"][aria-live="polite"]')).toBeTruthy();

    const tabButtons = compiled.querySelectorAll<HTMLButtonElement>('.tab-button');
    expect(tabButtons.length).toBeGreaterThan(0);
    for (const button of tabButtons) {
      expect(button.disabled).toBe(true);
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
      const visible = compiled.querySelectorAll('.panel-area .panel').length;
      expect(`${tab.id}:${visible}`).toBe(`${tab.id}:1`);
    }

    expect(window.location.href).toBe(hrefBefore);
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

  it('should create the app and hydrate from the boot fetch', async () => {
    const fixture = TestBed.createComponent(App);
    void TestBed.inject(ApplicationInitStatus);

    const req = http.expectOne(DATA_URL);
    expect(req.request.method).toBe('GET');
    req.flush(VALID_DATA);

    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(fixture.componentInstance).toBeTruthy();
    const activeButtons = compiled.querySelectorAll('.tab-button.tab-active');
    expect(activeButtons.length).toBe(1);
    expect(activeButtons[0].textContent?.trim()).toBe('Health Dashboard');

    const badge = compiled.querySelector('.status-badge');
    expect(badge?.textContent).toContain('UP');
  });

  it('should show SERVICE UNAVAILABLE with retry when the boot fetch fails, then recover', async () => {
    const fixture = TestBed.createComponent(App);
    void TestBed.inject(ApplicationInitStatus);

    http.expectOne(DATA_URL).flush(null, { status: 404, statusText: 'Not Found' });
    await fixture.whenStable();

    let compiled = fixture.nativeElement as HTMLElement;
    const degraded = compiled.querySelector('.panel-placeholder-degraded');
    expect(degraded?.textContent).toContain('SERVICE UNAVAILABLE');
    expect(compiled.querySelector('[role="alert"]')).toBeTruthy();

    const badge = compiled.querySelector('.status-badge');
    expect(badge?.textContent).toContain('DOWN');
    expect(badge?.classList.contains('status-down')).toBe(true);

    const tabButtons = Array.from(compiled.querySelectorAll<HTMLButtonElement>('.tab-button'));
    expect(tabButtons.length).toBe(TABS.length);
    for (const button of tabButtons) {
      expect(button.disabled).toBe(true);
    }

    const retryButton = compiled.querySelector<HTMLButtonElement>('.retry-button');
    expect(retryButton).toBeTruthy();

    retryButton!.click();
    const retryReq = http.expectOne(DATA_URL);
    fixture.detectChanges();
    expect(retryButton!.disabled).toBe(true);
    retryReq.flush(VALID_DATA);
    await fixture.whenStable();

    compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.retry-button')).toBeNull();
    const activeButtons = compiled.querySelectorAll('.tab-button.tab-active');
    expect(activeButtons.length).toBe(1);
    expect(activeButtons[0].textContent?.trim()).toBe('Health Dashboard');

    for (const button of Array.from(compiled.querySelectorAll<HTMLButtonElement>('.tab-button'))) {
      expect(button.disabled).toBe(false);
    }
  });
});
