#! /usr/bin/env node
import * as fs from "fs";
import * as fp from "./";


const fsPath = process.argv[2] || process.cwd();

fp.properties(fsPath).then(res => {
  if (process.argv[3]) {
    fs.writeFileSync(process.argv[3], JSON.stringify(res, null, 2));
  } else {
    console.log(res);
  }
});