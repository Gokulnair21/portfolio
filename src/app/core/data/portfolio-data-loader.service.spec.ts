import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ClusterStateService } from '../state/cluster-state.service';
import { PortfolioDataLoader } from './portfolio-data-loader.service';

const DATA_URL = '/portfolio-data.json';

const VALID_PAYLOAD = {
  projects: [
    {
      name: 'cluster-control',
      description: 'Ops console.',
      stack: ['Angular', 'TypeScript'],
      repoUrl: 'https://github.com/example/cluster-control',
    },
  ],
  experience: [
    {
      company: 'Example Corp',
      role: 'Staff Platform Engineer',
      period: '2022-03 — present',
      highlights: ['Led event-driven migration.'],
    },
  ],
  contact: {
    email: 'you@example.com',
    github: 'https://github.com/your-handle',
    linkedin: 'https://www.linkedin.com/in/your-handle',
  },
  envProperties: [{ key: 'cluster.region', value: 'eu-central-1' }],
};

describe('PortfolioDataLoader', () => {
  let http: HttpTestingController;
  let store: ClusterStateService;
  let loader: PortfolioDataLoader;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ClusterStateService,
        PortfolioDataLoader,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    store = TestBed.inject(ClusterStateService);
    loader = TestBed.inject(PortfolioDataLoader);
  });

  afterEach(() => {
    http.verify();
    vi.restoreAllMocks();
  });

  it('should fetch portfolio-data.json and hydrate the store on valid payload', () => {
    loader.load();

    const req = http.expectOne(DATA_URL);
    expect(req.request.method).toBe('GET');
    req.flush(VALID_PAYLOAD);

    expect(store.dataStatus()).toBe('ready');
    expect(store.content()?.projects[0]?.name).toBe('cluster-control');
    expect(store.content()?.contact.email).toBe('you@example.com');
  });

  it('should expose pending while the fetch is in flight', () => {
    expect(loader.pending()).toBe(false);

    loader.load();
    expect(loader.pending()).toBe(true);

    http.expectOne(DATA_URL).flush(VALID_PAYLOAD);
    expect(loader.pending()).toBe(false);
  });

  it('should ignore a superseded late success response', () => {
    loader.load();
    loader.load();

    const requests = http.match((request) => request.url === DATA_URL);
    expect(requests.length).toBe(2);
    const [first, second] = requests;

    first.flush(VALID_PAYLOAD);
    second.flush({
      ...VALID_PAYLOAD,
      contact: { ...VALID_PAYLOAD.contact, email: 'newer@example.com' },
    });

    expect(store.dataStatus()).toBe('ready');
    expect(store.content()?.contact.email).toBe('newer@example.com');
    expect(loader.pending()).toBe(false);
  });

  it('should not flip store state on a superseded late failure', () => {
    loader.load();
    loader.load();

    const requests = http.match((request) => request.url === DATA_URL);
    expect(requests.length).toBe(2);
    const [first, second] = requests;

    first.flush(null, { status: 404, statusText: 'Not Found' });
    second.flush(VALID_PAYLOAD);

    expect(store.dataStatus()).toBe('ready');
    expect(loader.pending()).toBe(false);
  });

  it('should log a reason and fail when payload fails runtime guards', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    loader.load();
    const invalid = { ...VALID_PAYLOAD, contact: { email: 42 } };
    http.expectOne(DATA_URL).flush(invalid);

    expect(store.dataStatus()).toBe('failed');
    expect(store.content()).toBeNull();
    expect(errorSpy.mock.calls.some((call) => String(call[0]).includes('validation failed'))).toBe(
      true,
    );
  });

  it('should fail when payload is missing a required section', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    loader.load();
    http.expectOne(DATA_URL).flush({
      projects: VALID_PAYLOAD.projects,
      experience: VALID_PAYLOAD.experience,
      contact: VALID_PAYLOAD.contact,
    });

    expect(store.dataStatus()).toBe('failed');
  });

  it('should fail on malformed JSON body', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    loader.load();
    http.expectOne(DATA_URL).flush('not json at all', {
      headers: { 'Content-Type': 'application/json' },
    });

    expect(store.dataStatus()).toBe('failed');
    expect(store.content()).toBeNull();
    expect(errorSpy.mock.calls.length).toBeGreaterThan(0);
  });

  it('should log HTTP status and fail on HTTP error', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    loader.load();
    http.expectOne(DATA_URL).flush(null, { status: 404, statusText: 'Not Found' });

    expect(store.dataStatus()).toBe('failed');
    expect(store.content()).toBeNull();
    expect(errorSpy.mock.calls.some((call) => String(call[0]).includes('HTTP 404'))).toBe(true);
  });

  it('should recover via retry after a failure', () => {
    loader.load();
    http.expectOne(DATA_URL).flush(null, { status: 500, statusText: 'Server Error' });
    expect(store.dataStatus()).toBe('failed');

    loader.load();
    expect(loader.pending()).toBe(true);

    http.expectOne(DATA_URL).flush(VALID_PAYLOAD);

    expect(store.dataStatus()).toBe('ready');
    expect(store.content()).not.toBeNull();
    expect(loader.pending()).toBe(false);
  });

  it('should keep failing when retry also errors', () => {
    loader.load();
    http.expectOne(DATA_URL).flush(null, { status: 404, statusText: 'Not Found' });

    loader.load();
    http.expectOne(DATA_URL).flush(null, { status: 404, statusText: 'Not Found' });

    expect(store.dataStatus()).toBe('failed');
  });
});
