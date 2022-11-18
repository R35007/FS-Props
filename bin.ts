#! /usr/bin/env node
import * as fs from "fs";
import * as fp from "./properties";

fp.properties(process.argv[2]).then(res => {
  if (process.argv[3]) {
    fs.writeFileSync(process.argv[3], JSON.stringify(res, null, 2));
  }else{
    console.log(res);
  }
});