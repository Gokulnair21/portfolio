import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ExperienceEntry } from '../../core/data/portfolio-data';
import { ClusterStateService } from '../../core/state/cluster-state.service';

export interface CareerPod {
  readonly index: number;
  readonly name: string;
  readonly entry: ExperienceEntry;
}

function slugifyCompany(company: string): string {
  return company.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-career-pods',
  templateUrl: './career-pods.html',
  styleUrl: './career-pods.css',
})
export class CareerPods {
  protected readonly store = inject(ClusterStateService);

  protected readonly pods = computed<CareerPod[]>(() =>
    (this.store.content()?.experience ?? []).map((entry, index) => ({
      index,
      name: `pod-experience-${slugifyCompany(entry.company)}-${index}`,
      entry,
    })),
  );

  protected readonly selectedPod = computed<CareerPod | null>(() => {
    const index = this.store.selectedPodIndex();
    return this.pods().find((pod) => pod.index === index) ?? null;
  });

  protected selectPod(index: number): void {
    this.store.selectPod(index);
  }
}
