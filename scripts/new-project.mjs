#!/usr/bin/env node
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DEFAULT_TEMPLATE = 'v360-starter'
const SLUG_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/
const SKIP_ENTRIES = new Set(['node_modules', 'dist', 'dist-ssr', '.git', '.tmp'])
const TEXT_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.mjs', '.json', '.html', '.css', '.md', '.svg', '.yml', '.yaml'])
const README_START = '<!-- projects:start -->'
const README_END = '<!-- projects:end -->'

const USAGE = `Start a new Vision 360 project from a template project.

Usage:
  node scripts/new-project.mjs <slug> [options]

Options:
  --title <text>       Display name (default: title-cased slug)
  --tagline <text>     One-line description shown in the sidebar
  --template <name>    Template project directory (default: ${DEFAULT_TEMPLATE})
  --root <path>        Repository root (default: this repository)
  --force              Replace the destination directory if it already exists
  --dry-run            Report what would happen without writing anything
  -h, --help           Show this message

Example:
  node scripts/new-project.mjs invoice-router --title "Invoice Router" --tagline "Offline invoice sorting"
`

async function main(argv) {
  const options = parseArgs(argv)
  if (options.help) {
    process.stdout.write(USAGE)
    return
  }

  const result = await createProject(options)
  for (const line of result.log) process.stdout.write(`${line}\n`)
}

export function parseArgs(argv) {
  const options = {
    slug: '',
    title: '',
    tagline: '',
    template: DEFAULT_TEMPLATE,
    root: REPO_ROOT,
    force: false,
    dryRun: false,
    help: false,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    const next = () => {
      const value = argv[index + 1]
      if (value === undefined) throw new UserError(`Missing value for ${arg}`)
      index += 1
      return value
    }

    switch (arg) {
      case '-h':
      case '--help':
        options.help = true
        break
      case '--title':
        options.title = next()
        break
      case '--tagline':
        options.tagline = next()
        break
      case '--template':
        options.template = next()
        break
      case '--root':
        options.root = resolve(next())
        break
      case '--force':
        options.force = true
        break
      case '--dry-run':
        options.dryRun = true
        break
      default:
        if (arg.startsWith('-')) throw new UserError(`Unknown option: ${arg}`)
        if (options.slug) throw new UserError(`Unexpected argument: ${arg}`)
        options.slug = arg
    }
  }

  return options
}

export async function createProject(options) {
  const { slug, template, root, force, dryRun } = options
  if (!slug) throw new UserError(`Missing project slug.\n\n${USAGE}`)
  if (!SLUG_PATTERN.test(slug)) {
    throw new UserError(`Invalid slug "${slug}". Use lowercase words separated by single hyphens, e.g. invoice-router.`)
  }
  if (slug === template) throw new UserError(`"${slug}" is the template itself. Pick a different name.`)

  const templateDir = join(root, template)
  if (!(await exists(templateDir))) throw new UserError(`Template not found: ${relative(root, templateDir) || templateDir}`)

  const destDir = join(root, slug)
  if (await exists(destDir)) {
    if (!force) throw new UserError(`${slug}/ already exists. Pass --force to replace it.`)
    if (!dryRun) await rm(destDir, { recursive: true, force: true })
  }

  const identity = await readIdentity(templateDir)
  const title = options.title || titleCase(slug)
  const tagline = options.tagline || identity.tagline
  const replacements = [
    [identity.slug, slug],
    [identity.name, title],
    [identity.tagline, tagline],
  ].filter(([from, to]) => from && from !== to)

  const log = [`Creating ${slug}/ from ${template}/`, `  name:    ${title}`, `  tagline: ${tagline}`]

  const files = await collectFiles(templateDir)
  if (!dryRun) {
    await copyTemplate(templateDir, destDir)
    for (const file of files) {
      if (!isTextFile(file)) continue
      const target = join(destDir, file)
      const original = await readFile(target, 'utf8')
      const updated = applyReplacements(original, replacements)
      if (updated !== original) await writeFile(target, updated)
    }
  }
  log.push(`  copied ${files.length} files`)

  if (!dryRun && files.includes('README.md')) {
    await writeFile(join(destDir, 'README.md'), projectReadme({ slug, title, tagline }))
  }

  const workflow = await writeWorkflow({ root, identity, slug, title, dryRun })
  if (workflow) log.push(`  wrote ${workflow}`)

  const readme = await updateRootReadme({ root, slug, title, tagline, dryRun })
  if (readme) log.push(`  updated ${readme}`)

  log.push('', 'Next:', `  cd ${slug}`, '  npm install', '  npm run dev')
  if (dryRun) log.push('', '(dry run — nothing was written)')

  return { slug, title, tagline, destDir, files, log }
}

