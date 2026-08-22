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

  function nodeGroups(compiled: HTMLElement): SVGElement[] {
    return Array.from(compiled.querySelectorAll<SVGElement>('.topo-node'));
  }

  it('should render exactly five named service nodes as inline SVG groups', () => {
    const compiled = render().nativeElement as HTMLElement;
    const groups = nodeGroups(compiled);

    expect(groups.length).toBe(5);

    const labels = groups.map((group) =>
      group.querySelector('.node-label')?.textContent?.trim(),
    );
    expect(labels).toContain('api-gateway');
    expect(labels).toContain('auth-service');
    expect(labels).toContain('payment-service');
    expect(labels).toContain('notify-service');
    expect(labels).toContain('postgresql-db');
    expect(compiled.querySelector('svg.topology-svg')).not.toBeNull();
  });

  it('should show the inspection placeholder before any selection', () => {
    const compiled = render().nativeElement as HTMLElement;

    expect(compiled.querySelector('.detail-placeholder')?.textContent).toContain(
      'SELECT A SERVICE NODE',
    );
    expect(compiled.querySelector('.detail-card')).toBeNull();
  });

  it('should select the clicked node through the store and highlight it', () => {
    const fixture = render();
    const compiled = fixture.nativeElement as HTMLElement;

    const paymentGroup = nodeGroups(compiled).find(
      (group) => group.querySelector('.node-label')?.textContent?.trim() === 'payment-service',
    )!;
    paymentGroup.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();

    expect(store.selectedNodeId()).toBe('payment-service');
    expect(
      nodeGroups(compiled as HTMLElement)
        .find((group) => group.querySelector('.node-label')?.textContent?.trim() === 'payment-service')
        ?.classList.contains('node-selected'),
    ).toBe(true);
  });

  it('should show the selected node description, tech stack, and metrics from JSON', () => {
    store.selectNode('api-gateway');
    const compiled = render().nativeElement as HTMLElement;

    const card = compiled.querySelector('.detail-card')!;
    expect(card.querySelector('.detail-title')?.textContent?.trim()).toBe('api-gateway');

    const data = parsePortfolioData(portfolioDataJson)!;
    const expected = data.topology.nodes.find((node) => node.id === 'api-gateway')!;
    expect(card.querySelector('.detail-description')?.textContent?.trim()).toBe(
      expected.description,
    );

    const techItems = Array.from(card.querySelectorAll('.tech-item')).map((item) =>
      item.textContent?.trim(),
    );
    expect(techItems).toEqual(expected.techStack);

    const metricRows = Array.from(card.querySelectorAll('.metric-row')).map((row) => [
      row.querySelector('.metric-label')?.textContent?.trim(),
      row.querySelector('.metric-value')?.textContent?.trim(),
    ]);
    expect(metricRows).toEqual(
      expected.metrics.map((metric) => [metric.label, metric.value]),
    );
  });
});
