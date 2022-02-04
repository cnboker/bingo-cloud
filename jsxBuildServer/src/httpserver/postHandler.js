const esbuild = require("./esbuild");
const { writeFile, rm } = require("fs").promises;
const { makeid } = require("../util");
const path = require("path");

exports.make = async (username, entity) => {
  //create entry file
  //build file
  //return
  const dataContent = JSON.stringify(entity);
  
  const tmpfile = makeid(10);
  const entryFile = `${process.cwd()}/entry/builder.js`;
  try {
    //console.log("entryFile", entryFile);
    const jsx = `
      import { App } from '../src/compiler/app'
      import { transformData } from  '../src/httpserver/postDataTransformer'
      const metamap = transformData(${dataContent})
      console.log('metamap',metamap)
      App(metamap)
    `;
    console.log('jsx', jsx)
    await writeFile(entryFile, jsx);
    return await esbuild.build(username, entryFile);
  } 
  catch (e) {
    console.log(e);
  }
  finally{
    rm(entryFile)
  }
};
