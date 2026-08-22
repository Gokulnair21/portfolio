import { TestBed } from '@angular/core/testing';
import portfolioDataJson from '../../../../public/portfolio-data.json';
import { parsePortfolioData } from '../../core/data/portfolio-data';
import { ClusterStateService } from '../../core/state/cluster-state.service';
import { EnvRegistry } from './env-registry';

describe('EnvRegistry', () => {
  let store: ClusterStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [EnvRegistry],
      providers: [ClusterStateService],
    });
    store = TestBed.inject(ClusterStateService);
    store.hydrate(parsePortfolioData(portfolioDataJson)!);
  });

  function render() {
    const fixture = TestBed.createComponent(EnvRegistry);
    fixture.detectChanges();
    return fixture;
  }

  function rows(compiled: HTMLElement): string[][] {
    return Array.from(compiled.querySelectorAll('tbody .property-row')).map((row) =>
      Array.from(row.querySelectorAll('td')).map((cell) => cell.textContent?.trim() ?? ''),
    );
  }

  function setFilter(fixture: ReturnType<typeof render>, text: string): void {
    const input = fixture.nativeElement.querySelector('.filter-input') as HTMLInputElement;
    input.value = text;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
  }

  it('should render one key/value row per shipped env property', () => {
    const data = parsePortfolioData(portfolioDataJson)!;
    const compiled = render().nativeElement as HTMLElement;

    expect(compiled.querySelector('.registry-endpoint')?.textContent).toContain('/actuator/env');
    expect(rows(compiled)).toEqual(
      data.envProperties.map((property) => [property.key, property.value]),
    );
  });

  it('should filter live by value substring case-insensitively', () => {
    const fixture = render();

    setFilter(fixture, 'JAVA');

    expect(rows(fixture.nativeElement as HTMLElement)).toEqual([
      ['gokul.skills.languages', 'Java 17'],
    ]);
  });

  it('should filter live by key substring case-insensitively', () => {
    const fixture = render();

    setFilter(fixture, 'gokul.skills');

    expect(rows(fixture.nativeElement as HTMLElement)).toEqual([
      ['gokul.skills.languages', 'Java 17'],
      ['gokul.skills.frameworks', 'Spring Boot'],
      ['gokul.skills.messaging', 'Kafka, RabbitMQ'],
      ['gokul.skills.persistence', 'PostgreSQL, Redis'],
      ['gokul.skills.observability', 'Prometheus, Grafana'],
      ['gokul.skills.practices', 'TDD, contract testing'],
    ]);
  });

  it('should show a themed empty state instead of a blank panel on zero matches', () => {
    const fixture = render();

    setFilter(fixture, 'no-such-token');

    const compiled = fixture.nativeElement as HTMLElement;
    expect(rows(compiled)).toEqual([]);
    expect(compiled.querySelector('.registry-empty')?.textContent?.trim()).toBe(
      'NO MATCHING PROPERTIES',
    );
  });
});
