import { Injectable, signal } from '@angular/core';
import { DEFAULT_TAB, TabId } from './tabs';

@Injectable()
export class ClusterStateService {
  readonly #tab = signal<TabId>(DEFAULT_TAB);

  readonly selectedTab = this.#tab.asReadonly();

  selectTab(id: TabId): void {
    this.#tab.set(id);
  }
}
