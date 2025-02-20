import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { AddCategorySchema, AddMemberSchema, TeamAssignmentSchema } from "../validations/teamSchemas";
import { db } from "@ssms/lib/drizzle";
import { categoryAssignments, teamAssignments, teams } from "../db/schemas/teams";
import { eq, and, isNull } from "drizzle-orm";
import { user } from "../db/schemas/auth";
import { categories } from "../db/schemas/tickets";

export const teamsHandler = new Hono()
  .get("/", async (c) => {
    try {
      const stmt = db
        .select({
          id: teams.id,
          name: teams.name,
          createdAt: teams.createdAt,
          updatedAt: teams.updatedAt,
        })
        .from(teams)
        .prepare("get_all_teams");

      const res = await stmt.execute();

      return c.json(res);
    } catch (error) {
      console.error(error);
      throw new HTTPException(400, { message: "Something went wrong!", cause: error });
    }
  })
  .get("/info/:id", async (c) => {
    const teamId = c.req.param("id");

    try {
      const stmt = db
        .select({
          id: teams.id,
          name: teams.name,
        })
        .from(teams)
        .where(eq(teams.id, teamId))
        .prepare("get_team_by_id");

      const res = await stmt.execute();

      return c.json(res[0]);
    } catch (error) {
      console.error(error);
      throw new HTTPException(400, { message: "Something went wrong!", cause: error });
    }
  })
  .get("/team-assignments/:id", async (c) => {
    const teamId = c.req.param("id");

    try {
      const stmt = db
        .select({
          id: user.id,
          name: user.name,
          image: user.image,
        })
        .from(teamAssignments)
        .innerJoin(user, eq(user.id, teamAssignments.userId))
        .where(eq(teamAssignments.teamId, teamId))
        .prepare("get_assigned_users_by_team_id");

      const res = await stmt.execute();

      return c.json(res);
    } catch (error) {
      console.error(error);
      throw new HTTPException(400, { message: "Something went wrong!", cause: error });
    }
  })
  .get("/unassigned-users", async (c) => {
    try {
      const stmt = db
        .select({
          id: user.id,
          name: user.name,
          image: user.image,
        })
        .from(user)
        .leftJoin(teamAssignments, eq(user.id, teamAssignments.userId))
        .where(and(eq(user.role, "support"), isNull(teamAssignments.id)))
        .prepare("get_all_unassigned_users");

      const res = await stmt.execute();

      return c.json(res);
    } catch (error) {
      console.error(error);
      throw new HTTPException(400, { message: "Something went wrong!", cause: error });
    }
  })
  .get("/unassigned-categories", async (c) => {
    try {
      const stmt = db
        .select({
          id: categories.id,
          name: categories.name,
        })
        .from(categories)
        .leftJoin(categoryAssignments, eq(categories.id, categoryAssignments.categoryId))
        .where(isNull(categoryAssignments.id))
        .orderBy(categories.name)
        .prepare("get_all_unassigned_categories");

      const res = await stmt.execute();

      return c.json(res);
    } catch (error) {
      console.error(error);
      throw new HTTPException(400, { message: "Something went wrong!", cause: error });
    }
  })
  .get("/assigned-team-name/:id", async (c) => {
    const userId = c.req.param("id");

    try {
      const stmt = db
        .select({
          teamName: teams.name,
        })
        .from(teamAssignments)
        .innerJoin(teams, eq(teams.id, teamAssignments.teamId))
        .innerJoin(user, eq(user.id, teamAssignments.userId))
        .where(eq(user.id, userId))
        .prepare("get_assigned_team_name");

      const res = await stmt.execute();

      return c.json(res[0]);
    } catch (error) {
      console.error(error);
      throw new HTTPException(400, { message: "Something went wrong!", cause: error });
    }
  })
  .get("/assigned-categories/:id", async (c) => {
    const teamId = c.req.param("id");

    try {
      const stmt = db
        .select({
          name: categories.name,
        })
        .from(categoryAssignments)
        .innerJoin(categories, eq(categories.id, categoryAssignments.categoryId))
        .where(eq(categoryAssignments.teamId, teamId))
        .prepare("get_assigned_categories");

      const res = await stmt.execute();

      return c.json(res);
    } catch (error) {
      console.error(error);
      throw new HTTPException(400, { message: "Something went wrong!", cause: error });
    }
  })
  .post("/team-assignments", zValidator("form", TeamAssignmentSchema), async (c) => {
    const body = c.req.valid("form");

    try {
      const res = await db.transaction(async (tx) => {
        const newTeam = await tx
          .insert(teams)
          .values({ name: body.name })
          .returning({ id: teams.id, name: teams.name });

        body.users.map(async (id) => {
          return await tx
            .insert(teamAssignments)
            .values({ userId: id, teamId: newTeam[0].id })
            .returning({ userId: teamAssignments.userId });
        });

        body.categories.map(async (id) => {
          return await tx
            .insert(categoryAssignments)
            .values({ categoryId: id, teamId: newTeam[0].id })
            .returning({ id: categoryAssignments.id });
        });

        return newTeam[0];
      });

      const users = await db
        .select({
          name: user.name,
          image: user.image,
        })
        .from(teamAssignments)
        .where(eq(teamAssignments.teamId, res.id))
        .innerJoin(user, eq(user.id, teamAssignments.userId));

      return c.json({ team: res.name, users });
    } catch (error) {
      console.error(error);
      throw new HTTPException(400, { message: "Something went wrong!", cause: error });
    }
  })
  .post("/add-member/:id", zValidator("form", AddMemberSchema), async (c) => {
    const body = c.req.valid("form");
    const teamId = c.req.param("id");

    try {
      const res = await db.transaction(async (tx) => {
        const newMembers = body.users.map(async (user) => {
          return await tx
            .insert(teamAssignments)
            .values({ teamId, userId: user })
            .returning({ userId: teamAssignments.userId });
        });

        return newMembers[0];
      });

      return c.json(res);
    } catch (error) {
      console.error(error);
      throw new HTTPException(400, { message: "Something went wrong!", cause: error });
    }
  })
  .post("add-categories/:id", zValidator("form", AddCategorySchema), async (c) => {
    const body = c.req.valid("form");
    const teamId = c.req.param("id");

    try {
      const res = await db.transaction(async (tx) => {
        const newMembers = body.categories.map(async (category) => {
          return await tx
            .insert(categoryAssignments)
            .values({ teamId, categoryId: category })
            .returning({ id: teamAssignments.id });
        });

        return newMembers[0];
      });

      return c.json(res);
    } catch (error) {
      console.error(error);
      throw new HTTPException(400, { message: "Something went wrong!", cause: error });
    }
  });
