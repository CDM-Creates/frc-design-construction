import {
  existsSync,
  readFileSync,
  readdirSync,
  unlinkSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";

const workspace = process.cwd();
const migrationDirectory = join(workspace, "drizzle");
const databasePath = join(
  tmpdir(),
  `frc-migration-verification-${randomUUID()}.sqlite`,
);
const migrationFiles = readdirSync(migrationDirectory)
  .filter((name) => /^\d{4}_.+\.sql$/.test(name))
  .sort();

if (migrationFiles.length === 0) {
  throw new Error("No numbered Drizzle migrations were found.");
}

let database;
try {
  database = new DatabaseSync(databasePath);
  database.exec("PRAGMA foreign_keys = ON");
  for (const migrationFile of migrationFiles) {
    database.exec(
      readFileSync(join(migrationDirectory, migrationFile), "utf8"),
    );
  }
  const integrity = database.prepare("PRAGMA integrity_check").get();
  const foreignKeyIssues = database.prepare("PRAGMA foreign_key_check").all();
  const tableCount = Number(
    database
      .prepare(
        "SELECT count(*) AS count FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'",
      )
      .get().count,
  );
  if (integrity.integrity_check !== "ok" || foreignKeyIssues.length > 0) {
    throw new Error("The fresh migration database failed integrity checks.");
  }
  process.stdout.write(
    `Applied ${migrationFiles.length} migrations; verified ${tableCount} tables with no foreign-key or integrity errors.\n`,
  );
} finally {
  database?.close();
  if (existsSync(databasePath)) unlinkSync(databasePath);
}
