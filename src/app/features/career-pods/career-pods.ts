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

function calculateAgeFromPeriod(period: string): string {
  // Extract start year from period like "Jun 2021 — Present" or "2018-06 — 2022-02"
  const match = period.match(/(\d{4})/);
  if (!match) return '0y 0m';
  const startYear = parseInt(match[1], 10);
  const currentYear = new Date().getFullYear();
  const years = currentYear - startYear;
  const months = new Date().getMonth();
  // Approximate: assume mid-year start
  return `${years}y ${months}m`;
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

  protected calculateAge(period: string): string {
    return calculateAgeFromPeriod(period);
  }

  protected onPodKeydown(event: KeyboardEvent, index: number): void {
    const pods = this.pods();
    if (pods.length === 0) return;

    let newIndex = index;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        newIndex = (index + 1) % pods.length;
        break;
      case 'ArrowUp':
        event.preventDefault();
        newIndex = (index - 1 + pods.length) % pods.length;
        break;
      case 'Home':
        event.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        event.preventDefault();
        newIndex = pods.length - 1;
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.selectPod(index);
        return;
      default:
        return;
    }
    this.selectPod(newIndex);
  }
}