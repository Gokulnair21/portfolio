import portfolioDataJson from '../../../../public/portfolio-data.json';
import {
  MAX_TOPOLOGY_NODES,
  parsePortfolioDataDetailed,
  parsePortfolioData,
} from './portfolio-data';

describe('public/portfolio-data.json contract', () => {
  it('should be valid JSON satisfying an object root', () => {
    expect(portfolioDataJson).toBeTypeOf('object');
    expect(Array.isArray(portfolioDataJson)).toBe(false);
  });

  it('should satisfy the runtime content guards', () => {
    const data = parsePortfolioData(portfolioDataJson);
    expect(data).not.toBeNull();

    expect(data!.projects.length).toBeGreaterThan(0);
    expect(data!.experience.length).toBeGreaterThan(0);
    expect(typeof data!.contact.email).toBe('string');
    expect(data!.contact.email.length).toBeGreaterThan(0);
    expect(data!.envProperties.length).toBeGreaterThan(0);

    expect(typeof data!.health.liveness).toBe('string');
    expect(data!.health.liveness.length).toBeGreaterThan(0);
    expect(Number.isInteger(data!.health.brokerTotal)).toBe(true);
    expect(Number.isInteger(data!.health.brokerActive)).toBe(true);
    expect(typeof data!.health.errorRate).toBe('number');

    for (const project of data!.projects) {
      expect(project.stack.length).toBeGreaterThan(0);
    }
  });

  it('should match the parsed value against the shipped sections', () => {
    const data = parsePortfolioData(portfolioDataJson)!;
    expect(data.projects).toEqual(
      portfolioDataJson.projects.map((p) => ({
        name: p.name,
        description: p.description,
        stack: p.stack,
      })),
    );
  });

  it('should round-trip the shipped health section', () => {
    const data = parsePortfolioData(portfolioDataJson)!;
    expect(data.health).toEqual({
      liveness: portfolioDataJson.health.liveness,
      brokerTotal: portfolioDataJson.health.brokerTotal,
      brokerActive: portfolioDataJson.health.brokerActive,
      errorRate: portfolioDataJson.health.errorRate,
    });
  });

  describe('topology section', () => {
    it('should round-trip the shipped topology nodes and links', () => {
      const data = parsePortfolioData(portfolioDataJson)!;

      expect(data.topology.nodes.map((node) => node.id)).toEqual([
        'api-gateway',
        'auth-service',
        'notify-service',
        'payment-service',
        'postgresql-db',
      ]);
      expect(data.topology.links).toEqual(
        portfolioDataJson.topology.links.map((link) => ({
          source: link.source,
          target: link.target,
        })),
      );
    });

    it('should include the payment-service to postgresql-db link', () => {
      const data = parsePortfolioData(portfolioDataJson)!;

      expect(data.topology.links).toContainEqual({
        source: 'payment-service',
        target: 'postgresql-db',
      });
    });

    function parseWithTopology(topology: unknown) {
      return parsePortfolioDataDetailed({ ...portfolioDataJson, topology });
    }

    it('should fail when the topology section is absent', () => {
      const payload: Record<string, unknown> = { ...portfolioDataJson };
      delete payload['topology'];

      const result = parsePortfolioDataDetailed(payload);

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toContain('topology');
    });

    it('should fail when a topology node is malformed', () => {
      const topology = {
        nodes: [
          {
            id: 'api-gateway',
            label: 'api-gateway',
            description: 'Gateway.',
            techStack: ['Java'],
            metrics: [{ label: 'RPS', value: 10 }],
          },
        ],
        links: [],
      };

      const result = parseWithTopology(topology);

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toContain('metrics');
    });

    it('should fail when a topology link is missing fields', () => {
      const topology = {
        nodes: [
          {
            id: 'api-gateway',
            label: 'api-gateway',
            description: 'Gateway.',
            techStack: [],
            metrics: [],
          },
        ],
        links: [{ source: 'api-gateway' }],
      };

      const result = parseWithTopology(topology);

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toContain('topology.links[0]');
    });

    it('should fail when a topology link references an unknown node id', () => {
      const topology = {
        nodes: [
          {
            id: 'api-gateway',
            label: 'api-gateway',
            description: 'Gateway.',
            techStack: [],
            metrics: [],
          },
        ],
        links: [{ source: 'api-gateway', target: 'ghost-node' }],
      };

      const result = parseWithTopology(topology);

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toContain("unknown node id 'ghost-node'");
    });

    it('should fail when two topology nodes share the same id', () => {
      const node = {
        id: 'api-gateway',
        label: 'api-gateway',
        description: 'Gateway.',
        techStack: [],
        metrics: [],
      };
      const topology = { nodes: [node, { ...node }], links: [] };

      const result = parseWithTopology(topology);

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toContain("duplicate node id 'api-gateway'");
    });

    it('should fail when a topology link references its own source node', () => {
      const topology = {
        nodes: [
          {
            id: 'api-gateway',
            label: 'api-gateway',
            description: 'Gateway.',
            techStack: [],
            metrics: [],
          },
        ],
        links: [{ source: 'api-gateway', target: 'api-gateway' }],
      };

      const result = parseWithTopology(topology);

      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toContain("self-referencing link 'api-gateway'");
    });

    it('should fail when the topology catalog exceeds the layout-supported node maximum', () => {
      function makeNode(id: string) {
        return {
          id,
          label: id,
          description: `${id} description.`,
          techStack: [],
          metrics: [],
        };
      }
      const ids = Array.from({ length: MAX_TOPOLOGY_NODES + 1 }, (_, i) => `node-${i}`);
      const topology = { nodes: ids.map(makeNode), links: [] };

      const result = parseWithTopology(topology);

      expect(result.ok).toBe(false);
      if (!result.ok)
        expect(result.reason).toContain(`expected at most ${MAX_TOPOLOGY_NODES} entries`);
    });
  });
});
