import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
const root = path.resolve(import.meta.dirname, '..');
const out = path.join(root, 'snack');
const httpWeb = process.argv.includes('--http-web');
const write = (name, data) => { const dest = path.join(out, name); fs.mkdirSync(path.dirname(dest), {recursive:true}); fs.writeFileSync(dest, data); };
const walk = dir => fs.readdirSync(dir,{withFileTypes:true}).filter(e=>!['node_modules','runtime','.expo','dist'].includes(e.name)).flatMap(e => e.isDirectory() ? walk(path.join(dir,e.name)) : [path.join(dir,e.name)]);
// Generated copies only: the original application and its lockfile are untouched.
for (const file of walk(path.join(root,'src'))) {
  const rel = path.relative(root,file).replaceAll('\\','/');
  if (/\/tests?\/|\.(test|spec)\.|\.d\.ts$/.test(rel)) continue;
  let code = fs.readFileSync(file,'utf8');
  if(rel==='src/features/availability/model/use-unsaved-schedule-guard.ts') {
    code=code.replace("import { useEffect } from 'react';", "import { useEffect, useRef } from 'react';");
    code=code.replace("import { usePreventRemove } from 'expo-router/react-navigation';",'');
    code=code.replace(/  usePreventRemove\(dirty \|\| busy,[\s\S]*?\n  \}\);/, `  const allowed = useRef(false);
  useEffect(() => {
    allowed.current = false;
    return navigation.addListener('beforeRemove', (event: any) => {
      if (allowed.current || (!dirty && !busy)) return;
      event.preventDefault();
      if (busy) return;
      confirmScheduleDiscard(() => {
        allowed.current = true;
        navigation.dispatch(event.data.action);
      });
    });
  }, [navigation, dirty, busy]);`);
  }
  code=code.replace(/require\((['"])([^'"\n]+\.(?:png|jpe?g|gif|webp|mp4))\1\)/g,(_,quote,asset)=>{
    const assetPath=path.relative(root,path.resolve(path.dirname(file),asset)).replaceAll('\\','/');
    if(!assetPath.startsWith('assets/'))throw new Error(`Unexpected asset: ${asset}`);
    return `({ uri: ${JSON.stringify('https://raw.githubusercontent.com/Proj-Smart-Barber/Smart-Barber-frontend-mobile-web/99da9f8/'+assetPath)} })`;
  });
  code = code.replace(/(['"])@\/([^'"\n]+)\1/g, (_,quote,name) => {
    let relative=path.relative(path.dirname(file),path.join(root,'src',name)).replaceAll('\\','/');
    return quote+(relative.startsWith('.')?relative:'./'+relative)+quote;
  });
  if (rel==='src/shared/config/env.ts') {
    if (httpWeb) {
      code = code.replace('const SNACK_HTTP_WEB: boolean = false;', "const SNACK_HTTP_WEB: boolean = Platform.OS === 'web';");
    } else {
      code = code.replace('const DEFAULT_API_URL = \'https://api-black-theta-13.vercel.app\';', "const DEFAULT_API_URL = 'https://demo.invalid';");
    }
  }
  if (rel==='src/shared/api/http-client.ts') {
    code="import { demoRequest } from '../../../demo/transport';\n"+code;
    code=code.replace('    const url = this.buildUrl(path, params);', '    if (!ENV.SNACK_HTTP_WEB) return demoRequest(path, options) as Promise<T>;\n    const url = this.buildUrl(path, params);');
  }
  if (rel==='src/app/_layout.tsx') {
    code=code.replace("import React,", "import { DemoNotice } from '../../demo/DemoNotice';\nimport React,");
    code=code.replace('<AppReady />', '<><DemoNotice /><AppReady /></>');
  }
  write(rel,code);
}
for(const file of walk(path.join(root,'assets'))) {
  const rel=path.relative(root,file); const dest=path.join(out,rel);
  fs.mkdirSync(path.dirname(dest),{recursive:true}); fs.copyFileSync(file,dest);
}
for(const file of walk(path.join(root,'snack-support'))) write(path.relative(path.join(root,'snack-support'),file),fs.readFileSync(file));
const routes=walk(path.join(root,'src/app')).filter(f=>/\.tsx$/.test(f)&&!/[+]html|\.web\.tsx$/.test(f));
const mapping=routes.map(f=>{const key='./'+path.relative(path.join(root,'src/app'),f).replaceAll('\\','/'); return `  ${JSON.stringify(key)}: () => require(${JSON.stringify('./src/app/'+key.slice(2))}),`;}).join('\n');
write('App.tsx', `import React from 'react';\nimport { ExpoRoot } from 'expo-router';\nconst routes: Record<string, () => any> = {\n${mapping}\n};\nconst context = Object.assign((key: string) => routes[key](), { keys: () => Object.keys(routes), resolve: (key: string) => key, id: 'smart-barber-snack' });\nexport default function App() { return <ExpoRoot context={context as any} location={new URL('https://snack.local/')} />; }\n`);
write('index.js', "import { registerRootComponent } from 'expo';\nimport App from './App';\nregisterRootComponent(App);\n");
write('tsconfig.json', JSON.stringify({extends:'expo/tsconfig.base',compilerOptions:{strict:true,allowJs:true,skipLibCheck:true},include:['**/*.ts','**/*.tsx','**/*.js']},null,2));
console.log(`Generated ${routes.length} original routes in snack/.`);
// Snack's Babel parser rejects some valid TS 6 type syntax. Emit JS with JSX
// preserved, keeping the typed sources above available for audit and tests.
for(const file of walk(out).filter(f=>!f.includes(path.sep+'node_modules'+path.sep)&&!f.includes(path.sep+'runtime'+path.sep)&&/\.(ts|tsx)$/.test(f))) {
  const rel=path.relative(out,file).replaceAll('\\','/');
  if(rel==='src/app/+html.tsx')continue;
  const source=fs.readFileSync(file,'utf8').replace(/(['"])([^'"\n]+)\.(tsx?)\1/g,(_,q,p)=>q+p+'.js'+q);
  const output=ts.transpileModule(source,{fileName:file,compilerOptions:{target:ts.ScriptTarget.ES2019,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.Preserve}}).outputText.replaceAll('\r\n', '\n');
  write('runtime/'+rel.replace(/\.tsx?$/,'.js'),output);
}
const manifest=JSON.parse(fs.readFileSync(path.join(out,'package.json')));
manifest.dependencies['@hookform/resolvers/zod']=manifest.dependencies['@hookform/resolvers'];
manifest.dependencies['motion/react']=manifest.dependencies.motion;
delete manifest.devDependencies; delete manifest.scripts;delete manifest.main;
write('runtime/package.json',JSON.stringify(manifest,null,2));
const runtimeDescription = httpWeb
  ? 'Selecione Web no SDK 54. Use apenas uma conta de teste autorizada. A sessão termina ao expirar, ao recarregar ou ao sair deste preview.'
  : 'Importe esta pasta. SDK 54. Dados fictícios em memória. Senha Demo123!.';
write('runtime/README.md', `# Smart Barber — Snack\n${runtimeDescription}\nConsulte ../../docs/EXPO_SNACK.md.\n`);
const unusedHtml=path.join(out,'runtime/src/app/+html.js');
if(fs.existsSync(unusedHtml))fs.unlinkSync(unusedHtml);
console.log('Emitted Snack runtime JavaScript.');
