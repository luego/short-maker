import { sqliteTable, text, integer, timestamp } from 'drizzle-orm/sqlite-core'

// Placeholder schema – will be filled later in Phase 2 tasks
export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  name: text('name'),
  createdAt: timestamp('created_at').defaultNow(),
})
