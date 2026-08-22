import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { EnvProperty } from '../../core/data/portfolio-data';
import { ClusterStateService } from '../../core/state/cluster-state.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-env-registry',
  templateUrl: './env-registry.html',
  styleUrl: './env-registry.css',
})
export class EnvRegistry {
  protected readonly store = inject(ClusterStateService);

  protected readonly filterText = signal('');

  protected readonly filteredProperties = computed<readonly EnvProperty[]>(() => {
    const query = this.filterText().trim().toLowerCase();
    const properties = this.store.content()?.envProperties ?? [];
    if (query.length === 0) return properties;
    return properties.filter(
      (property) =>
        property.key.toLowerCase().includes(query) ||
        property.value.toLowerCase().includes(query),
    );
  });

  protected onFilterInput(event: Event): void {
    this.filterText.set((event.target as HTMLInputElement).value);
  }
}
