export const DEFAULT_TAB = 'health-dashboard' as const;

export type TabId =
  | 'health-dashboard'
  | 'terminal-console'
  | 'service-topology'
  | 'env-registry'
  | 'career-pods'
  | 'swagger-playground';

export interface TabConfig {
  id: TabId;
  label: string;
}

export const TABS: readonly TabConfig[] = [
  { id: 'health-dashboard', label: 'Health Dashboard' },
  //{ id: 'terminal-console', label: 'Terminal Console' },
 // { id: 'service-topology', label: 'Service Topology' },
  { id: 'env-registry', label: 'Env Registry' },
  { id: 'career-pods', label: 'Career Pods' },
  { id: 'swagger-playground', label: 'Swagger Playground' },
];