/** The template's own README documents the template, so generated projects get a fresh one. */
export function projectReadme({ slug, title, tagline }) {
  return `# ${title}

${tagline}

Scaffolded with \`scripts/new-project.mjs\`. Replace this description once the project
does something real.

## Run

\`\`\`bash
cd ${slug}
npm install
npm run dev
\`\`\`

Open http://localhost:5173 and choose **Load sample dataset**.

\`\`\`bash
npm run lint
npm test
npm run build
npm run preview
\`\`\`

## Where to start

- \`src/app.config.ts\` — app name, slug, and tagline
- \`src/models/app.ts\` — replace the placeholder domain types
- \`src/services/\` — swap \`demo-data.ts\` for the real loader and \`task-runner.ts\` for the real job
- \`src/pages/\` and \`src/components/navigation/Sidebar.tsx\` — routes and labels
- \`tests/\` — written to be edited alongside the code
`
}

/** Reads the template's identity straight out of its `src/app.config.ts`. */
async function readIdentity(templateDir) {
  const source = await readFile(join(templateDir, 'src/app.config.ts'), 'utf8')
  const read = (key) => {
    const match = source.match(new RegExp(`${key}:\\s*'([^']*)'`))
    if (!match) throw new UserError(`Template app.config.ts is missing a "${key}" field.`)
    return match[1]
  }
  return { slug: read('slug'), name: read('name'), tagline: read('tagline') }
}

async function copyTemplate(templateDir, destDir) {
  await cp(templateDir, destDir, {
    recursive: true,
    filter: (source) => {
      const name = source.split('/').pop() ?? ''
      return !SKIP_ENTRIES.has(name) && !name.endsWith('.tsbuildinfo')
    },
  })
}

async function collectFiles(dir, prefix = '') {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    if (SKIP_ENTRIES.has(entry.name) || entry.name.endsWith('.tsbuildinfo')) continue
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.isDirectory()) files.push(...(await collectFiles(join(dir, entry.name), relativePath)))
    else files.push(relativePath)
  }

  return files.sort()
}

async function writeWorkflow({ root, identity, slug, title, dryRun }) {
  const templateWorkflow = join(root, '.github/workflows', `${identity.slug}.yml`)
  if (!(await exists(templateWorkflow))) return null

  const contents = applyReplacements(await readFile(templateWorkflow, 'utf8'), [
    [identity.slug, slug],
    [identity.name, title],
  ])
  const target = join(root, '.github/workflows', `${slug}.yml`)
  if (!dryRun) {
    await mkdir(dirname(target), { recursive: true })
    await writeFile(target, contents)
  }
  return relative(root, target)
}

async function updateRootReadme({ root, slug, title, tagline, dryRun }) {
  const readmePath = join(root, 'README.md')
  if (!(await exists(readmePath))) return null

  const contents = await readFile(readmePath, 'utf8')
  const end = contents.indexOf(README_END)
  if (!contents.includes(README_START) || end === -1) return null
  if (contents.includes(`[\`${slug}\`]`)) return null

  const row = `| [\`${slug}\`](${slug}) | ${tagline} |\n`
  const updated = `${contents.slice(0, end)}${row}${contents.slice(end)}`
  if (!dryRun) await writeFile(readmePath, updated)
  return `README.md (${title})`
}

export function applyReplacements(contents, replacements) {
  return replacements.reduce((text, [from, to]) => text.split(from).join(to), contents)
}

export function titleCase(slug) {
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function isTextFile(file) {
  const dot = file.lastIndexOf('.')
  return dot !== -1 && TEXT_EXTENSIONS.has(file.slice(dot))
}

async function exists(path) {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

export class UserError extends Error {}

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (invokedDirectly) {
  main(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`${error instanceof UserError ? error.message : error.stack}\n`)
    process.exitCode = 1
  })
}
