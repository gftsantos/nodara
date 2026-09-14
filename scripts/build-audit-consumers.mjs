import { build } from "esbuild";
import { createRequire } from "node:module";
import { mkdirSync, copyFileSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve, join, sep, relative, isAbsolute } from "node:path";
import { spawnSync } from "node:child_process";

const variant = process.env.NODARA_CONSUMER_VARIANT ?? "current";
if (!["current", "minimum"].includes(variant)) throw new Error("Unknown consumer variant.");
const directory = resolve(variant === "minimum" ? "work/runtime-audit-minimum" : "work/runtime-audit");
mkdirSync(directory, { recursive: true });
const manifest = JSON.parse(readFileSync(resolve("public/downloads/manifest.json"), "utf8"));
const artifacts = join(directory, "artifacts");
mkdirSync(artifacts, { recursive: true });
const packed = Object.fromEntries(manifest.map(entry => {
  const source = resolve("public/downloads", entry.filename);
  const hash = createHash("sha256").update(readFileSync(source)).digest("hex");
  if (hash !== entry.sha256) throw new Error(`Artifact checksum mismatch: ${entry.name}`);
  const target = join(artifacts, `${hash}-${entry.filename}`);
  copyFileSync(source, target);
  return [entry.name, `file:${target.replaceAll("\\", "/")}`];
}));
const dependencies = {
  react: variant === "minimum" ? "18.2.0" : "19.2.8", "react-dom": variant === "minimum" ? "18.2.0" : "19.2.8", vue: variant === "minimum" ? "3.3.0" : "3.5.41", rxjs: "7.8.2",
  "@angular/core": "21.2.21", "@angular/common": "21.2.21", "@angular/compiler": "21.2.21", "@angular/platform-browser": "21.2.21",
  ...packed,
};
writeFileSync(join(directory, "package.json"), JSON.stringify({ name: "nodara-isolated-release-consumer", private: true, type: "module", dependencies }, null, 2));
const install = spawnSync(process.platform === "win32" ? "npm.cmd" : "npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund"], { cwd: directory, encoding: "utf8", shell: process.platform === "win32" });
if (install.status !== 0) throw new Error(install.stderr || "Consumer installation failed.");
console.log(install.stdout.trim());
for (const entry of manifest) {
  const installed = realpathSync(join(directory, "node_modules", entry.name));
  if (!installed.startsWith(realpathSync(join(directory, "node_modules")) + sep)) throw new Error(`Consumer resolved ${entry.name} outside its isolated installation.`);
  const actual = JSON.parse(readFileSync(join(installed, "package.json"), "utf8"));
  if (actual.version !== entry.version) throw new Error(`Wrong consumer version for ${entry.name}.`);
}
const angularRequire = createRequire(resolve(directory, "package.json"));
const shared = `
const events = [];
const selectionNames = ['taskSelect','pointSelect','nodeSelect','eventSelect'];
const callbackNames = ['onTaskSelect','onPointSelect','onNodeSelect','onEventSelect'];
const componentNames = {gantt:'Gantt',chart:'Chart',calendar:'Calendar',topology:'Topology',map:'GeoMap',diagram:'Diagram'};
const dataProp = kind => kind === 'chart' ? 'series' : kind === 'calendar' ? 'events' : 'data';
const host = document.getElementById('host');
`;
const sources = {
  react: `import React from 'react'; import {createRoot} from 'react-dom/client'; import {flushSync} from 'react-dom'; import * as components from '@nodara/react'; ${shared}
let root, kind, data, options;
function render(){flushSync(()=>root.render(React.createElement(components[componentNames[kind]],{[dataProp(kind)]:data,...options,style:{height:420},...Object.fromEntries(callbackNames.map(name=>[name,event=>events.push(event)]))})));}
window.__adapter={events,mount(k,d,o){kind=k;data=d;options=o;root=createRoot(host);render()},update(d){data=d;render()},setOptions(o){options=o;render()},setState(d,o){data=d;options=o;render()},destroy(){flushSync(()=>root.unmount())}};`,
  vue: `import {createApp,h,shallowReactive,nextTick} from 'vue'; import * as components from '@nodara/vue'; ${shared}
let app, state;
window.__adapter={events,async mount(kind,data,options){state=shallowReactive({data,options});app=createApp({render(){return h(components['Nodara'+componentNames[kind]],{[dataProp(kind)]:state.data,options:state.options,style:{height:'420px'},...Object.fromEntries(callbackNames.map(name=>[name,event=>events.push(event)]))})}});app.mount(host);await nextTick()},async update(data){state.data=data;await nextTick()},async setOptions(options){state.options=options;await nextTick()},async setState(data,options){state.data=data;state.options=options;await nextTick()},destroy(){app.unmount()}};`,
  angular: `import '@angular/compiler'; import {createApplication} from '@angular/platform-browser'; import {createComponent,provideZonelessChangeDetection} from '@angular/core'; import * as components from '@nodara/angular'; ${shared}
const app=await createApplication({providers:[provideZonelessChangeDetection()]});let ref,kind;
window.__adapter={events,mount(k,data,options){kind=k;ref=createComponent(components['Nodara'+componentNames[k]+'Component'],{hostElement:host,environmentInjector:app.injector});selectionNames.forEach(name=>ref.instance[name]?.subscribe(event=>events.push(event)));ref.setInput(dataProp(k),data);ref.setInput('options',options);app.attachView(ref.hostView);ref.changeDetectorRef.detectChanges()},update(data){ref.setInput(dataProp(kind),data);ref.changeDetectorRef.detectChanges()},setOptions(options){ref.setInput('options',options);ref.changeDetectorRef.detectChanges()},setState(data,options){ref.setInput(dataProp(kind),data);ref.setInput('options',options);ref.changeDetectorRef.detectChanges()},destroy(){app.detachView(ref.hostView);ref.destroy();app.destroy()}};`,
  'web-components': `import {defineNodaraElements} from '@nodara/web-components'; ${shared}
defineNodaraElements('runtime');let element;
window.__adapter={events,mount(kind,data,options){element=document.createElement('runtime-'+(kind==='map'?'geo-map':kind));element.style.height='420px';element.options=options;element.data=data;['task','point','node','event'].forEach(name=>element.addEventListener('nodara:'+name+'-select',event=>events.push(event.detail)));host.append(element)},update(data){element.data=data},setOptions(options){element.options=options},setState(data,options){element.setState(data,options)},destroy(){element.remove()}};`,
};
for (const [framework, source] of Object.entries(sources)) {
  const result = await build({ stdin: { contents: source, resolveDir: directory, sourcefile: `${framework}-consumer.mjs` }, bundle: true, format: "esm", platform: "browser", write: false, metafile: true, define: { "process.env.NODE_ENV": '"production"', __VUE_OPTIONS_API__: "true", __VUE_PROD_DEVTOOLS__: "false", __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: "false" }, plugins: [{ name: "isolated-runtime", setup(builder) { builder.onResolve({ filter: /^@angular\// }, args => ({ path: angularRequire.resolve(args.path) })); } }] });
  const installedRoot = realpathSync(join(directory, "node_modules"));
  for (const input of Object.keys(result.metafile.inputs)) {
    if (resolve(input) === resolve(directory, `${framework}-consumer.mjs`)) continue;
    const actual = realpathSync(resolve(input)); const rel = relative(installedRoot, actual);
    if (isAbsolute(rel) || rel.startsWith("..")) throw new Error(`${framework} silently resolved a dependency outside its isolated installation: ${input}`);
  }
  writeFileSync(resolve(directory, `${framework}-imports.json`), JSON.stringify(result.metafile, null, 2));
  writeFileSync(resolve(directory, `${framework}.js`), result.outputFiles[0].contents);
  console.log(`${framework}: ${result.outputFiles[0].contents.length} bytes`);
}
