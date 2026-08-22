import { Injectable, signal } from '@angular/core';
import { PortfolioData } from '../data/portfolio-data';
import { DEFAULT_TAB, TabId } from './tabs';

export type DataStatus = 'loading' | 'ready' | 'failed';

@Injectable()
export class ClusterStateService {
  readonly #tab = signal<TabId>(DEFAULT_TAB);
  readonly #dataStatus = signal<DataStatus>('loading');
  readonly #content = signal<PortfolioData | null>(null);

  readonly selectedTab = this.#tab.asReadonly();
  readonly dataStatus = this.#dataStatus.asReadonly();
  readonly content = this.#content.asReadonly();

  selectTab(id: TabId): void {
    this.#tab.set(id);
  }

  hydrate(data: PortfolioData): void {
    this.#content.set(data);
    this.#dataStatus.set('ready');
  }

  markLoadFailed(): void {
    this.#content.set(null);
    this.#dataStatus.set('failed');
  }
}
