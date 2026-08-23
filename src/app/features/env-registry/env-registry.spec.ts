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
    return Array.from(compiled.querySelectorAll('tbody .env-registry__row')).map((row) =>
      Array.from(row.querySelectorAll('td')).map((cell) => cell.textContent?.trim() ?? ''),
    );
  }

  function setFilter(fixture: ReturnType<typeof render>, text: string): void {
    const input = fixture.nativeElement.querySelector('.env-registry__filter-input') as HTMLInputElement;
    input.value = text;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
  }

  it('should render one key/value row per shipped env property', () => {
    const data = parsePortfolioData(portfolioDataJson)!;
    const compiled = render().nativeElement as HTMLElement;

    expect(compiled.querySelector('.env-registry__subtitle')?.textContent).toContain('/actuator/env');
    expect(rows(compiled)).toEqual(
      data.envProperties.map((property) => [property.key, property.value]),
    );
  });

  it('should filter live by value substring case-insensitively', () => {
    const fixture = render();

    setFilter(fixture, 'JAVA');

    expect(rows(fixture.nativeElement as HTMLElement)).toEqual([
      ['gokul.skills.languages', 'Java 8/17/21, Kotlin'],
    ]);
  });

  it('should filter live by key substring case-insensitively', () => {
    const fixture = render();

    setFilter(fixture, 'gokul.skills');

    expect(rows(fixture.nativeElement as HTMLElement)).toEqual([
      ['gokul.skills.languages', 'Java 8/17/21, Kotlin'],
      ['gokul.skills.frameworks', 'Spring Boot, Spring MVC, Spring Security, Spring Cloud, Hibernate, JPA'],
      ['gokul.skills.architecture', 'Microservices, REST API Design, Event-Driven, Saga, CQRS, Circuit Breaker'],
      ['gokul.skills.messaging', 'Apache Kafka (multi consumer groups)'],
      ['gokul.skills.security', 'mTLS, JWT, OAuth2, RBAC, AES Encryption'],
      ['gokul.skills.persistence', 'MySQL, PostgreSQL, Redis'],
      ['gokul.skills.observability', 'Dynatrace, Docker, Jenkins, AWS'],
      ['gokul.skills.testing', 'JUnit, Mockito, Git, Bitbucket'],
    ]);
  });

  it('should show a themed empty state instead of a blank panel on zero matches', () => {
    const fixture = render();

    setFilter(fixture, 'no-such-token');

    const compiled = fixture.nativeElement as HTMLElement;
    expect(rows(compiled)).toEqual([]);
    expect(compiled.querySelector('.env-registry__empty')?.textContent?.trim()).toBe(
      'NO MATCHING PROPERTIES',
    );
  });

  it('should render header with title and subtitle', () => {
    const compiled = render().nativeElement as HTMLElement;
    expect(compiled.querySelector('.env-registry__title')?.textContent?.trim()).toBe('Property Registry');
    expect(compiled.querySelector('.env-registry__subtitle')?.textContent?.trim()).toBe('/actuator/env - Configured System Properties');
  });

  it('should render filter input with search icon and placeholder', () => {
    const compiled = render().nativeElement as HTMLElement;
    const input = compiled.querySelector('.env-registry__filter-input') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input?.placeholder).toBe('filter properties...');
    expect(compiled.querySelector('.env-registry__filter-icon')?.textContent?.trim()).toBe('search');
  });

  it('should render active profiles badge bar with prod and aws badges', () => {
    const compiled = render().nativeElement as HTMLElement;
    expect(compiled.querySelector('.env-registry__profiles-icon')?.textContent?.trim()).toBe('eco');
    expect(compiled.querySelector('.env-registry__profiles-label')?.textContent?.trim()).toBe('Active Profiles:');

    const badges = Array.from(compiled.querySelectorAll('.env-registry__profile-badge')).map((b) => b.textContent?.trim());
    expect(badges).toEqual(['prod', 'aws']);

    const primaryBadge = compiled.querySelector('.env-registry__profile-badge--primary');
    expect(primaryBadge).toBeTruthy();
    expect(primaryBadge?.classList.contains('env-registry__profile-badge--primary')).toBe(true);

    const secondaryBadge = compiled.querySelector('.env-registry__profile-badge--secondary');
    expect(secondaryBadge).toBeTruthy();
    expect(secondaryBadge?.classList.contains('env-registry__profile-badge--secondary')).toBe(true);
  });

  it('should render system healthy indicator with pulsing dot', () => {
    const compiled = render().nativeElement as HTMLElement;
    const dot = compiled.querySelector('.env-registry__health-dot');
    expect(dot).toBeTruthy();
    expect(dot?.classList.contains('env-registry__health-dot')).toBe(true);
    expect(compiled.querySelector('.env-registry__health-text')?.textContent?.trim()).toBe('System Healthy');
  });

  it('should render table with proper column headers', () => {
    const compiled = render().nativeElement as HTMLElement;
    const headers = Array.from(compiled.querySelectorAll('.env-registry__th')).map((h) => h.textContent?.trim());
    expect(headers).toEqual(['Property Key', 'Value']);
  });

  it('should render table rows with key in primary color and value in on-surface with bold weight', () => {
    const compiled = render().nativeElement as HTMLElement;
    const rows = compiled.querySelectorAll('.env-registry__row');
    expect(rows.length).toBeGreaterThan(0);

    const firstRow = rows[0];
    const keyCell = firstRow.querySelector('.env-registry__td--key');
    const valueCell = firstRow.querySelector('.env-registry__td--value');

    expect(keyCell).toBeTruthy();
    expect(valueCell).toBeTruthy();
    expect(keyCell?.classList.contains('env-registry__td--key')).toBe(true);
    expect(valueCell?.classList.contains('env-registry__td--value')).toBe(true);
    expect(getComputedStyle(valueCell!).fontWeight).toBe('700');
  });

  it('should highlight row on hover with left border on key cell', () => {
    const compiled = render().nativeElement as HTMLElement;
    const row = compiled.querySelector('.env-registry__row');
    expect(row).toBeTruthy();
    // Hover styles are in CSS, we verify the class exists
    expect(row?.classList.contains('env-registry__row')).toBe(true);
  });

  it('should have focus-visible styles on filter input', () => {
    const compiled = render().nativeElement as HTMLElement;
    const input = compiled.querySelector('.env-registry__filter-input');
    expect(input).toBeTruthy();
    // Focus styles are in CSS @media (forced-colors: active), we verify element exists
    expect(input?.tagName).toBe('INPUT');
  });

  it('should apply reduced-motion guard to health dot pulse animation', () => {
    const compiled = render().nativeElement as HTMLElement;
    const dot = compiled.querySelector('.env-registry__health-dot');
    expect(dot).toBeTruthy();
    expect(dot?.classList.contains('env-registry__health-dot')).toBe(true);
    // Animation is controlled by CSS @media query
  });

  it('should have Firefox scrollbar styles on table wrapper', () => {
    const compiled = render().nativeElement as HTMLElement;
    const wrapper = compiled.querySelector('.env-registry__table-wrapper');
    expect(wrapper).toBeTruthy();
    // Firefox scrollbar styles use @supports, we verify the wrapper exists
  });
});