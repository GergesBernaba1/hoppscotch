/**
 * This script fixes common linting issues in the Hoppscotch codebase:
 * 1. Converts CRLF to LF line endings
 * 2. Replaces single quotes with double quotes
 * 3. Removes extra semicolons
 * 4. Formats code according to project standards
 * 
 * Usage: node fix-lint-issues.js
 */

const fs = require("fs")
const path = require("path")
const { execSync } = require("child_process")

// Configuration
const rootDir = process.cwd()
const packagesDir = path.join(rootDir, "packages")

/**
 * Recursively find files with certain extensions
 */
function findFiles(dir, extensions) {
    let results = []
    const files = fs.readdirSync(dir)
    
    for (const file of files) {
        const filePath = path.join(dir, file)
        const stat = fs.statSync(filePath)
        
        if (stat.isDirectory()) {
            // Skip node_modules and .git
            if (file === "node_modules" || file === ".git") continue
            
            // Recursively search directories
            results = results.concat(findFiles(filePath, extensions))
        } else {
            // Check if file has one of the target extensions
            if (extensions.some(ext => file.endsWith(ext))) {
                results.push(filePath)
            }
        }
    }
    
    return results
}

/**
 * Fix line endings, quotes, and semicolons in a file
 */
function fixFileContents(filePath) {
    console.log(`Processing ${filePath}`)
    
    try {
        let content = fs.readFileSync(filePath, "utf8")
        const originalContent = content
        
        // Convert CRLF to LF (Windows to Unix line endings)
        content = content.replace(/\r\n/g, "\n")
        
        // Replace single quotes with double quotes in imports/strings
        content = content.replace(/'([^']*?)'/g, (match, p1) => {
            // Only replace if it looks like a module or path or string literal used in code
            if (p1.includes("/") || p1.match(/^[@a-zA-Z]/) || match.includes("t(") || match.includes(" = ")) {
                return `"${p1}"`
            }
            return match
        })
        
        // Remove extra semicolons in certain contexts
        content = content.replace(/;(\s*\n|\s*\})/g, "$1")
        
        // Write the file if content changed
        if (content !== originalContent) {
            fs.writeFileSync(filePath, content, "utf8")
            console.log(`Fixed ${filePath}`)
        }
    } catch (err) {
        console.error(`Error processing ${filePath}:`, err)
    }
}

/**
 * Run prettier on the codebase
 */
function runPrettier() {
    try {
        console.log("Running prettier...")
        execSync("pnpm run format", { cwd: rootDir, stdio: "inherit" })
        console.log("Prettier completed successfully")
        return true
    } catch (err) {
        console.error("Error running prettier")
        return false
    }
}

/**
 * Run ESLint fix on specific files
 */
function runESLintFix(filePath) {
    try {
        console.log(`Running ESLint fix on ${filePath}`)
        execSync(`npx eslint --fix "${filePath}"`, { cwd: rootDir, stdio: "inherit" })
        return true
    } catch (err) {
        console.error(`Error running ESLint fix on ${filePath}`)
        return false
    }
}

/**
 * Fix all issues in a specific file
 */
async function fixSpecificFile(filePath) {
    console.log(`Fixing file: ${filePath}`)
    
    // First fix basic issues
    fixFileContents(filePath)
    
    // Then run ESLint fix
    runESLintFix(filePath)
    
    console.log(`Completed fixing ${filePath}`)
}

/**
 * Main function
 */
async function main() {
    // Check if a specific file was provided
    const targetFile = process.argv[2]
    
    if (targetFile) {
        await fixSpecificFile(path.resolve(targetFile))
        return
    }
    
    console.log("Scanning for files with linting issues...")
    const fileExtensions = [".js", ".ts", ".vue"]
    const files = findFiles(packagesDir, fileExtensions)
    
    console.log(`Found ${files.length} files to process`)
    
    // Fix each file
    for (const file of files) {
        fixFileContents(file)
    }
    
    // Run prettier to fix formatting
    const prettierSucceeded = runPrettier()
    
    if (prettierSucceeded) {
        console.log("Fixed import issues and formatting in the codebase")
    } else {
        console.log("Fixed import issues, but formatting may still have issues")
    }
    
    console.log("\nTo fix specific files with more issues, run:")
    console.log("node fix-lint-issues.js path/to/file")
}

// Execute the script
main().catch(console.error)