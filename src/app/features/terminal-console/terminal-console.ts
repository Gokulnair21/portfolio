import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterRenderEffect,
  inject,
  viewChild,
} from '@angular/core';
import { LogLevel } from '../../core/data/portfolio-data';
import { ClusterStateService } from '../../core/state/cluster-state.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-terminal-console',
  templateUrl: './terminal-console.html',
  styleUrl: './terminal-console.css',
})
export class TerminalConsole {
  protected readonly store = inject(ClusterStateService);

  private readonly viewport = viewChild.required<ElementRef<HTMLElement>>('viewport');

  constructor() {
    afterRenderEffect(() => {
      this.store.logs();
      const element = this.viewport().nativeElement;
      element.scrollTop = element.scrollHeight;
    });
  }

  protected levelClass(level: LogLevel): string {
    return `log-level-${level.toLowerCase()}`;
  }
}
