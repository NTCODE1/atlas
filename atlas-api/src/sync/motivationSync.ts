/**
 * DomainSync registrations for Motivation: the photo board
 * (src/motivation.ts's MotivationItem) and aspirational goals with optional
 * milestones (src/goals.ts's Goal/Milestone). Neither is locally pruned, so
 * every push here is a full replace. See ../sync.ts for the generic
 * push/pull/LWW mechanics these plug into.
 *
 * Image size: motivation photos are downscaled to a 640px-long-edge JPEG at
 * 0.8 quality before ever reaching localStorage (src/image.ts) — typically
 * tens of KB, base64-inflated to well under D1's 2MB row-size limit
 * (developers.cloudflare.com/d1/platform/limits). Bound as a query
 * parameter (not inlined into SQL text), so the separate 100KB *statement*
 * length limit doesn't apply to it either.
 */

import { field, type DomainSync } from "../sync.ts";

// --- Motivation items ---------------------------------------------------

interface MotivationItemRow {
  id: string;
  image_base64: string;
  caption: string;
  created_at: string;
}

export interface MotivationItemValue {
  id: string;
  imageBase64: string;
  caption: string;
  createdAt: string;
}

export const motivationItemsSync: DomainSync<MotivationItemValue[]> = {
  empty: [],
  apply(db, items) {
    const stmts: D1PreparedStatement[] = [db.prepare("DELETE FROM motivation_items")];
    for (const it of items) {
      stmts.push(
        db
          .prepare(
            "INSERT OR REPLACE INTO motivation_items (id, image_base64, caption, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
          )
          .bind(it.id, it.imageBase64, it.caption, it.createdAt, Date.now()),
      );
    }
    return stmts;
  },
  async read(db) {
    const { results } = await db
      .prepare("SELECT * FROM motivation_items ORDER BY created_at DESC")
      .all<MotivationItemRow>();
    return results.map((r) => ({ id: r.id, imageBase64: r.image_base64, caption: r.caption, createdAt: r.created_at }));
  },
};

// --- Goals (+ milestones for milestone-type goals) -----------------------

interface GoalRow {
  id: string;
  title: string;
  icon: string;
  type: string;
  current: number | null;
  target: number | null;
  unit: string | null;
  unit_position: string | null;
  link_finance_savings: number | null;
  deadline: string | null;
  created_at: string;
}

interface MilestoneRow {
  id: string;
  goal_id: string;
  label: string;
  done: number;
}

export interface MilestoneValue {
  id: string;
  label: string;
  done: boolean;
}

export interface GoalValue {
  id: string;
  title: string;
  icon: string;
  type: "milestone" | "numeric";
  milestones?: MilestoneValue[];
  current?: number;
  target?: number;
  unit?: string;
  unitPosition?: "prefix" | "suffix";
  linkFinanceSavings?: boolean;
  deadline?: string;
  createdAt: string;
}

export const goalsSync: DomainSync<GoalValue[]> = {
  empty: [],
  apply(db, goals) {
    // Children before parents (FK: goal_milestones -> goals).
    const stmts: D1PreparedStatement[] = [db.prepare("DELETE FROM goal_milestones"), db.prepare("DELETE FROM goals")];
    const now = Date.now();
    for (const g of goals) {
      stmts.push(
        db
          .prepare(
            "INSERT INTO goals (id, title, icon, type, current, target, unit, unit_position, link_finance_savings, deadline, created_at, updated_at) " +
              "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          )
          .bind(
            g.id,
            g.title,
            g.icon,
            g.type,
            g.current ?? null,
            g.target ?? null,
            g.unit ?? null,
            g.unitPosition ?? null,
            g.linkFinanceSavings == null ? null : g.linkFinanceSavings ? 1 : 0,
            g.deadline ?? null,
            g.createdAt,
            now,
          ),
      );
      (g.milestones ?? []).forEach((m, sortOrder) => {
        stmts.push(
          db
            .prepare(
              "INSERT INTO goal_milestones (id, goal_id, label, done, sort_order, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
            )
            .bind(m.id, g.id, m.label, m.done ? 1 : 0, sortOrder, now),
        );
      });
    }
    return stmts;
  },
  async read(db) {
    const [goalsResult, milestonesResult] = await Promise.all([
      db.prepare("SELECT * FROM goals ORDER BY created_at").all<GoalRow>(),
      db.prepare("SELECT * FROM goal_milestones ORDER BY goal_id, sort_order").all<MilestoneRow>(),
    ]);

    const milestonesByGoal = new Map<string, MilestoneValue[]>();
    for (const m of milestonesResult.results) {
      const list = milestonesByGoal.get(m.goal_id) ?? [];
      list.push({ id: m.id, label: m.label, done: m.done === 1 });
      milestonesByGoal.set(m.goal_id, list);
    }

    return goalsResult.results.map((r): GoalValue => {
      const milestones = milestonesByGoal.get(r.id);
      return {
        id: r.id,
        title: r.title,
        icon: r.icon,
        type: r.type as "milestone" | "numeric",
        ...(milestones && milestones.length > 0 ? { milestones } : {}),
        ...field("current", r.current),
        ...field("target", r.target),
        ...field("unit", r.unit),
        ...field("unitPosition", r.unit_position as "prefix" | "suffix" | null),
        ...field("linkFinanceSavings", r.link_finance_savings == null ? null : r.link_finance_savings === 1),
        ...field("deadline", r.deadline),
        createdAt: r.created_at,
      };
    });
  },
};

/** Registered under these exact names — must match the frontend's useSyncedStorage domain arguments. */
export const MOTIVATION_SYNC_REGISTRY: Record<string, DomainSync<unknown>> = {
  motivationItems: motivationItemsSync as DomainSync<unknown>,
  goals: goalsSync as DomainSync<unknown>,
};
