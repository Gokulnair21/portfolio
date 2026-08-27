import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { PortfolioDataLoader } from './core/data/portfolio-data-loader.service';
import { ClusterStateService } from './core/state/cluster-state.service';
import { TABS, TabId } from './core/state/tabs';
import { CareerPods } from './features/career-pods/career-pods';
import { EnvRegistry } from './features/env-registry/env-registry';
import { HealthDashboard } from './features/health-dashboard/health-dashboard';
import { ServiceTopology } from './features/topology/service-topology';
import { SwaggerPlayground } from './features/swagger-playground/swagger-playground';
import { TerminalConsole } from './features/terminal-console/terminal-console';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  imports: [
    CareerPods,
    EnvRegistry,
    HealthDashboard,
    ServiceTopology,
    SwaggerPlayground,
    TerminalConsole,
  ],
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  protected readonly serviceTitle = signal('SpringActuator-Portfolio');

  protected readonly tabs = TABS;
  protected readonly store = inject(ClusterStateService);
  protected readonly loader = inject(PortfolioDataLoader);
  protected readonly sheetOpen = signal(false);

  protected readonly statusLabel = computed(() =>
    this.store.dataStatus() === 'failed' ? 'DOWN' : 'UP',
  );

  protected readonly tabsEnabled = computed(() => this.store.dataStatus() === 'ready');

  protected onTabKeydown(event: KeyboardEvent, tabId: TabId): void {
    const tabIds = this.tabs.map((t) => t.id);
    const currentIndex = tabIds.indexOf(tabId);
    let newIndex = currentIndex;

    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault();
        newIndex = (currentIndex + 1) % tabIds.length;
        break;
      case 'ArrowLeft':
        event.preventDefault();
        newIndex = (currentIndex - 1 + tabIds.length) % tabIds.length;
        break;
      case 'Home':
        event.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        event.preventDefault();
        newIndex = tabIds.length - 1;
        break;
      default:
        return;
    }

    this.store.selectTab(tabIds[newIndex]);
  }

  protected toggleSheet(): void {
    this.sheetOpen.update((v) => !v);
  }

  protected openSheet(): void {
    this.sheetOpen.set(true);
  }

  protected closeSheet(): void {
    this.sheetOpen.set(false);
  }

  protected selectTabAndClose(id: TabId): void {
    this.store.selectTab(id);
    this.closeSheet();
  }

  protected onSettingsClick(): void {
    console.log('Settings clicked');
  }

  protected onTerminalClick(): void {
    console.log('Terminal clicked');
  }

  protected retry(): void {
    if (!this.loader.pending()) {
      this.loader.load();
    }
  }
}