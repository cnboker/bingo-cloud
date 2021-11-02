const { readFile, writeFile, mkdir } = require("fs").promises;
const esbuild = require("esbuild");
const util = require("../util");

exports.make = async (username, entryFile) => {
  let randomDir = util.makeid(10);
  const relationPath = `/publish/${username}`;
  const outdir = `${process.cwd()}${relationPath}`
  await mkdir(outdir, { recursive: true });

  const script = esbuild.buildSync({
    entryPoints: [entryFile],
    bundle: true,
    //platform: 'node',
    //outfile: 'dist/builder.js',
    //outfile: args.outFile,
    sourcemap: true,
    //target: 'node12',
    //external: Object.keys(require('./package.json').dependencies),
    // watch: {
    //   onRebuild(error, result) {
    //     if (error) console.error('watch build failed:', error)
    //     else console.log('watch build succeeded:', result)
    //   },
    // },
    format: "esm",
    target: ["esnext"],
    write: false
  });

  const html = await readFile(`${__dirname}/index.html`, {
    encoding: "utf8"
  });
  //console.log("script.outputFile", script);
  await writeFile(`${outdir}/index.html`, `<script type="module">${script.outputFiles[0].text}</script>${html}`)
  return `${relationPath}/index.html`;
};
