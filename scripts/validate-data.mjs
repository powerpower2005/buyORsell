#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);

const quoteSchema = JSON.parse(
  fs.readFileSync(path.join(ROOT, "schemas/quote-file.schema.json"), "utf8"),
);
const indexSchema = JSON.parse(
  fs.readFileSync(path.join(ROOT, "schemas/index.schema.json"), "utf8"),
);

const validateQuote = ajv.compile(quoteSchema);
const validateIndex = ajv.compile(indexSchema);

let failed = false;

function checkFile(filePath, validator, label) {
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (!validator(data)) {
    console.error(`FAIL ${label}: ${filePath}`);
    console.error(validator.errors);
    failed = true;
  } else {
    console.log(`OK ${label}: ${filePath}`);
  }
}

function walkQuotes(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== ".meta") {
      walkQuotes(full);
    } else if (entry.isFile() && entry.name.endsWith(".json") && entry.name !== "index.json") {
      checkFile(full, validateQuote, "quote");
    }
  }
}

walkQuotes(path.join(ROOT, "data"));

const indexPath = path.join(ROOT, "data/index.json");
if (fs.existsSync(indexPath)) {
  checkFile(indexPath, validateIndex, "index");
}

process.exit(failed ? 1 : 0);
