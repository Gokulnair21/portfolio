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

    const cards = Array.from(compiled.querySelectorAll('.pod-card'));
    expect(cards.length).toBe(data.experience.length);

    const names = cards.map((card) => card.querySelector('.pod-name')?.textContent?.trim());
    expect(names).toEqual(['pod-experience-neosoft-technologies-0']);

    for (const card of cards) {
      expect(card.querySelector('.pod-status')?.textContent?.trim()).toContain('Running');
    }
  });

  it('should show the inspection placeholder before any pod is selected', () => {
    const compiled = render().nativeElement as HTMLElement;

    expect(compiled.querySelector('.detail-placeholder')?.textContent).toContain(
      'SELECT A POD',
    );
    expect(compiled.querySelector('.detail-card')).toBeNull();
  });

  it('should select the clicked pod through the store and highlight exactly that card', () => {
    const fixture = render();
    const compiled = fixture.nativeElement as HTMLElement;

    const cards = () => Array.from(compiled.querySelectorAll('.pod-card'));

    cards()[0]!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();

    expect(store.selectedPodIndex()).toBe(0);
    expect(cards().filter((card) => card.classList.contains('pod-selected')).length).toBe(1);
    expect(cards()[0]!.classList.contains('pod-selected')).toBe(true);
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

    const cards = () => Array.from(compiled.querySelectorAll('.pod-card'));

    cards()[0]!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();

    expect(store.selectedPodIndex()).toBe(0);
    expect(cards()[0]!.classList.contains('pod-selected')).toBe(true);

    cards()[1]!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();

    expect(store.selectedPodIndex()).toBe(1);
    expect(cards()[0]!.classList.contains('pod-selected')).toBe(false);
    expect(cards()[1]!.classList.contains('pod-selected')).toBe(true);
  });

  it('should show timeline, role, company, and bulleted responsibilities for the selected entry', () => {
    const data = parsePortfolioData(portfolioDataJson)!;
    const expected = data.experience[0]!;
    store.selectPod(0);
    const compiled = render().nativeElement as HTMLElement;

    const card = compiled.querySelector('.detail-card')!;
    expect(card.querySelector('.timeline-value')?.textContent?.trim()).toBe(expected.period);
    expect(card.querySelector('.detail-role')?.textContent?.trim()).toBe(expected.role);
    expect(card.querySelector('.detail-company')?.textContent?.trim()).toBe(expected.company);

    const highlights = Array.from(card.querySelectorAll('.highlight-item')).map((item) =>
      item.textContent?.trim(),
    );
    expect(highlights).toEqual(expected.highlights);
    expect(highlights.length).toBeGreaterThan(0);
  });
});
