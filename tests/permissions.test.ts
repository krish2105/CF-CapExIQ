import { describe, it, expect } from 'vitest';
import {
  can,
  canAny,
  canAll,
  ALL_ROLES,
  PERMISSIONS,
  ROLE_DEFINITIONS,
  permissionCount,
  roleLabel,
} from '../src/lib/auth/permissions';
import { NAV_SECTIONS, ALL_SEGMENTS, sectionForPath } from '../src/lib/navigation/taxonomy';

describe('RBAC permission matrix', () => {
  it('defines every role in the ExecutiveRole union', () => {
    expect(ALL_ROLES).toEqual(
      expect.arrayContaining(['CEO', 'CFO', 'COO', 'CTO', 'Capital Committee', 'Analyst'])
    );
    expect(ALL_ROLES).toHaveLength(6);
  });

  it('only grants permissions that exist in the PERMISSIONS list', () => {
    for (const role of ALL_ROLES) {
      for (const p of Array.from(ROLE_DEFINITIONS[role].permissions)) {
        expect(PERMISSIONS).toContain(p);
      }
    }
  });

  it('gives every role the headline position', () => {
    for (const role of ALL_ROLES) {
      expect(can(role, 'metrics.headline')).toBe(true);
    }
  });

  it('restricts write access to the model to CFO and Analyst', () => {
    const writers = ALL_ROLES.filter((r) => can(r, 'assumptions.edit'));
    expect(writers.sort()).toEqual(['Analyst', 'CFO']);
  });

  it('restricts signing authority to CEO, CFO and Capital Committee', () => {
    const signers = ALL_ROLES.filter((r) => can(r, 'approval.sign'));
    expect(signers.sort()).toEqual(['CEO', 'CFO', 'Capital Committee']);
  });

  it('withholds analyst-grade metrics from CEO, COO and CTO', () => {
    expect(can('CEO', 'metrics.advanced')).toBe(false);
    expect(can('COO', 'metrics.advanced')).toBe(false);
    expect(can('CTO', 'metrics.advanced')).toBe(false);
    expect(can('CFO', 'metrics.advanced')).toBe(true);
    expect(can('Analyst', 'metrics.advanced')).toBe(true);
    expect(can('Capital Committee', 'metrics.advanced')).toBe(true);
  });

  it('denies the Analyst signing authority and board materials', () => {
    // The deepest data access must not imply governance authority.
    expect(can('Analyst', 'approval.sign')).toBe(false);
    expect(can('Analyst', 'board.materials')).toBe(false);
    expect(can('Analyst', 'financials.schedule')).toBe(true);
  });

  it('treats an empty requirement list as unrestricted in canAny', () => {
    for (const role of ALL_ROLES) expect(canAny(role, [])).toBe(true);
  });

  it('canAll requires every listed permission', () => {
    expect(canAll('CFO', ['metrics.advanced', 'financials.schedule'])).toBe(true);
    expect(canAll('CEO', ['metrics.headline', 'financials.schedule'])).toBe(false);
  });

  it('never returns true for an unknown permission', () => {
    // @ts-expect-error — deliberately probing an out-of-union value
    expect(can('CFO', 'not.a.real.permission')).toBe(false);
  });

  it('gives no role every permission (no implicit superuser)', () => {
    for (const role of ALL_ROLES) {
      expect(permissionCount(role)).toBeLessThan(PERMISSIONS.length);
    }
  });

  it('labels every role', () => {
    for (const role of ALL_ROLES) expect(roleLabel(role).length).toBeGreaterThan(0);
  });
});

describe('navigation taxonomy', () => {
  it('collapses the app to five primary sections', () => {
    expect(NAV_SECTIONS).toHaveLength(5);
  });

  it('has no duplicate routes across sections', () => {
    const hrefs = ALL_SEGMENTS.map((s) => s.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it('only references permissions that exist', () => {
    for (const seg of ALL_SEGMENTS) {
      for (const p of seg.permissions) expect(PERMISSIONS).toContain(p);
    }
  });

  it('resolves a section for every registered route', () => {
    for (const seg of ALL_SEGMENTS) {
      expect(sectionForPath(seg.href), `no section for ${seg.href}`).toBeDefined();
    }
  });

  it('does not let "/" swallow other routes', () => {
    expect(sectionForPath('/')?.id).toBe('decision');
    expect(sectionForPath('/portfolio')?.id).toBe('portfolio');
    expect(sectionForPath('/monte-carlo')?.id).toBe('risk');
  });

  it('leaves every role at least one reachable section', () => {
    for (const role of ALL_ROLES) {
      const reachable = NAV_SECTIONS.filter((s) =>
        s.segments.some((seg) => canAny(role, seg.permissions))
      );
      expect(reachable.length, `${role} has no reachable section`).toBeGreaterThan(0);
    }
  });

  it('gives the most restricted lens a usable surface', () => {
    // CTO is the narrowest lens; it should still reach real work, not a
    // single orphan page.
    const visible = ALL_SEGMENTS.filter((s) => canAny('CTO', s.permissions));
    expect(visible.length).toBeGreaterThanOrEqual(5);
  });
});
