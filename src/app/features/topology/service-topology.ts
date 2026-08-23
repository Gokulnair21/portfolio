import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TopologyLink } from '../../core/data/portfolio-data';
import { ClusterStateService } from '../../core/state/cluster-state.service';

interface NodeLayoutSlot {
  readonly x: number;
  readonly y: number;
}

const NODE_WIDTH = 180;
const NODE_HEIGHT = 80;

const NODE_SLOTS: readonly NodeLayoutSlot[] = [
  { x: 600, y: 120 },    // bff-gateway (center top)
  { x: 200, y: 320 },    // onboarding-service (left middle)
  { x: 1000, y: 320 },   // payment-service (right middle)
  { x: 600, y: 520 },    // deposit-service (center bottom)
  { x: 350, y: 520 },    // core-bank-db (left bottom)
];

const LINK_PATHS: Record<string, string> = {
  'bff-gateway->onboarding-service': 'M 600,160 Q 400,160 290,280',
  'bff-gateway->payment-service': 'M 600,160 Q 800,160 910,280',
  'bff-gateway->deposit-service': 'M 600,160 L 600,480',
  'payment-service->core-bank-db': 'M 910,360 Q 910,440 600,480 L 440,480',
  'deposit-service->core-bank-db': 'M 600,560 L 440,480',
};

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
  protected readonly nodeWidth = NODE_WIDTH;
  protected readonly nodeHeight = NODE_HEIGHT;

  protected readonly layouts = computed(() => {
    const layout = new Map<string, NodeLayoutSlot>();
    this.nodes().forEach((node, index) => {
      const slot = NODE_SLOTS[index % NODE_SLOTS.length]!;
      layout.set(node.id, slot);
    });
    return layout;
  });

  protected selectNode(id: string | null): void {
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

  protected linkKey(link: TopologyLink): string {
    return `${link.source}->${link.target}`;
  }

  protected linkPath(link: TopologyLink): string {
    const key = this.linkKey(link);
    return LINK_PATHS[key] ?? `M ${this.x(link.source)},${this.y(link.source)} L ${this.x(link.target)},${this.y(link.target)}`;
  }

  protected getNodeIcon(node: { id: string; label: string; techStack: string[] }): string {
    if (node.id.includes('gateway')) return 'hub';
    if (node.id.includes('auth')) return 'security';
    if (node.id.includes('payment')) return 'payments';
    if (node.id.includes('notification')) return 'notifications';
    if (node.id.includes('db') || node.id.includes('database')) return 'database';
    if (node.id.includes('deposit')) return 'account_balance';
    if (node.id.includes('onboarding')) return 'person_add';
    return 'dns';
  }

  protected getNodeIconType(node: { id: string; techStack: string[] }): string {
    if (this.isNodeDegraded(node.id)) return 'error';
    if (node.techStack.some((t) => t.includes('Gateway') || t.includes('Cloud'))) return 'primary';
    if (node.techStack.some((t) => t.includes('Drools') || t.includes('OAuth'))) return 'secondary';
    return 'primary';
  }

  protected getNodeType(node: { techStack: string[] }): string {
    if (node.techStack.includes('Spring Cloud Gateway')) return 'Spring Cloud Gateway';
    if (node.techStack.includes('Drools')) return 'Drools BRMS';
    if (node.techStack.includes('Kafka') && node.techStack.includes('mTLS')) return 'Spring Boot Web';
    if (node.techStack.includes('Hibernate')) return 'Spring Boot JPA';
    if (node.techStack.includes('MySQL') || node.techStack.includes('Replication')) return 'PostgreSQL';
    return node.techStack[0] ?? 'Service';
  }

  protected getNodeStatusClass(node: { id: string }): string {
    return this.isNodeDegraded(node.id) ? 'error' : 'primary';
  }

  protected getNodeStatusText(node: { id: string }): string {
    return this.isNodeDegraded(node.id) ? 'DEGRADED' : 'UP';
  }

  protected getSidebarStatusClass(node: { id: string }): string {
    return this.isNodeDegraded(node.id) ? 'error' : 'primary';
  }

  protected getSidebarStatusText(node: { id: string }): string {
    return this.isNodeDegraded(node.id) ? 'DEGRADED' : 'UP';
  }

  protected getNodeId(node: { id: string }): string {
    const idMap: Record<string, string> = {
      'bff-gateway': 'svc-gw-89a2b',
      'onboarding-service': 'svc-onb-3c4d5',
      'payment-service': 'svc-pay-7e8f9',
      'deposit-service': 'svc-dep-1a2b3',
      'core-bank-db': 'db-core-4c5d6',
    };
    return idMap[node.id] ?? 'unknown';
  }

  protected isClickableMetric(metric: { label: string; value: string }): boolean {
    return metric.label === 'Error Rate';
  }

  protected isErrorRateMetric(metric: { label: string }): boolean {
    return metric.label.toLowerCase().includes('error');
  }

  protected onNodeKeydown(event: KeyboardEvent, nodeId: string): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.selectNode(nodeId);
    }
  }

  protected onZoomIn(): void {
    console.log('Zoom in');
  }

  protected onZoomOut(): void {
    console.log('Zoom out');
  }

  protected onFitScreen(): void {
    console.log('Fit to screen');
  }

  protected onViewLogs(nodeId: string): void {
    console.log('View logs for', nodeId);
  }
}