import { ChangeDetectionStrategy, Component, computed, HostListener, inject, signal } from '@angular/core';
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
  protected readonly settingsOpen = signal(false);

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
    const willOpen = !this.settingsOpen();
    this.settingsOpen.set(willOpen);
    if (willOpen) {
      // Focus first interactive element inside surface after render
      try {
        if (typeof document !== 'undefined') {
          setTimeout(() => {
            const surface = document.getElementById('settings-surface');
            const first = surface?.querySelector<HTMLElement>('button:not([disabled])');
            first?.focus();
          }, 0);
        }
      } catch {
        // swallow
      }
    }
  }

  protected closeSettings(): void {
    this.settingsOpen.set(false);
    // Return focus to gear trigger per a11y
    try {
      if (typeof document !== 'undefined') {
        document.getElementById('settings-trigger')?.focus();
      }
    } catch {
      // swallow
    }
  }

  protected onSettingsKeydown(event: KeyboardEvent): void {
    if (!this.settingsOpen()) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeSettings();
      return;
    }
    if (event.key === 'Tab') {
      // Focus trap: wrap first ↔ last inside #settings-surface, handle outside focus
      try {
        const surface = typeof document !== 'undefined' ? document.getElementById('settings-surface') : null;
        if (!surface) return;
        const focusable = Array.from(
          surface.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ),
        ).filter((el) => !el.hasAttribute('inert') && el.getAttribute('aria-hidden') !== 'true');
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (!surface.contains(active as Node)) {
          event.preventDefault();
          first?.focus();
          return;
        }
        if (event.shiftKey) {
          if (active === first) {
            event.preventDefault();
            last?.focus();
          }
        } else {
          if (active === last) {
            event.preventDefault();
            first?.focus();
          }
        }
      } catch {
        // swallow
      }
    }
  }

  @HostListener('document:keydown', ['$event'])
  protected onDocumentKeydown(event: KeyboardEvent): void {
    if (!this.settingsOpen()) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeSettings();
    }
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (!this.settingsOpen()) return;
    try {
      if (typeof document === 'undefined') return;
      const surface = document.getElementById('settings-surface');
      const trigger = document.getElementById('settings-trigger');
      const target = event.target as Node | null;
      if (!surface || !trigger || !target) return;
      const isInsideSurface = surface.contains(target);
      const isTrigger = trigger.contains(target);
      if (!isInsideSurface && !isTrigger) {
        this.closeSettings();
      }
    } catch {
      // swallow
    }
  }

  protected toggleTerminal(): void {
    this.store.toggleTerminal();
  }

  protected onTerminalClick(): void {
    this.toggleTerminal();
  }

  protected retry(): void {
    if (!this.loader.pending()) {
      this.loader.load();
    }
  }
}