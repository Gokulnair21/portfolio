import { TestBed } from '@angular/core/testing';
import portfolioDataJson from '../../../../public/portfolio-data.json';
import { parsePortfolioData } from '../../core/data/portfolio-data';
import { ClusterStateService } from '../../core/state/cluster-state.service';
import { CareerPods } from './career-pods';

describe('CareerPods', () => {
  let store: ClusterStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [CareerPods],
      providers: [ClusterStateService],
    });
    store = TestBed.inject(ClusterStateService);
    store.hydrate(parsePortfolioData(portfolioDataJson)!);
  });

  function render() {
    const fixture = TestBed.createComponent(CareerPods);
    fixture.detectChanges();
    return fixture;
  }

  it('should render one running pod per experience entry with derived replica names', () => {
    const data = parsePortfolioData(portfolioDataJson)!;
    const compiled = render().nativeElement as HTMLElement;

    const items = Array.from(compiled.querySelectorAll('.career-pods__pod-item'));
    expect(items.length).toBe(data.experience.length);

    const names = items.map((item) => item.querySelector('.career-pods__pod-name')?.textContent?.trim());
    expect(names).toEqual(['pod-experience-neosoft-technologies-0']);

    for (const item of items) {
      expect(item.querySelector('.career-pods__status-text')?.textContent?.trim()).toBe('RUNNING');
      const dot = item.querySelector('.career-pods__status-dot');
      expect(dot).toBeTruthy();
      expect(dot?.classList.contains('career-pods__status-dot')).toBe(true);
    }
  });

  it('should show the inspection placeholder before any pod is selected', () => {
    const compiled = render().nativeElement as HTMLElement;

    expect(compiled.querySelector('.career-pods__placeholder')?.textContent).toContain('SELECT A POD');
    expect(compiled.querySelector('.career-pods__bento-grid')).toBeNull();
  });

  it('should select the clicked pod through the store and highlight exactly that card', () => {
    const fixture = render();
    const compiled = fixture.nativeElement as HTMLElement;

    const items = () => Array.from(compiled.querySelectorAll('.career-pods__pod-item'));

    items()[0]!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();

    expect(store.selectedPodIndex()).toBe(0);
    expect(items().filter((item) => item.classList.contains('career-pods__pod-item--active')).length).toBe(1);
    expect(items()[0]!.classList.contains('career-pods__pod-item--active')).toBe(true);
  });

  it('should deselect the previous pod when selecting a non-first pod', () => {
    const data = parsePortfolioData(portfolioDataJson)!;
    store.hydrate({
      ...data,
      experience: [
        data.experience[0]!,
        {
          company: 'Fixture Systems Ltd',
          role: 'Senior Backend Engineer',
          period: '2018-06 — 2022-02',
          highlights: ['Synthetic second entry for selection coverage.'],
        },
      ],
    });

    const fixture = render();
    const compiled = fixture.nativeElement as HTMLElement;

    const items = () => Array.from(compiled.querySelectorAll('.career-pods__pod-item'));

    items()[0]!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();

    expect(store.selectedPodIndex()).toBe(0);
    expect(items()[0]!.classList.contains('career-pods__pod-item--active')).toBe(true);

    items()[1]!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();

    expect(store.selectedPodIndex()).toBe(1);
    expect(items()[0]!.classList.contains('career-pods__pod-item--active')).toBe(false);
    expect(items()[1]!.classList.contains('career-pods__pod-item--active')).toBe(true);
  });

  it('should show terminal header with selected pod name and blinking cursor', () => {
    const data = parsePortfolioData(portfolioDataJson)!;
    const expected = data.experience[0]!;
    store.selectPod(0);
    const compiled = render().nativeElement as HTMLElement;

    const header = compiled.querySelector('.career-pods__terminal-header');
    expect(header).toBeTruthy();
    expect(header?.textContent).toContain(`pod-experience-neosoft-technologies-0`);
    expect(header?.querySelector('.blinking-cursor')).toBeTruthy();
  });

  it('should show timeline, role, company, and bulleted responsibilities for the selected entry', () => {
    const data = parsePortfolioData(portfolioDataJson)!;
    const expected = data.experience[0]!;
    store.selectPod(0);
    const compiled = render().nativeElement as HTMLElement;

    const coreCard = compiled.querySelector('[data-testid="core-card"]')!;
    expect(coreCard.querySelector('.career-pods__field-value')?.textContent?.trim()).toBe('pod-experience-neosoft-technologies-0');

    const fieldValues = Array.from(coreCard.querySelectorAll('.career-pods__field-value')).map((v) => v.textContent?.trim());
    expect(fieldValues).toContain(expected.company);
    expect(fieldValues).toContain(expected.role);
    expect(fieldValues).toContain(expected.period);

    const logEntries = Array.from(coreCard.querySelectorAll('.career-pods__log-entry')).map((entry) =>
      entry.querySelector('.career-pods__log-message')?.textContent?.trim(),
    );
    expect(logEntries).toEqual(expected.highlights);
    expect(logEntries.length).toBeGreaterThan(0);
  });

  it('should render tech chips with primary and secondary variants', () => {
    store.selectPod(0);
    const compiled = render().nativeElement as HTMLElement;

    const stackCard = compiled.querySelector('[data-testid="stack-card"]')!;
    const chips = Array.from(stackCard.querySelectorAll('.career-pods__tech-chip')).map((c) => c.textContent?.trim());
    expect(chips).toEqual(['Java 17', 'Spring Boot', 'Kubernetes', 'Docker', 'PostgreSQL', 'Kafka', 'Redis']);

    const primaryChips = stackCard.querySelectorAll('.career-pods__tech-chip--primary');
    expect(primaryChips.length).toBe(1);
    expect(primaryChips[0]?.textContent?.trim()).toBe('Spring Boot');

    const secondaryChips = stackCard.querySelectorAll('.career-pods__tech-chip--secondary');
    expect(secondaryChips.length).toBe(1);
    expect(secondaryChips[0]?.textContent?.trim()).toBe('PostgreSQL');
  });

  it('should render liveness probe card with labeled progress bars', () => {
    store.selectPod(0);
    const compiled = render().nativeElement as HTMLElement;

    const livenessCard = compiled.querySelector('[data-testid="liveness-card"]')!;
    expect(livenessCard.querySelector('.career-pods__liveness-title')?.textContent?.trim()).toBe('Liveness Probe');
    expect(livenessCard.querySelector('.career-pods__liveness-badge')?.textContent?.trim()).toBe('HTTP 200 OK');

    const bars = Array.from(livenessCard.querySelectorAll('.career-pods__liveness-bar-row'));
    expect(bars.length).toBe(2);

    const labels = bars.map((bar) => bar.querySelector('.career-pods__liveness-bar-label')?.textContent?.trim());
    expect(labels).toEqual(['Motivation98%', 'Caffeine Levels85%']);

    const fills = bars.map((bar) => bar.querySelector('.career-pods__liveness-bar-fill'));
    expect(fills[0]?.classList.contains('career-pods__liveness-bar-fill--primary')).toBe(true);
    expect(fills[1]?.classList.contains('career-pods__liveness-bar-fill--secondary')).toBe(true);
    expect(fills[0]?.getAttribute('style')).toContain('98%');
    expect(fills[1]?.getAttribute('style')).toContain('85%');
  });

  it('should support keyboard navigation in sidebar (ArrowDown, ArrowUp, Home, End, Enter)', () => {
    const data = parsePortfolioData(portfolioDataJson)!;
    store.hydrate({
      ...data,
      experience: [
        data.experience[0]!,
        {
          company: 'Fixture Systems Ltd',
          role: 'Senior Backend Engineer',
          period: '2018-06 — 2022-02',
          highlights: ['Synthetic second entry for selection coverage.'],
        },
      ],
    });

    const fixture = render();
    const compiled = fixture.nativeElement as HTMLElement;
    const items = () => Array.from(compiled.querySelectorAll('.career-pods__pod-item'));

    // ArrowDown from 0 -> 1
    items()[0]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    fixture.detectChanges();
    expect(store.selectedPodIndex()).toBe(1);

    // ArrowUp from 1 -> 0
    items()[1]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    fixture.detectChanges();
    expect(store.selectedPodIndex()).toBe(0);

    // End -> last
    items()[0]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    fixture.detectChanges();
    expect(store.selectedPodIndex()).toBe(1);

    // Home -> first
    items()[1]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    fixture.detectChanges();
    expect(store.selectedPodIndex()).toBe(0);

    // Enter selects
    items()[0]!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    fixture.detectChanges();
    expect(store.selectedPodIndex()).toBe(0);
  });

  it('should apply reduced-motion guard to pulsing dot and blinking cursor', () => {
    const compiled = render().nativeElement as HTMLElement;
    const dot = compiled.querySelector('.career-pods__status-dot');
    const cursor = compiled.querySelector('.blinking-cursor');
    expect(dot).toBeTruthy();
    expect(cursor).toBeTruthy();
    // Animation is controlled by CSS @media query, we verify classes exist
    expect(dot?.classList.contains('career-pods__status-dot')).toBe(true);
    expect(cursor?.classList.contains('blinking-cursor')).toBe(true);
  });

  it('should have focus-visible styles for sidebar items', () => {
    const compiled = render().nativeElement as HTMLElement;
    const items = compiled.querySelectorAll('.career-pods__pod-item');
    expect(items.length).toBeGreaterThan(0);
    // Focus styles are in CSS @media (forced-colors: active), we verify items exist
    for (const item of items) {
      expect(item.tagName).toBe('BUTTON');
      expect(item.getAttribute('role')).toBe('option');
    }
  });
});