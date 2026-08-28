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
    expect(data!.contact.email).toBe('gokul.nairmurali@gmail.com');
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

  it('should pin the shipped experience entry to the real CV values', () => {
    const data = parsePortfolioData(portfolioDataJson)!;

    expect(data.experience.length).toBe(1);
    expect(data.experience[0]!.company).toBe('Neosoft Technologies');
    expect(data.experience[0]!.role).toBe('Associate Team Lead — Java Backend Engineer');
    expect(data.experience[0]!.period).toBe('Jun 2021 — Present');
    expect(data.experience[0]!.highlights.length).toBe(5);
  });

  it('should ship zero placeholder strings in rendered content', () => {
    const serialized = JSON.stringify(portfolioDataJson).toLowerCase();

    const placeholders = [
      'example.com',
      'your-handle',
      'example corp',
      'cluster-control',
      'ledger-stream',
      'probe-mesh',
    ];
    for (const placeholder of placeholders) {
      expect(serialized).not.toContain(placeholder);
    }
  });

  it('should match the parsed value against the shipped sections', () => {
    const data = parsePortfolioData(portfolioDataJson)!;
    // Projects may include optional lensDescription; compare base fields
    expect(data.projects.map((p) => ({ name: p.name, description: p.description, stack: p.stack }))).toEqual(
      portfolioDataJson.projects.map((p) => ({
        name: p.name,
        description: p.description,
        stack: p.stack,
      })),
    );
    // If lens variants present, they should round-trip
    for (let i = 0; i < data.projects.length; i++) {
      const expected = (portfolioDataJson.projects[i] as unknown as { lensDescription?: unknown }).lensDescription;
      if (expected !== undefined) {
        expect(data.projects[i].lensDescription).toEqual(expected);
      }
    }
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
        'bff-gateway',
        'onboarding-service',
        'payment-service',
        'deposit-service',
        'core-bank-db',
      ]);
      expect(data.topology.links).toEqual(
        portfolioDataJson.topology.links.map((link) => ({
          source: link.source,
          target: link.target,
        })),
      );
    });

    it('should include the payment-service to core-bank-db link', () => {
      const data = parsePortfolioData(portfolioDataJson)!;

      expect(data.topology.links).toContainEqual({
        source: 'payment-service',
        target: 'core-bank-db',
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

  describe('lens variants (additive, optional)', () => {
    it('should accept JSON without lens variants (fallback)', () => {
      const withoutLens = JSON.parse(JSON.stringify(portfolioDataJson));
      // Strip lens fields if present
      delete (withoutLens as Record<string, unknown>)['display'];
      for (const n of withoutLens.topology.nodes) delete n.lensDescription;
      delete withoutLens.experience[0].highlightsByLens;
      for (const p of withoutLens.projects) delete p.lensDescription;
      const result = parsePortfolioDataDetailed(withoutLens);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.topology.nodes[0].lensDescription).toBeUndefined();
        expect(result.value.experience[0].highlightsByLens).toBeUndefined();
      }
    });

    it('should round-trip lens variants when present', () => {
      const data = parsePortfolioData(portfolioDataJson)!;
      expect(data.topology.nodes[0].lensDescription?.recruiter).toBeDefined();
      expect(data.topology.nodes[0].lensDescription?.engineer).toBeDefined();
      expect(data.experience[0].highlightsByLens?.recruiter?.length).toBeGreaterThan(0);
      expect(data.experience[0].highlightsByLens?.engineer?.length).toBeGreaterThan(0);
      expect(data.display?.profileBioByLens?.recruiter).toBeDefined();
    });

    it('should fail when lens variant has wrong type', () => {
      const bad = JSON.parse(JSON.stringify(portfolioDataJson));
      bad.topology.nodes[0].lensDescription = { recruiter: 123 };
      const result = parsePortfolioDataDetailed(bad);
      expect(result.ok).toBe(false);
    });
  });
});
