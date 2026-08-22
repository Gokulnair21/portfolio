import { TestBed } from '@angular/core/testing';
import portfolioDataJson from '../../../../public/portfolio-data.json';
import { parsePortfolioData } from '../../core/data/portfolio-data';
import { ClusterStateService } from '../../core/state/cluster-state.service';
import { SwaggerPlayground } from './swagger-playground';

describe('SwaggerPlayground', () => {
  let store: ClusterStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SwaggerPlayground],
      providers: [ClusterStateService],
    });
    store = TestBed.inject(ClusterStateService);
    store.hydrate(parsePortfolioData(portfolioDataJson)!);
  });

  function render() {
    const fixture = TestBed.createComponent(SwaggerPlayground);
    fixture.detectChanges();
    return fixture;
  }

  function setBody(fixture: ReturnType<typeof render>, text: string): void {
    const editor = fixture.nativeElement.querySelector('.request-editor') as HTMLTextAreaElement;
    editor.value = text;
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
  }

  function execute(fixture: ReturnType<typeof render>): void {
    (fixture.nativeElement.querySelector('.execute-button') as HTMLButtonElement).click();
    fixture.detectChanges();
  }

  it('should render the contact endpoint listing with a prefilled request body', () => {
    const data = parsePortfolioData(portfolioDataJson)!;
    const compiled = render().nativeElement as HTMLElement;

    expect(compiled.querySelector('.method-badge')?.textContent?.trim()).toBe('POST');
    expect(compiled.querySelector('.endpoint-path')?.textContent?.trim()).toBe('/api/v1/contact');

    const preview = compiled.querySelector('.request-preview')?.textContent ?? '';
    expect(JSON.parse(preview)).toEqual({ name: '', email: data.contact.email, message: '' });
    expect(compiled.querySelector('.execute-button')).toBeNull();
  });

  it('should swap preview for an editable editor and execute button when try-it-out is active', () => {
    const fixture = render();
    const compiled = fixture.nativeElement as HTMLElement;

    (compiled.querySelector('.try-button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(compiled.querySelector('.request-editor')).toBeTruthy();
    expect(compiled.querySelector('.execute-button')?.textContent?.trim()).toBe('EXECUTE');
    expect(compiled.querySelector('.request-preview')).toBeNull();
  });

  it('should restore defaults when try-it-out is toggled back off', () => {
    const data = parsePortfolioData(portfolioDataJson)!;
    const fixture = render();
    const compiled = fixture.nativeElement as HTMLElement;

    (compiled.querySelector('.try-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    setBody(fixture, '{"name":"tampered"}');
    (compiled.querySelector('.try-button') as HTMLButtonElement).click();
    fixture.detectChanges();

    const preview = compiled.querySelector('.request-preview')?.textContent ?? '';
    expect(JSON.parse(preview)).toEqual({ name: '', email: data.contact.email, message: '' });
  });

  it('should reject malformed JSON inline without producing logs or a response', () => {
    const fixture = render();
    const compiled = fixture.nativeElement as HTMLElement;

    (compiled.querySelector('.try-button') as HTMLButtonElement).click();
    fixture.detectChanges();
    setBody(fixture, '{not json');
    execute(fixture);

    expect(compiled.querySelector('.validation-error')?.textContent).toContain(
      'not valid JSON',
    );
    expect(store.logs().length).toBe(0);
    expect(compiled.querySelector('.response-viewer')).toBeNull();
  });

  it('should reject empty, array, and null bodies as non-object payloads', () => {
    const fixture = render();

    (fixture.nativeElement.querySelector('.try-button') as HTMLButtonElement).click();
    fixture.detectChanges();

    for (const body of ['', '[]', 'null']) {
      setBody(fixture, body);
      execute(fixture);

      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.validation-error')).toBeTruthy();
    }

    expect(store.logs().length).toBe(0);
  });
});
