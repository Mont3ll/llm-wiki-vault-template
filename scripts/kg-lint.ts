#!/usr/bin/env bun
import { formatLintReport, scanVault, writeMarkdownLintReport } from "./kg-core";

const args = new Set(process.argv.slice(2));
const report = scanVault(process.cwd());
console.log(formatLintReport(report));

if (args.has("--write-report")) {
  const written = writeMarkdownLintReport(process.cwd(), report);
  console.log(`\nReport written: ${written}`);
}

process.exitCode = report.summary.error > 0 ? 1 : 0;
