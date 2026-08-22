/**
 * Canonical content contracts for the portfolio (AD-11).
 *
 * These interfaces describe the shape of `public/portfolio-data.json`.
 * Because TypeScript types are erased at compile time, the matching
 * runtime guards below validate the parsed JSON before hydration.
 */

export interface ProjectEntry {
  name: string;
  description: string;
  stack: string[];
  repoUrl: string;
}

export interface ExperienceEntry {
  company: string;
  role: string;
  period: string;
  highlights: string[];
}

export interface ContactInfo {
  email: string;
  github: string;
  linkedin: string;
}

export interface EnvProperty {
  key: string;
  value: string;
}

export interface TopologyMetric {
  label: string;
  value: string;
}

export interface TopologyNode {
  id: string;
  label: string;
  description: string;
  techStack: string[];
  metrics: TopologyMetric[];
}

export interface TopologyLink {
  source: string;
  target: string;
}

export interface TopologySection {
  nodes: TopologyNode[];
  links: TopologyLink[];
}

export interface HealthConfig {
  liveness: string;
  brokerTotal: number;
  brokerActive: number;
  errorRate: number;
}

export interface PortfolioData {
  projects: ProjectEntry[];
  experience: ExperienceEntry[];
  topology: TopologySection;
  contact: ContactInfo;
  envProperties: EnvProperty[];
  health: HealthConfig;
}

export type ClusterStatus = 'UP' | 'DEGRADED' | 'HALF-OPEN';

export type LogLevel = 'INFO' | 'WARN' | 'ERROR';

export interface LogEntry {
  timestamp: string;
  source: string;
  level: LogLevel;
  message: string;
}

export type ParseResult<T> =
  { readonly ok: true; readonly value: T } | { readonly ok: false; readonly reason: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isString);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return isFiniteNumber(value) && Number.isInteger(value) && value >= 0;
}

function fail(section: string, detail: string): { ok: false; reason: string } {
  return { ok: false, reason: `${section}: ${detail}` };
}

function parseProjectEntry(value: unknown): ParseResult<ProjectEntry> {
  if (!isRecord(value)) return fail('projects[]', 'entry is not an object');

  const { name, description, stack, repoUrl } = value;
  if (!isString(name)) return fail('projects[].name', 'expected string');
  if (!isString(description)) return fail('projects[].description', 'expected string');
  if (!isStringArray(stack)) return fail('projects[].stack', 'expected string array');
  if (!isString(repoUrl)) return fail('projects[].repoUrl', 'expected string');
  return { ok: true, value: { name, description, stack, repoUrl } };
}

function parseExperienceEntry(value: unknown): ParseResult<ExperienceEntry> {
  if (!isRecord(value)) return fail('experience[]', 'entry is not an object');

  const { company, role, period, highlights } = value;
  if (!isString(company)) return fail('experience[].company', 'expected string');
  if (!isString(role)) return fail('experience[].role', 'expected string');
  if (!isString(period)) return fail('experience[].period', 'expected string');
  if (!isStringArray(highlights)) return fail('experience[].highlights', 'expected string array');
  return { ok: true, value: { company, role, period, highlights } };
}

function parseContactInfo(value: unknown): ParseResult<ContactInfo> {
  if (!isRecord(value)) return fail('contact', 'not an object');

  const { email, github, linkedin } = value;
  if (!isString(email)) return fail('contact.email', 'expected string');
  if (!isString(github)) return fail('contact.github', 'expected string');
  if (!isString(linkedin)) return fail('contact.linkedin', 'expected string');
  return { ok: true, value: { email, github, linkedin } };
}

function parseEnvProperty(value: unknown): ParseResult<EnvProperty> {
  if (!isRecord(value)) return fail('envProperties[]', 'entry is not an object');

  const { key, value: propertyValue } = value;
  if (!isString(key)) return fail('envProperties[].key', 'expected string');
  if (!isString(propertyValue)) return fail('envProperties[].value', 'expected string');
  return { ok: true, value: { key, value: propertyValue } };
}

function parseTopologyMetric(value: unknown): ParseResult<TopologyMetric> {
  if (!isRecord(value)) return fail('topology.nodes[].metrics[]', 'entry is not an object');

  const { label, value: metricValue } = value;
  if (!isString(label)) return fail('topology.nodes[].metrics[].label', 'expected string');
  if (!isString(metricValue)) return fail('topology.nodes[].metrics[].value', 'expected string');
  return { ok: true, value: { label, value: metricValue } };
}

