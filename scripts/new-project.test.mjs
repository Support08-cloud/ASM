import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import { cp, mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { applyReplacements, createProject, parseArgs, titleCase, UserError } from './new-project.mjs'

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const TEMPLATE = 'v360-starter'
const SKIP = new Set(['node_modules', 'dist', '.git'])

const BASE_OPTIONS = {
  slug: '',
  title: '',
  tagline: '',
  template: TEMPLATE,
  root: '',
  force: false,
  dryRun: false,
}

let root = ''

/** A throwaway copy of the repo with just the pieces the generator touches. */
async function buildFixtureRoot() {
  const dir = await mkdtemp(join(tmpdir(), 'v360-new-project-'))

  await cp(join(REPO_ROOT, TEMPLATE), join(dir, TEMPLATE), {
    recursive: true,
    filter: (source) => !SKIP.has(source.split('/').pop() ?? ''),
  })

  await mkdir(join(dir, '.github/workflows'), { recursive: true })
  await cp(
    join(REPO_ROOT, '.github/workflows', `${TEMPLATE}.yml`),
    join(dir, '.github/workflows', `${TEMPLATE}.yml`),
  )

  await writeFile(
    join(dir, 'README.md'),
    ['# ASM', '', '<!-- projects:start -->', '| Project | What it does |', '| --- | --- |', '<!-- projects:end -->', ''].join('\n'),
  )

  return dir
}

async function walk(dir, prefix = '') {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    if (SKIP.has(entry.name)) continue
    const path = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.isDirectory()) files.push(...(await walk(join(dir, entry.name), path)))
    else files.push(path)
  }
  return files
}

