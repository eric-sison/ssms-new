import { db } from "@ssms/lib/drizzle";
import { aliasedTable, eq } from "drizzle-orm";
import { Hono } from "hono";
import { tickets } from "../db/schemas/tickets";
import { HTTPException } from "hono/http-exception";
import { zValidator } from "@hono/zod-validator";
import { TicketsSchema } from "../validations/ticketsSchemas";
import { user } from "../db/schemas/auth";
import { takeUniqueOrThrow } from "../utils/takeUniqueOrThrow";

export const ticketsHandler = new Hono()
  .get("/", async (c) => {
    try {
      const assignee = aliasedTable(user, "asignee");

      const stmt = db
        .select({
          id: tickets.id,
          requestedBy: user.name,
          requestedByAvatar: user.image,
          assignedTo: assignee.name,
          assignedToAvatar: assignee.image,
          details: tickets.details,
          status: tickets.status,
          createdAt: tickets.createdAt,
          updatedAt: tickets.updatedAt,
        })
        .from(tickets)
        .innerJoin(user, eq(user.id, tickets.requestorId))
        .leftJoin(assignee, eq(assignee.id, tickets.assignedId))
        .prepare("get_all_tickets");

      const res = await stmt.execute();

      return c.json(res);
    } catch (error) {
      console.error(error);
      throw new HTTPException(400, { message: "Something went wrong!", cause: error });
    }
  })
  .get("/:id", async (c) => {
    const ticketId = c.req.param("id");

    const stmt = db.select().from(tickets).where(eq(tickets.id, ticketId)).prepare("get_ticket_by_id");

    const res = await stmt.execute().then(takeUniqueOrThrow);

    return c.json(res);
  })
  .post("/", zValidator("form", TicketsSchema), async (c) => {
    try {
      const body = c.req.valid("form");

      const stmt = db
        .insert(tickets)
        .values(body)
        .returning({
          requestorId: tickets.requestorId,
          categoryId: tickets.categoryId,
          subCategoryId: tickets.subCategoryId,
          supportTypeId: tickets.supportTypeId,
          details: tickets.details,
          status: tickets.status,
          createdAt: tickets.createdAt,
          updatedAt: tickets.updatedAt,
        })
        .prepare("create_ticket");

      const res = await stmt.execute();

      return c.json(res[0]);
    } catch (error) {
      console.error(error);
      throw new HTTPException(400, { message: "Something went wrong!", cause: error });
    }
  })
  .patch("/:id", zValidator("json", TicketsSchema.partial()), async (c) => {
    try {
      const ticketId = c.req.param("id");
      const body = c.req.valid("json");

      const stmt = db
        .update(tickets)
        .set(body)
        .where(eq(tickets.id, ticketId))
        .returning({
          requestorId: tickets.requestorId,
          categoryId: tickets.categoryId,
          subCategoryId: tickets.subCategoryId,
          supportTypeId: tickets.supportTypeId,
          details: tickets.details,
          status: tickets.status,
          createdAt: tickets.createdAt,
          updatedAt: tickets.updatedAt,
        })
        .prepare("update_ticket");

      const res = await stmt.execute();

      return c.json(res[0]);
    } catch (error) {
      console.error(error);
      throw new HTTPException(400, { message: "Something went wrong!", cause: error });
    }
  })
  .delete("/:id", async (c) => {
    try {
      const ticketId = c.req.param("id");

      const stmt = db.delete(tickets).where(eq(tickets.id, ticketId)).prepare("delete_ticket");
      const res = await stmt.execute();

      return res.rowCount === 0
        ? c.json({ status: "No rows affected!" })
        : c.json({ status: "Successfully deleted!" });
    } catch (error) {
      console.error(error);
      throw new HTTPException(400, { message: "Something went wrong!", cause: error });
    }
  });
