import { describe, it, expect } from 'vitest';

/**
 * Critical Path Tests
 * 
 * These tests verify the core user journeys work end-to-end.
 */

describe('Critical Path: Agent Status Dashboard', () => {
  it('should fetch and display agent activity data', async () => {
    const response = await fetch('http://localhost:3000/api/agents');
    expect(response.ok).toBe(true);
    
    const data = await response.json();
    expect(data).toHaveProperty('agents');
    expect(Array.isArray(data.agents)).toBe(true);
    
    // Verify agent structure
    if (data.agents.length > 0) {
      const agent = data.agents[0];
      expect(agent).toHaveProperty('id');
      expect(agent).toHaveProperty('name');
      expect(agent).toHaveProperty('status');
      expect(['online', 'offline']).toContain(agent.status);
    }
  });

  it('should fetch pipeline runs successfully', async () => {
    const response = await fetch('http://localhost:3000/api/pipeline/runs');
    expect(response.ok).toBe(true);
    
    const data = await response.json();
    expect(data).toHaveProperty('runs');
    expect(Array.isArray(data.runs)).toBe(true);
    
    // Verify run structure
    if (data.runs.length > 0) {
      const run = data.runs[0];
      expect(run).toHaveProperty('id');
      expect(run).toHaveProperty('status');
      expect(['success', 'failure', 'in_progress', 'cancelled', 'skipped']).toContain(run.status);
    }
  });

  it('should fetch alerts with stats', async () => {
    const response = await fetch('http://localhost:3000/api/alerts?includeStats=true');
    expect(response.ok).toBe(true);
    
    const data = await response.json();
    expect(data).toHaveProperty('alerts');
    expect(data).toHaveProperty('stats');
    
    // Verify stats structure
    expect(data.stats).toHaveProperty('total');
    expect(data.stats).toHaveProperty('active');
    expect(data.stats).toHaveProperty('acknowledged');
    expect(data.stats).toHaveProperty('resolved');
    
    // Stats should be non-negative
    expect(data.stats.total).toBeGreaterThanOrEqual(0);
    expect(data.stats.active).toBeGreaterThanOrEqual(0);
  });
});
