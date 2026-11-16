import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
const root=path.resolve(import.meta.dirname,'../snack/runtime');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const files=walk(root).filter(f=>f.endsWith('.js'));
const errors=[];
for(const file of files){
 const source=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.JSX);
 for(const diagnostic of source.parseDiagnostics)errors.push(`${path.relative(root,file)}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText,' ')}`);
 const visit=node=>{
  let name;
  if((ts.isImportDeclaration(node)||ts.isExportDeclaration(node))&&node.moduleSpecifier&&ts.isStringLiteral(node.moduleSpecifier))name=node.moduleSpecifier.text;
  if(ts.isCallExpression(node)&&node.expression.getText(source)==='require'&&node.arguments[0]&&ts.isStringLiteral(node.arguments[0]))name=node.arguments[0].text;
  if(name?.startsWith('.')){
   const target=path.resolve(path.dirname(file),name);
   if(!['','.js','.web.js','.native.js','/index.js'].some(s=>fs.existsSync(target+s)&&fs.statSync(target+s).isFile()))errors.push(`${path.relative(root,file)} -> ${name}`);
  }
  ts.forEachChild(node,visit);
 };
 visit(source);
}
if(errors.length){console.error(errors.join('\n'));process.exit(1);}
console.log(`${files.length} JavaScript modules parsed; all relative imports resolved.`);
