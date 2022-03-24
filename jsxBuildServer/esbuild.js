require('esbuild').build({
  entryPoints: ['./test/build.test.js'],
  bundle: true,
  platform: 'node',
  outfile: 'dist/builder.js',
  //outfile: args.outFile,
  sourcemap: true,
  //target: 'node12',
  //external: Object.keys(require('./package.json').dependencies),
  external: [ 'fs', 'path', 'util', 'stream'],
  watch: {
    onRebuild(error, result) {
      if (error) console.error('watch build failed:', error)
      else console.log('watch build succeeded:', result)
    },
  },
})
