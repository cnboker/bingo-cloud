const esbuild = require("./esbuild");
const { writeFile, rm } = require("fs").promises;
const fs = require("fs");
const { makeid } = require("../util");
const path = require("path");

exports.make = async (username, entity) => {
  //create entry file
  //build file
  //return
  const dataContent = JSON.stringify(entity);

  //const tmpfile = makeid(10);

  const entryDir = `${process.cwd()}/entry/${username}`;
  const entryFile = `${entryDir}/builder.js`;

  if (!fs.existsSync(entryDir)) {
    fs.mkdirSync(entryDir, { recursive: true });
  }
  try {
    //console.log("entryFile", entryFile);
    // const jsx = `
    //   import { App } from '../src/compiler/app'
    //   import { transformData } from  '../src/httpserver/postDataTransformer'
    //   const metamap = transformData(${dataContent})
    //   console.log('metamap',metamap)
    //   App(metamap)
    // `;
    const jsx = `
    import { App } from '../../src/compiler/app'
      import { transformData } from  '../../src/httpserver/postDataTransformer'
      const data = transformData(${dataContent})
      App(data)
    
    `;
    //console.log("jsx", jsx);
    await writeFile(entryFile, jsx);
    return await esbuild.build(username, entryFile);
  } catch (e) {
    console.log(e);
  } finally {
    rm(entryFile);
  }
};
