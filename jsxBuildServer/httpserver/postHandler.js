const esbuild = require("./esbuild");
const { writeFile, rm } = require("fs").promises;
const { makeid } = require("../util");
const path = require("path");

exports.make = async (username, data) => {
  //create entry file
  //build file
  //return
  console.log('begin make...')
  const dataContent = JSON.stringify(data);
  const tmpfile = makeid(10);
  const entryFile = `${process.cwd()}/entry/${tmpfile}.js`;
  try {
    console.log("entryFile", entryFile);
    const jsx = `
      import {App} from '../compiler/app'
      const MetaMap = ${dataContent}
      App(MetaMap)
    `;
    await writeFile(entryFile, jsx);
    return await esbuild.build(username, entryFile);
  } 
  catch (e) {
    rm(entryFile);
    console.log(e);
  }
  finally{
    rm(entryFile)
  }
};
