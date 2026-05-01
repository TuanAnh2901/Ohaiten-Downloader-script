import * as esbuild from 'esbuild'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const srcDir = join(root, 'src')
const distDir = join(root, 'dist')
const mataFile = join(srcDir, 'mata', 'userjs.mata')
const outputFile = join(distDir, 'OhentaiDownloader.user.js')

if (!existsSync(distDir)) {
    mkdirSync(distDir, { recursive: true })
}

async function build(watch = false): Promise<void> {
    const ctx = await esbuild.context({
        entryPoints: [join(srcDir, 'main.ts')],
        bundle: true,
        minify: false,
        sourcemap: false,
        target: 'es2020',
        format: 'iife',
        outfile: outputFile,
    })

    if (watch) {
        await ctx.watch()
        console.log('Watching for changes...')
    } else {
        await ctx.rebuild()
        await ctx.dispose()

        const mata = readFileSync(mataFile, 'utf-8')
        const js = readFileSync(outputFile, 'utf-8')
        writeFileSync(outputFile, mata + '\n' + js)

        console.log(`Build complete: ${outputFile}`)
    }
}

const args = process.argv.slice(2)
build(args.includes('--watch')).catch(err => {
    console.error(err)
    process.exit(1)
})