async function exists(path) {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

describe('new-project generator', () => {
  before(async () => {
    root = await buildFixtureRoot()
  })

  after(async () => {
    if (root) await rm(root, { recursive: true, force: true })
  })

  it('stamps out a renamed, self-consistent project', async () => {
    const result = await createProject({
      ...BASE_OPTIONS,
      root,
      slug: 'invoice-router',
      title: 'Invoice Router',
      tagline: 'Offline invoice sorting',
    })

    const dest = join(root, 'invoice-router')
    assert.equal(result.destDir, dest)

    const pkg = JSON.parse(await readFile(join(dest, 'package.json'), 'utf8'))
    assert.equal(pkg.name, 'invoice-router')

    const lock = JSON.parse(await readFile(join(dest, 'package-lock.json'), 'utf8'))
    assert.equal(lock.name, 'invoice-router')
    assert.equal(lock.packages[''].name, 'invoice-router')

    const config = await readFile(join(dest, 'src/app.config.ts'), 'utf8')
    assert.match(config, /slug: 'invoice-router'/)
    assert.match(config, /name: 'Invoice Router'/)
    assert.match(config, /tagline: 'Offline invoice sorting'/)

    const html = await readFile(join(dest, 'index.html'), 'utf8')
    assert.match(html, /<title>Invoice Router<\/title>/)
  })

  it('leaves no trace of the template identity in the generated files', async () => {
    const dest = join(root, 'invoice-router')
    const offenders = []

    for (const file of await walk(dest)) {
      const contents = await readFile(join(dest, file), 'utf8')
      if (contents.includes(TEMPLATE) || contents.includes('V360 Starter')) offenders.push(file)
    }

    assert.deepEqual(offenders, [])
  })

  it('replaces the template README with a project-specific one', async () => {
    const readme = await readFile(join(root, 'invoice-router/README.md'), 'utf8')

    assert.match(readme, /^# Invoice Router/)
    assert.match(readme, /Offline invoice sorting/)
    assert.match(readme, /cd invoice-router/)
    assert.doesNotMatch(readme, /template every new Vision 360 utility/)
  })

  it('copies every template file', async () => {
    const templateFiles = await walk(join(root, TEMPLATE))
    const generatedFiles = await walk(join(root, 'invoice-router'))

    assert.deepEqual(generatedFiles.sort(), templateFiles.sort())
  })

  it('adds a matching CI workflow', async () => {
    const workflow = await readFile(join(root, '.github/workflows/invoice-router.yml'), 'utf8')

    assert.match(workflow, /name: Invoice Router/)
    assert.match(workflow, /'invoice-router\/\*\*'/)
    assert.match(workflow, /working-directory: invoice-router/)
    assert.doesNotMatch(workflow, /v360-starter/)
  })

  it('registers the project in the root README', async () => {
    const readme = await readFile(join(root, 'README.md'), 'utf8')
    const rowIndex = readme.indexOf('| [`invoice-router`](invoice-router) | Offline invoice sorting |')

    assert.ok(rowIndex > readme.indexOf('<!-- projects:start -->'))
    assert.ok(rowIndex < readme.indexOf('<!-- projects:end -->'))
  })

  it('falls back to a title-cased slug and the template tagline', async () => {
    const result = await createProject({ ...BASE_OPTIONS, root, slug: 'doc-manager' })

    assert.equal(result.title, 'Doc Manager')
    assert.equal(result.tagline, 'Vision 360 app scaffold')
  })

  it('refuses to overwrite an existing project unless forced', async () => {
    await assert.rejects(
      () => createProject({ ...BASE_OPTIONS, root, slug: 'doc-manager' }),
      (error) => error instanceof UserError && /already exists/.test(error.message),
    )

    await assert.doesNotReject(() =>
      createProject({ ...BASE_OPTIONS, root, slug: 'doc-manager', title: 'Docs', force: true }),
    )
    const config = await readFile(join(root, 'doc-manager/src/app.config.ts'), 'utf8')
    assert.match(config, /name: 'Docs'/)
  })

  it('rejects slugs that are not lowercase kebab-case', async () => {
    for (const slug of ['Invoice', 'invoice_router', '1tool', 'invoice--router', 'invoice-']) {
      await assert.rejects(
        () => createProject({ ...BASE_OPTIONS, root, slug }),
        (error) => error instanceof UserError && /Invalid slug/.test(error.message),
        `expected ${slug} to be rejected`,
      )
    }
  })

  it('rejects an empty slug and the template name itself', async () => {
    await assert.rejects(
      () => createProject({ ...BASE_OPTIONS, root, slug: '' }),
      (error) => error instanceof UserError && /Missing project slug/.test(error.message),
    )
    await assert.rejects(
      () => createProject({ ...BASE_OPTIONS, root, slug: TEMPLATE }),
      (error) => error instanceof UserError && /template itself/.test(error.message),
    )
  })

  it('reports a missing template instead of copying nothing', async () => {
    await assert.rejects(
      () => createProject({ ...BASE_OPTIONS, root, slug: 'ghost-tool', template: 'not-a-template' }),
      (error) => error instanceof UserError && /Template not found/.test(error.message),
    )
  })

  it('writes nothing on a dry run', async () => {
    const result = await createProject({ ...BASE_OPTIONS, root, slug: 'dry-tool', dryRun: true })

    assert.equal(await exists(join(root, 'dry-tool')), false)
    assert.equal(await exists(join(root, '.github/workflows/dry-tool.yml')), false)
    assert.ok(result.log.join('\n').includes('dry run'))

    const readme = await readFile(join(root, 'README.md'), 'utf8')
    assert.ok(!readme.includes('dry-tool'))
  })
})

describe('parseArgs', () => {
  it('reads the slug and every option', () => {
    const options = parseArgs(['invoice-router', '--title', 'Invoice Router', '--tagline', 'Sorting', '--force', '--dry-run'])

    assert.equal(options.slug, 'invoice-router')
    assert.equal(options.title, 'Invoice Router')
    assert.equal(options.tagline, 'Sorting')
    assert.equal(options.force, true)
    assert.equal(options.dryRun, true)
  })

  it('defaults the template and rejects malformed input', () => {
    assert.equal(parseArgs(['tool']).template, TEMPLATE)
    assert.throws(() => parseArgs(['tool', '--title']), UserError)
    assert.throws(() => parseArgs(['tool', '--nope']), UserError)
    assert.throws(() => parseArgs(['one', 'two']), UserError)
  })

  it('recognises the help flag', () => {
    assert.equal(parseArgs(['--help']).help, true)
    assert.equal(parseArgs(['-h']).help, true)
  })
})

describe('helpers', () => {
  it('title-cases hyphenated slugs', () => {
    assert.equal(titleCase('invoice-router'), 'Invoice Router')
    assert.equal(titleCase('doc'), 'Doc')
  })

  it('replaces every occurrence in order', () => {
    assert.equal(applyReplacements('a-a-a', [['a', 'b']]), 'b-b-b')
    assert.equal(applyReplacements('keep', []), 'keep')
  })
})
