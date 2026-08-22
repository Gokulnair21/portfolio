import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ClusterStateService } from '../../core/state/cluster-state.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-health-dashboard',
  templateUrl: './health-dashboard.html',
  styleUrl: './health-dashboard.css',
})
export class HealthDashboard {
  protected readonly store = inject(ClusterStateService);
}
