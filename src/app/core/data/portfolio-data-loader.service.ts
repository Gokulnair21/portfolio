import { APP_BASE_HREF } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { DOCUMENT } from '@angular/core';
import { Injectable, inject, signal } from '@angular/core';
import { ClusterStateService } from '../state/cluster-state.service';
import { bootLogEntries } from '../simulation/boot-sequence';
import { parsePortfolioDataDetailed } from './portfolio-data';

const DATA_FILE = 'portfolio-data.json';
const LOG_TAG = '[portfolio-data]';

@Injectable()
export class PortfolioDataLoader {
  readonly #http = inject(HttpClient);
  readonly #store = inject(ClusterStateService);
  readonly #baseHref = inject(APP_BASE_HREF, { optional: true });
  readonly #document = inject(DOCUMENT);
  readonly #pending = signal(false);
  #requestSeq = 0;

  readonly pending = this.#pending.asReadonly();

  load(): void {
    const request = ++this.#requestSeq;
    this.#pending.set(true);
    this.#http.get<unknown>(this.#dataUrl()).subscribe({
      next: (raw) => {
        if (request !== this.#requestSeq) return;
        this.#pending.set(false);

        const result = parsePortfolioDataDetailed(raw);
        if (!result.ok) {
          console.error(`${LOG_TAG} validation failed — ${result.reason}`);
          this.#store.markLoadFailed();
          return;
        }
        this.#store.hydrate(result.value);
        bootLogEntries().forEach((entry) => this.#store.appendLog(entry));
      },
      error: (error: unknown) => {
        if (request !== this.#requestSeq) return;
        this.#pending.set(false);

        const status = error instanceof HttpErrorResponse ? error.status : 'unknown status';
        console.error(`${LOG_TAG} fetch failed (HTTP ${status})`);
        this.#store.markLoadFailed();
      },
    });
  }

  #dataUrl(): string {
    const base = this.#baseHref ?? new URL('.', this.#document.baseURI).pathname;
    const normalized = base.endsWith('/') ? base : `${base}/`;
    return `${normalized}${DATA_FILE}`;
  }
}
