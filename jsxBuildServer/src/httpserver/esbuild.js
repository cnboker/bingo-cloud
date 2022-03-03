const fs = require('fs')
const {readFile, writeFile, mkdir, rmdir} = fs.promises;
const esbuild = require("esbuild");
const util = require("../util");
const path = require('path')

const {cssFilePlugin} = require('./cssFilePlugin')

function clearDir(dir) {
  fs.readdir(dir, (err, files) => {
    if (err) {
      return;
    }
    for (const file of files) {
      fs.unlinkSync(path.join(dir, file));
    }
  })
}

exports.build = async(username, entryFile) => {
  const relationPath = `/wwwroot/${username}/dist`;
  const outdir = `${process.cwd()}${relationPath}`
  clearDir(outdir)
  await mkdir(outdir, {recursive: true});

  var script = await esbuild.build({
    entryPoints: [entryFile], 
    bundle: true,
    //minify: true,
    sourcemap: 'external',
    outdir,
    format: "esm",
    target: ["es2020"],
    write: true,
    plugins: [cssFilePlugin],
    logLevel: 'debug',
  });

  const html = await readFile(`${__dirname}/index.html`, {
    encoding: "utf8"
  });
  console.log('script', script)
 
  await writeFile(`${outdir}/index.html`,html.replace('###',`./${path.basename(entryFile)}?t=${Date.now()}`))
  
  return [
    `/${username}/dist/index.html`,
    `/${username}/dist/main.css`,
    //`/sw.js`,
    //`/sw.js.map`,
    //`/workbox-5d0b2bdf.js`,
    //`/workbox-5d0b2bdf.js.map`,
    `/${username}/dist/${path.basename(entryFile)}`];
};