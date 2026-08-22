import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { appConfig } from './app.config';
import { ClusterStateService } from './core/state/cluster-state.service';
import { TABS } from './core/state/tabs';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [ClusterStateService],
    })
      .compileComponents();
  });

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
    expect(buttons.map((b) => b.textContent?.trim())).toEqual(
      TABS.map((t) => t.label),
    );
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
  });

  it('should swap visible panel and active styling on tab click without reload', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const buttons = Array.from(compiled.querySelectorAll<HTMLButtonElement>('.tab-button'));
    const terminalButton = buttons.find(
      (b) => b.textContent?.trim() === 'Terminal Console',
    )!;

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

  it('should create the app using the real application providers', async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: appConfig.providers,
    })
      .compileComponents();

    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(fixture.componentInstance).toBeTruthy();
    const activeButtons = compiled.querySelectorAll('.tab-button.tab-active');
    expect(activeButtons.length).toBe(1);
    expect(activeButtons[0].textContent?.trim()).toBe('Health Dashboard');
  });

  it('should show exactly one panel for every tab selection without navigation', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    const store = TestBed.inject(ClusterStateService);
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
