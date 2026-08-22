import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ClusterStateService } from './core/state/cluster-state.service';
import { TABS } from './core/state/tabs';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  protected readonly serviceTitle = signal('PORTFOLIO-SERVICE');
  protected readonly statusLabel = signal('UP');

  protected readonly tabs = TABS;
  protected readonly store = inject(ClusterStateService);
}
