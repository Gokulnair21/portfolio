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

    expect(compiled.querySelector('.console-empty')?.textContent).toContain('NO LOG OUTPUT');
    expect(compiled.querySelector('.console-viewport')).toBeNull();
    expect(compiled.querySelector('.console-count')?.textContent?.trim()).toBe('0 ENTRIES');
  });

  it('should render one row per entry with structured fields in order', () => {
    store.appendLog(makeLog(0));
    store.appendLog(makeLog(1));

    const fixture = render();
    const compiled = fixture.nativeElement as HTMLElement;
    const rows = Array.from(compiled.querySelectorAll<HTMLElement>('.log-row'));

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
    const levels = Array.from(compiled.querySelectorAll<HTMLElement>('.log-level'));

    expect(levels[0].classList.contains('log-level-info')).toBe(true);
    expect(levels[1].classList.contains('log-level-warn')).toBe(true);
    expect(levels[2].classList.contains('log-level-error')).toBe(true);
  });

  it('should scroll the viewport to the newest entry whenever entries change', async () => {
    store.appendLog(makeLog(0));
    const fixture = render();

    const viewport = fixture.nativeElement.querySelector(
      '.console-viewport',
    ) as HTMLElement | null;
    expect(viewport).toBeTruthy();

    Object.defineProperty(viewport!, 'scrollHeight', { value: 500, configurable: true });
    Object.defineProperty(viewport!, 'clientHeight', { value: 100, configurable: true });

    store.appendLog(makeLog(1));
    await fixture.whenStable();

    expect(viewport!.scrollTop).toBe(500);
  });
});
