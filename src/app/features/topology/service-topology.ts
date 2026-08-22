import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TopologyLink } from '../../core/data/portfolio-data';
import { ClusterStateService } from '../../core/state/cluster-state.service';

interface NodeLayoutSlot {
  readonly x: number;
  readonly y: number;
}

const NODE_WIDTH = 132;
const NODE_HEIGHT = 40;

const NODE_SLOTS: readonly NodeLayoutSlot[] = [
  { x: 320, y: 56 },
  { x: 112, y: 184 },
  { x: 528, y: 184 },
  { x: 320, y: 300 },
  { x: 168, y: 300 },
];

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-service-topology',
  templateUrl: './service-topology.html',
  styleUrl: './service-topology.css',
})
export class ServiceTopology {
  protected readonly store = inject(ClusterStateService);

  protected readonly nodes = this.store.topologyNodes;
  protected readonly links = this.store.topologyLinks;

  protected readonly layouts = computed(() => {
    const layout = new Map<string, NodeLayoutSlot>();
    this.nodes().forEach((node, index) => {
      const slot = NODE_SLOTS[index % NODE_SLOTS.length]!;
      layout.set(node.id, slot);
    });
    return layout;
  });

  protected selectNode(id: string): void {
    this.store.selectNode(id);
  }

  protected isNodeDegraded(id: string): boolean {
    return this.store.outageDegradedNodeIds().has(id);
  }

  protected isLinkDegraded(link: TopologyLink): boolean {
    const degraded = this.store.outageDegradedNodeIds();
    return degraded.has(link.source) && degraded.has(link.target);
  }

  protected x(id: string): number {
    return this.layouts().get(id)?.x ?? 0;
  }

  protected y(id: string): number {
    return this.layouts().get(id)?.y ?? 0;
  }

  protected rectX(id: string): number {
    return this.x(id) - NODE_WIDTH / 2;
  }

  protected rectY(id: string): number {
    return this.y(id) - NODE_HEIGHT / 2;
  }

  protected linkKey(link: TopologyLink): string {
    return `${link.source}->${link.target}`;
  }
}
