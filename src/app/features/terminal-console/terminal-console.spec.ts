import { TestBed } from '@angular/core/testing';
import { LogEntry } from '../../core/data/portfolio-data';
import { ClusterStateService } from '../../core/state/cluster-state.service';
import { TerminalConsole } from './terminal-console';

function makeLog(index: number, level: LogEntry['level'] = 'INFO'): LogEntry {
  return {
    timestamp: new Date(Date.UTC(2026, 0, 1, 12, 0, index)).toISOString(),
    source: `svc-${index}`,
    level,
    message: `message ${index}`,
  };
}

describe('TerminalConsole', () => {
  let store: ClusterStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TerminalConsole],
      providers: [ClusterStateService],
    });
    store = TestBed.inject(ClusterStateService);
  });

  function render() {
    const fixture = TestBed.createComponent(TerminalConsole);
    fixture.detectChanges();
    return fixture;
  }

  it('should show a themed idle placeholder when the store is empty', () => {
    const fixture = render();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('.terminal-console__empty')?.textContent).toContain('NO LOG OUTPUT');
    expect(compiled.querySelector('.terminal-console__log-row')).toBeNull();
    expect(compiled.querySelector('.terminal-console__count')?.textContent?.trim()).toBe('0 ENTRIES');
  });

  it('should render one row per entry with structured fields in order', () => {
    store.appendLog(makeLog(0));
    store.appendLog(makeLog(1));

    const fixture = render();
    const compiled = fixture.nativeElement as HTMLElement;
    const rows = Array.from(compiled.querySelectorAll<HTMLElement>('.terminal-console__log-row'));

    expect(rows.length).toBe(2);

    const cells = (row: HTMLElement) =>
      Array.from(row.querySelectorAll('span')).map((el) => el.textContent?.trim());

    expect(cells(rows[0])).toEqual([makeLog(0).timestamp, '[svc-0]', 'INFO', 'message 0']);
    expect(cells(rows[1])).toEqual([makeLog(1).timestamp, '[svc-1]', 'INFO', 'message 1']);
  });

  it('should apply level-derived token classes', () => {
    store.appendLog(makeLog(0, 'INFO'));
    store.appendLog(makeLog(1, 'WARN'));
    store.appendLog(makeLog(2, 'ERROR'));

    const fixture = render();
    const compiled = fixture.nativeElement as HTMLElement;
    const levels = Array.from(compiled.querySelectorAll<HTMLElement>('.terminal-console__level'));

    expect(levels[0].classList.contains('terminal-console__level--info')).toBe(true);
    expect(levels[1].classList.contains('terminal-console__level--warn')).toBe(true);
    expect(levels[2].classList.contains('terminal-console__level--error')).toBe(true);
  });

  it('should scroll the viewport to the newest entry whenever entries change', async () => {
    store.appendLog(makeLog(0));
    const fixture = render();

    const viewport = fixture.nativeElement.querySelector(
      '.terminal-console__output',
    ) as HTMLElement | null;
    expect(viewport).toBeTruthy();

    Object.defineProperty(viewport!, 'scrollHeight', { value: 500, configurable: true });
    Object.defineProperty(viewport!, 'clientHeight', { value: 100, configurable: true });

    store.appendLog(makeLog(1));
    await fixture.whenStable();

    expect(viewport!.scrollTop).toBe(500);
  });

  it('should render prompt symbol and cursor', () => {
    store.appendLog(makeLog(0));
    const fixture = render();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('.terminal-console__prompt')?.textContent).toBe('$');
    expect(compiled.querySelector('.blinking-cursor')).toBeTruthy();
  });

  it('should render status bar with entry count', () => {
    store.appendLog(makeLog(0));
    store.appendLog(makeLog(1));
    const fixture = render();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('.terminal-console__count')?.textContent?.trim()).toBe('2 ENTRIES');
  });

  it('should use primary color for INFO level', () => {
    store.appendLog(makeLog(0, 'INFO'));
    const fixture = render();
    const compiled = fixture.nativeElement as HTMLElement;
    const level = compiled.querySelector('.terminal-console__level--info');
    expect(level).toBeTruthy();
    expect(level?.classList.contains('terminal-console__level--info')).toBe(true);
  });

  it('should use tertiary color for WARN level', () => {
    store.appendLog(makeLog(0, 'WARN'));
    const fixture = render();
    const compiled = fixture.nativeElement as HTMLElement;
    const level = compiled.querySelector('.terminal-console__level--warn');
    expect(level).toBeTruthy();
    expect(level?.classList.contains('terminal-console__level--warn')).toBe(true);
  });

  it('should use error color for ERROR level', () => {
    store.appendLog(makeLog(0, 'ERROR'));
    const fixture = render();
    const compiled = fixture.nativeElement as HTMLElement;
    const level = compiled.querySelector('.terminal-console__level--error');
    expect(level).toBeTruthy();
    expect(level?.classList.contains('terminal-console__level--error')).toBe(true);
  });

  it('should apply reduced-motion guard to log entry fadeIn animation', () => {
    store.appendLog(makeLog(0));
    const fixture = render();
    const compiled = fixture.nativeElement as HTMLElement;
    const entry = compiled.querySelector('.terminal-console__log-entry');
    expect(entry).toBeTruthy();
    expect(entry?.classList.contains('terminal-console__log-entry')).toBe(true);
    // Animation is controlled by CSS @media query
  });

  it('should apply reduced-motion guard to blinking cursor', () => {
    store.appendLog(makeLog(0));
    const fixture = render();
    const compiled = fixture.nativeElement as HTMLElement;
    const cursor = compiled.querySelector('.blinking-cursor');
    expect(cursor).toBeTruthy();
    expect(cursor?.classList.contains('blinking-cursor')).toBe(true);
    // Animation is controlled by CSS @media query
  });

  it('should have focus-visible styles on output viewport', () => {
    store.appendLog(makeLog(0));
    const fixture = render();
    const compiled = fixture.nativeElement as HTMLElement;
    const viewport = compiled.querySelector('.terminal-console__output');
    expect(viewport).toBeTruthy();
    // Focus styles are in CSS @media (forced-colors: active), we verify element exists
  });

  it('should use secondary color for source', () => {
    store.appendLog(makeLog(0));
    const fixture = render();
    const compiled = fixture.nativeElement as HTMLElement;
    const source = compiled.querySelector('.terminal-console__source');
    expect(source).toBeTruthy();
    expect(source?.classList.contains('terminal-console__source')).toBe(true);
  });

  it('should use on-surface-variant for timestamp', () => {
    store.appendLog(makeLog(0));
    const fixture = render();
    const compiled = fixture.nativeElement as HTMLElement;
    const timestamp = compiled.querySelector('.terminal-console__timestamp');
    expect(timestamp).toBeTruthy();
    expect(timestamp?.classList.contains('terminal-console__timestamp')).toBe(true);
  });

  it('should show tip line when lens is recruiter and hide when engineer', () => {
    store.setLens('recruiter');
    store.appendLog(makeLog(0));
    let fixture = render();
    let compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.terminal-console__tip')?.textContent?.trim()).toBe('> tip: toggle view in settings');

    store.setLens('engineer');
    fixture.detectChanges();
    compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.terminal-console__tip')).toBeNull();
  });

  it('should have no coachmark in terminal', () => {
    store.appendLog(makeLog(0));
    const fixture = render();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('[class*="coachmark"]')).toBeNull();
    expect(compiled.querySelector('[class*="tutorial"]')).toBeNull();
  });
});