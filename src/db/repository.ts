import { and, desc, eq } from "drizzle-orm";
import { db } from "./index.ts";
import { conversations, customizerConfigs, messages } from "./schema.ts";

export async function listUserConversations(userId: number) {
  try {
    return await db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.updatedAt));
  } catch (error) {
    console.error("Failed to list conversations:", error);
    throw new Error("Database query failed. Please try again later.", { cause: error });
  }
}

export async function createConversation(userId: number, title: string, mode = "chat") {
  try {
    const result = await db
      .insert(conversations)
      .values({
        userId,
        title,
        mode,
      })
      .returning();
    return result[0];
  } catch (error) {
    console.error("Failed to create conversation:", error);
    throw new Error("Database query failed. Please try again later.", { cause: error });
  }
}

export async function deleteUserConversation(userId: number, conversationId: number) {
  try {
    const deleted = await db
      .delete(conversations)
      .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)))
      .returning();
    return deleted[0] ?? null;
  } catch (error) {
    console.error("Failed to delete conversation:", error);
    throw new Error("Database query failed. Please try again later.", { cause: error });
  }
}

export async function getConversationMessages(userId: number, conversationId: number) {
  try {
    const conv = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)));

    if (!conv[0]) return null;

    const rows = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.id);

    return { conversation: conv[0], messages: rows };
  } catch (error) {
    console.error("Failed to fetch conversation messages:", error);
    throw new Error("Database query failed. Please try again later.", { cause: error });
  }
}

export async function appendConversationMessage(
  userId: number,
  conversationId: number,
  role: "user" | "model",
  text: string,
  gesture?: string,
  source = "text"
) {
  try {
    const conv = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.id, conversationId), eq(conversations.userId, userId)));

    if (!conv[0]) return null;

    const inserted = await db
      .insert(messages)
      .values({
        conversationId,
        role,
        text,
        gesture: gesture ?? null,
        source,
      })
      .returning();

    await db
      .update(conversations)
      .set({ updatedAt: new Date() })
      .where(eq(conversations.id, conversationId));

    return inserted[0];
  } catch (error) {
    console.error("Failed to append message:", error);
    throw new Error("Database query failed. Please try again later.", { cause: error });
  }
}

export async function getUserCustomizerConfig(userId: number) {
  try {
    const rows = await db
      .select()
      .from(customizerConfigs)
      .where(eq(customizerConfigs.userId, userId));
    return rows[0] ?? null;
  } catch (error) {
    console.error("Failed to get customizer config:", error);
    throw new Error("Database query failed. Please try again later.", { cause: error });
  }
}

export async function saveUserCustomizerConfig(userId: number, configJson: string) {
  try {
    const result = await db
      .insert(customizerConfigs)
      .values({
        userId,
        configJson,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: customizerConfigs.userId,
        set: {
          configJson,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result[0];
  } catch (error) {
    console.error("Failed to save customizer config:", error);
    throw new Error("Database query failed. Please try again later.", { cause: error });
  }
}
