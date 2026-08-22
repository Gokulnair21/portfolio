import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { PortfolioDataLoader } from './core/data/portfolio-data-loader.service';
import { ClusterStateService } from './core/state/cluster-state.service';
import { TABS } from './core/state/tabs';
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
