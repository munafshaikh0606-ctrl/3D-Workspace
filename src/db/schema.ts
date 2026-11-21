import { relations } from "drizzle-orm";
import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  uid: text("uid").notNull().unique(),
  email: text("email").notNull(),
  displayName: text("display_name"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  title: text("title").notNull(),
  mode: text("mode").notNull().default("chat"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id")
    .references(() => conversations.id, { onDelete: "cascade" })
    .notNull(),
  role: text("role").notNull(),
  text: text("text").notNull(),
  gesture: text("gesture"),
  source: text("source").notNull().default("text"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const customizerConfigs = pgTable("customizer_configs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull()
    .unique(),
  configJson: text("config_json").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const usersRelations = relations(users, ({ many, one }) => ({
  conversations: many(conversations),
  customizerConfig: one(customizerConfigs, {
    fields: [users.id],
    references: [customizerConfigs.userId],
  }),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  author: one(users, {
    fields: [conversations.userId],
    references: [users.id],
  }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
}));

export const customizerConfigsRelations = relations(customizerConfigs, ({ one }) => ({
  user: one(users, {
    fields: [customizerConfigs.userId],
    references: [users.id],
  }),
}));
