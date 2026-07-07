import fs from "fs";
import path from "path";
import { google } from "googleapis";

const SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive",
];

export function requireEnv(name) {
  const v = process.env[name];
  if (!v || !String(v).trim()) {
    throw new Error(`Required environment variable missing: ${name}`);
  }
  return String(v).trim();
}

export function loadServiceAccount(root) {
  const inline = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (inline?.trim()) {
    return JSON.parse(inline);
  }
  const rel =
    process.env.GOOGLE_SERVICE_ACCOUNT_PATH || "config/service_account.json";
  const full = path.isAbsolute(rel) ? rel : path.join(root, rel);
  if (!fs.existsSync(full)) {
    throw new Error(
      `Google service account JSON not found: ${full} (set GOOGLE_SERVICE_ACCOUNT_JSON or GOOGLE_SERVICE_ACCOUNT_PATH)`,
    );
  }
  return JSON.parse(fs.readFileSync(full, "utf8"));
}

export async function getSheetsApi(root) {
  const creds = loadServiceAccount(root);
  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: SCOPES,
  });
  const client = await auth.getClient();
  return google.sheets({ version: "v4", auth: client });
}

export async function ensureWorksheet(sheets, spreadsheetId, title) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const found = meta.data.sheets?.find((s) => s.properties?.title === title);
  if (found?.properties?.sheetId != null) {
    return found.properties.sheetId;
  }
  const res = await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          addSheet: {
            properties: {
              title,
              gridProperties: { rowCount: 500, columnCount: 32 },
            },
          },
        },
      ],
    },
  });
  return res.data.replies?.[0]?.addSheet?.properties?.sheetId;
}
