#! /usr/bin/env node
import * as fs from "fs";
import * as path from "path";
import * as yargs from 'yargs';
import * as fp from ".";

interface Options {
  [x: string]: unknown;
  deep: boolean;
  _: (string)[];
  $0: string;
}

const argv = (pkg) => {
  const options = yargs
    .usage('fs-props <source> <save> [options]')
    .options({
      deep: { alias: 'deep', description: 'Get deep props', type: "boolean", default: false },
    })
    .boolean('deep')
    .help('help').alias('help', 'h')
    .example(`fs-props`, '')
    .example(`fs-props --deep`, '')
    .example(`fs-props ${process.cwd()}`, '')
    .example(`fs-props ${process.cwd()} --deep`, '')
    .example(`fs-props ${process.cwd()} ${path.join(process.cwd(), "./props.json")}`, '')
    .example(`fs-props ${process.cwd()} ${path.join(process.cwd(), "./props.json")} --deep`, '')
    .version(pkg.version).alias('version', 'v').argv as Options;
  return options;
}

const getProps = async () => {
  const pkgStr = fs.readFileSync(path.join(__dirname, "./package.json"), 'utf8');
  const pkg = JSON.parse(pkgStr);

  const args = argv(pkg);
  const { _: [fsPath = process.cwd(), save], deep } = args;

  const props = deep ? await fp.deepProps(path.resolve(process.cwd(), fsPath)) : await fp.props(path.resolve(process.cwd(), fsPath));
  if (save) {
    fs.writeFileSync(path.resolve(process.cwd(), save), JSON.stringify(props, null, 2));
  } else {
    console.log(props);
  }
}

getProps();