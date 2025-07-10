#!/usr/bin/env node

/**
 * This script helps identify and fix common import issues in the codebase
 * Run with: node fix-imports.js
 */

const fs = require("fs")
const path = require("path")
const { execSync } = require("child_process")

const ROOT_DIR = path.resolve(__dirname)
const SRC_DIR = path.join(ROOT_DIR, "src")

// Known issues to fix
const IMPORT_REPLACEMENTS = [
  {
    // Fix @services imports which aren't defined
    find: /from\s+["']@services\/([^"']+)["']/g,
    replace: 'from "~/services/$1"',
  },
  {
    // Fix typos in persistence
    find: /from\s+["'][~@]\/services\/persisitence\/([^"']+)["']/g,
    replace: 'from "~/services/persistence/$1"',
  },
  {
    // Normalize ~utils to ~/utils (add slash)
    find: /from\s+["']~((?!\/|icons)[^"'\/]+)\/([^"']+)["']/g,
    replace: 'from "~/$1/$2"',
  },
]

function processFile(filePath) {
  if (
    !filePath.endsWith(".ts") &&
    !filePath.endsWith(".vue") &&
    !filePath.endsWith(".js")
  ) {
    return
  }

  let fileContent = fs.readFileSync(filePath, "utf8")
  const originalContent = fileContent
  let modified = false

  // Apply all replacements
  for (const replacement of IMPORT_REPLACEMENTS) {
    fileContent = fileContent.replace(replacement.find, replacement.replace)
  }

  // If changes were made, save the file
  if (fileContent !== originalContent) {
    console.log(`Fixing imports in: ${path.relative(ROOT_DIR, filePath)}`)
    fs.writeFileSync(filePath, fileContent, "utf8")
    modified = true
  }

  return modified
}

function processDirectory(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true })
  let modified = false

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name)

    if (entry.isDirectory()) {
      if (processDirectory(fullPath)) {
        modified = true
      }
    } else {
      if (processFile(fullPath)) {
        modified = true
      }
    }
  }

  return modified
}

// Start processing
console.log("Scanning for import issues...")
const hasModifications = processDirectory(SRC_DIR)

if (hasModifications) {
  console.log("Fixed import issues in the codebase")
  console.log("Running TypeScript type checking...")
  try {
    execSync("pnpm run lint:ts", { stdio: "inherit" })
    console.log("TypeScript check passed!")
  } catch (e) {
    console.error("TypeScript still has errors, please fix them manually")
  }
} else {
  console.log("No import issues found")
}
