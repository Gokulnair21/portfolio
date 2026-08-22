import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { PortfolioDataLoader } from './core/data/portfolio-data-loader.service';
import { ClusterStateService } from './core/state/cluster-state.service';
import { TABS } from './core/state/tabs';
import { HealthDashboard } from './features/health-dashboard/health-dashboard';
import { ServiceTopology } from './features/topology/service-topology';
import { TerminalConsole } from './features/terminal-console/terminal-console';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  imports: [HealthDashboard, ServiceTopology, TerminalConsole],
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  protected readonly serviceTitle = signal('PORTFOLIO-SERVICE');

  protected readonly tabs = TABS;
  protected readonly store = inject(ClusterStateService);
  protected readonly loader = inject(PortfolioDataLoader);

  protected readonly statusLabel = computed(() =>
    this.store.dataStatus() === 'failed' ? 'DOWN' : 'UP',
  );

  protected readonly tabsEnabled = computed(() => this.store.dataStatus() === 'ready');

  protected retry(): void {
    if (!this.loader.pending()) {
      this.loader.load();
    }
  }
}
