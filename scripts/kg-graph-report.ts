#!/usr/bin/env bun
import { buildGraph, writeGraphReports } from "./kg-core";

const shouldWrite = process.argv.includes("--write");
const graph = buildGraph(process.cwd());

console.log("KG Graph Report");
console.log("");
console.log(`nodes: ${graph.nodes.length}`);
console.log(`edges: ${graph.edges.length}`);

if (shouldWrite) {
  const files = writeGraphReports(process.cwd(), graph);
  console.log("");
  console.log("Reports written:");
  for (const file of files) console.log(`- ${file}`);
}
