const { readFile, writeFile, mkdir } = require("fs").promises;
const esbuild = require("esbuild");
const util = require("../util");

exports.build = async (username, entryFile) => {
  let randomDir = util.makeid(10);
  const relationPath = `/publish/${username}`;
  const outdir = `${process.cwd()}${relationPath}`
  await mkdir(outdir, { recursive: true });

  const script = esbuild.buildSync({
    entryPoints: [entryFile],
    bundle: true,
    //sourcemap: true,
    minify: true,
    format: "esm",
    target: ["esnext"],
    write: false
  });

  const html = await readFile(`${__dirname}/index.html`, {
    encoding: "utf8"
  });
  
  await writeFile(`${outdir}/index.html`,html)
  await writeFile(`${outdir}/main.js`, script.outputFiles[0].text)
  return `${relationPath}/index.html`;
};
