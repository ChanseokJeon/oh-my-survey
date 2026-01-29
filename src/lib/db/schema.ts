import { pgTable, text, timestamp, uuid, varchar, integer, jsonb, boolean, pgEnum, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============ ENUMS ============
export const surveyStatusEnum = pgEnum('survey_status', ['draft', 'published', 'closed']);
export const surveyThemeEnum = pgEnum('survey_theme', ['light', 'dark', 'minimal']);
export const questionTypeEnum = pgEnum('question_type', [
  'short_text',
  'long_text',
  'multiple_choice',
  'yes_no',
  'rating'
]);

// ============ NEXTAUTH TABLES ============
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }),
  image: text('image'),
  emailVerified: timestamp('email_verified', { mode: 'date' }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

export const accounts = pgTable('accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 255 }).notNull(),
  provider: varchar('provider', { length: 255 }).notNull(),
  providerAccountId: varchar('provider_account_id', { length: 255 }).notNull(),
  refresh_token: text('refresh_token'),
  access_token: text('access_token'),
  expires_at: integer('expires_at'),
  token_type: varchar('token_type', { length: 255 }),
  scope: varchar('scope', { length: 255 }),
  id_token: text('id_token'),
  session_state: varchar('session_state', { length: 255 }),
}, (table) => ({
  providerProviderAccountIdIdx: uniqueIndex('provider_provider_account_id_idx').on(table.provider, table.providerAccountId),
}));

export const sessions = pgTable('sessions', {
  sessionToken: varchar('session_token', { length: 255 }).notNull().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
});

export const verificationTokens = pgTable('verification_tokens', {
  identifier: varchar('identifier', { length: 255 }).notNull(),
  token: varchar('token', { length: 255 }).notNull(),
  expires: timestamp('expires', { mode: 'date' }).notNull(),
}, (table) => ({
  tokenIdx: uniqueIndex('verification_token_idx').on(table.identifier, table.token),
}));

// ============ APP TABLES ============
export const surveys = pgTable('surveys', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 200 }).notNull(),
  slug: varchar('slug', { length: 250 }).notNull().unique(),
  status: surveyStatusEnum('status').default('draft').notNull(),
  theme: surveyThemeEnum('theme').default('light').notNull(),
  logoBase64: text('logo_base64'),
  sheetsConfig: jsonb('sheets_config').$type<{
    spreadsheetId: string;
    sheetName: string;
  } | null>(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

export const questions = pgTable('questions', {
  id: uuid('id').defaultRandom().primaryKey(),
  surveyId: uuid('survey_id').notNull().references(() => surveys.id, { onDelete: 'cascade' }),
  type: questionTypeEnum('type').notNull(),
  title: varchar('title', { length: 500 }).notNull(),
  options: jsonb('options').$type<string[] | null>(),
  required: boolean('required').default(false).notNull(),
  order: integer('order').notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).defaultNow().notNull(),
});

export const responses = pgTable('responses', {
  id: uuid('id').defaultRandom().primaryKey(),
  surveyId: uuid('survey_id').notNull().references(() => surveys.id, { onDelete: 'cascade' }),
  answersJson: jsonb('answers_json').$type<Record<string, string | string[] | number>>().notNull(),
  completedAt: timestamp('completed_at', { mode: 'date' }).defaultNow().notNull(),
  ipAddress: varchar('ip_address', { length: 45 }),
});

// ============ RELATIONS ============
export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  surveys: many(surveys),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const surveysRelations = relations(surveys, ({ one, many }) => ({
  user: one(users, {
    fields: [surveys.userId],
    references: [users.id],
  }),
  questions: many(questions),
  responses: many(responses),
}));

export const questionsRelations = relations(questions, ({ one }) => ({
  survey: one(surveys, {
    fields: [questions.surveyId],
    references: [surveys.id],
  }),
}));

export const responsesRelations = relations(responses, ({ one }) => ({
  survey: one(surveys, {
    fields: [responses.surveyId],
    references: [surveys.id],
  }),
}));

// ============ TYPE EXPORTS ============
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Survey = typeof surveys.$inferSelect;
export type NewSurvey = typeof surveys.$inferInsert;
export type Question = typeof questions.$inferSelect;
export type NewQuestion = typeof questions.$inferInsert;
export type Response = typeof responses.$inferSelect;
export type NewResponse = typeof responses.$inferInsert;

export type SurveyStatus = 'draft' | 'published' | 'closed';
export type SurveyTheme = 'light' | 'dark' | 'minimal';
export type QuestionType = 'short_text' | 'long_text' | 'multiple_choice' | 'yes_no' | 'rating';
