type Args = {
  entryFile: string,
  outFile: string,
}
export const make = (args: Args) => {
  require('esbuild').build({
    entryPoints: [args.entryFile],
    bundle: true,
    //platform: 'node',
    //outfile: 'dist/builder.js',
    outfile: args.outFile,
    sourcemap: true,
    //target: 'node12',
    //external: Object.keys(require('./package.json').dependencies),
    watch: {
      onRebuild(error, result) {
        if (error) console.error('watch build failed:', error)
        else console.log('watch build succeeded:', result)
      },
    },
  })
}