function parseTopologyNode(value: unknown): ParseResult<TopologyNode> {
  if (!isRecord(value)) return fail('topology.nodes[]', 'entry is not an object');

  const { id, label, description, techStack, metrics } = value;
  if (!isString(id) || id.length === 0) return fail('topology.nodes[].id', 'expected non-empty string');
  if (!isString(label) || label.length === 0)
    return fail('topology.nodes[].label', 'expected non-empty string');
  if (!isString(description)) return fail('topology.nodes[].description', 'expected string');
  if (!isStringArray(techStack)) return fail('topology.nodes[].techStack', 'expected string array');

  const parsedMetrics = parseEntries(metrics, 'topology.nodes[].metrics', parseTopologyMetric);
  if (!parsedMetrics.ok) return parsedMetrics;

  return {
    ok: true,
    value: { id, label, description, techStack, metrics: parsedMetrics.value },
  };
}

function parseTopologyLink(value: unknown): ParseResult<TopologyLink> {
  if (!isRecord(value)) return fail('topology.links[]', 'entry is not an object');

  const { source, target } = value;
  if (!isString(source) || source.length === 0)
    return fail('topology.links[].source', 'expected non-empty string');
  if (!isString(target) || target.length === 0)
    return fail('topology.links[].target', 'expected non-empty string');
  return { ok: true, value: { source, target } };
}

function parseTopologySection(value: unknown): ParseResult<TopologySection> {
  if (!isRecord(value)) return fail('topology', 'not an object');

  const nodes = parseEntries(value['nodes'], 'topology.nodes', parseTopologyNode);
  if (!nodes.ok) return nodes;

  const links = parseEntries(value['links'], 'topology.links', parseTopologyLink);
  if (!links.ok) return links;

  const nodeIds = new Set(nodes.value.map((node) => node.id));
  for (let index = 0; index < links.value.length; index++) {
    const link = links.value[index];
    if (!nodeIds.has(link.source))
      return fail(`topology.links[${index}].source`, `unknown node id '${link.source}'`);
    if (!nodeIds.has(link.target))
      return fail(`topology.links[${index}].target`, `unknown node id '${link.target}'`);
  }

  return { ok: true, value: { nodes: nodes.value, links: links.value } };
}

function parseHealthConfig(value: unknown): ParseResult<HealthConfig> {
  if (!isRecord(value)) return fail('health', 'not an object');

  const { liveness, brokerTotal, brokerActive, errorRate } = value;
  if (!isString(liveness) || liveness.length === 0)
    return fail('health.liveness', 'expected non-empty string');
  if (!isNonNegativeInteger(brokerTotal))
    return fail('health.brokerTotal', 'expected non-negative integer');
  if (!isNonNegativeInteger(brokerActive))
    return fail('health.brokerActive', 'expected non-negative integer');
  if (!isFiniteNumber(errorRate) || errorRate < 0)
    return fail('health.errorRate', 'expected finite non-negative number');

  if (brokerActive > brokerTotal)
    return fail('health.brokerActive', 'cannot exceed brokerTotal');

  return { ok: true, value: { liveness, brokerTotal, brokerActive, errorRate } };
}

function parseEntries<T>(
  values: unknown,
  section: string,
  parse: (entry: unknown) => ParseResult<T>,
): ParseResult<T[]> {
  if (!Array.isArray(values)) return fail(section, 'expected array');

  const entries: T[] = [];
  for (let index = 0; index < values.length; index++) {
    const result = parse(values[index]);
    if (!result.ok) return fail(`${section}[${index}]`, result.reason);
    entries.push(result.value);
  }
  return { ok: true, value: entries };
}

export function parsePortfolioDataDetailed(value: unknown): ParseResult<PortfolioData> {
  if (!isRecord(value)) return fail('root', 'not a JSON object');

  const projects = parseEntries(value['projects'], 'projects', parseProjectEntry);
  if (!projects.ok) return projects;

  const experience = parseEntries(value['experience'], 'experience', parseExperienceEntry);
  if (!experience.ok) return experience;

  const contact = parseContactInfo(value['contact']);
  if (!contact.ok) return contact;

  const topology = parseTopologySection(value['topology']);
  if (!topology.ok) return topology;

  const envProperties = parseEntries(value['envProperties'], 'envProperties', parseEnvProperty);
  if (!envProperties.ok) return envProperties;

  const health = parseHealthConfig(value['health']);
  if (!health.ok) return health;

  return {
    ok: true,
    value: {
      projects: projects.value,
      experience: experience.value,
      topology: topology.value,
      contact: contact.value,
      envProperties: envProperties.value,
      health: health.value,
    },
  };
}

export function parsePortfolioData(value: unknown): PortfolioData | null {
  const result = parsePortfolioDataDetailed(value);
  return result.ok ? result.value : null;
}
