import portfolioDataJson from '../../../../public/portfolio-data.json';
import { parsePortfolioData } from './portfolio-data';

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

    for (const project of data!.projects) {
      expect(project.stack.length).toBeGreaterThan(0);
      expect(project.repoUrl).toMatch(/^https?:\/\//);
    }
  });

  it('should match the parsed value against the shipped sections', () => {
    const data = parsePortfolioData(portfolioDataJson)!;
    expect(data.projects).toEqual(
      portfolioDataJson.projects.map((p) => ({
        name: p.name,
        description: p.description,
        stack: p.stack,
        repoUrl: p.repoUrl,
      })),
    );
  });
});
