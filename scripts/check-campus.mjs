// Exercise the real glTF loader and complete scene graph without a GPU/browser.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createCanvas,Canvas,ImageData,Image,loadImage} from '../outputs/render-tools/node_modules/@napi-rs/canvas/index.js';
import * as T from '../dist/vendor/three.module.js';
import {createCampus,labProps} from '../dist/campus.js';
globalThis.devicePixelRatio=1;globalThis.innerWidth=1280;globalThis.innerHeight=720;
globalThis.HTMLCanvasElement=Canvas;globalThis.ImageData=ImageData;globalThis.self=globalThis;
globalThis.document={createElement:()=>createCanvas(1,1),createElementNS:()=>createCanvas(1,1)};
globalThis.createImageBitmap=async blob=>loadImage(Buffer.from(await blob.arrayBuffer()));
globalThis.ProgressEvent=class{constructor(type,options){this.type=type;Object.assign(this,options);}};
const NativeRequest=globalThis.Request;
globalThis.Request=class extends NativeRequest{constructor(url,options){super(typeof url==='string'?new URL(url,'http://127.0.0.1:8095/'):url,options);}};
// Match browser connection limits rather than opening dozens of TCP connections.
const nativeFetch=globalThis.fetch;let active=0;const waiting=[];
globalThis.fetch=async (...args)=>{
  if(active>=4)await new Promise(resolve=>waiting.push(resolve));
  active++;
  try{
    if(typeof args[0]==='string')args[0]=new URL(args[0],'http://127.0.0.1:8095/');
    const response=await nativeFetch(...args);return new Response(await response.arrayBuffer(),{status:response.status,headers:response.headers});
  }
  finally{active--;waiting.shift()?.();}
};
const imageTexture=file=>{const image=new Image();image.src=fs.readFileSync(new URL('../dist/assets/'+file,import.meta.url));return new T.Texture(image);};
const forestTextures=['pine-a.png','pine-b.png','pine-c.png','fir-tree.png','small-tree.png'].map(imageTexture);
const renderer={setPixelRatio(){},shadowMap:{},capabilities:{getMaxAnisotropy:()=>1},setSize(){},render(scene){scene.updateMatrixWorld(true);}};
const campus=createCampus({addEventListener(){}},{rendererFactory:()=>renderer,forestTextures,environmentTexture:imageTexture('xanderklinge.jpg')});
const timeout=setTimeout(()=>{console.error('Asset loading timed out');process.exit(1);},30000);
const result=await campus.ready;clearTimeout(timeout);
assert.deepEqual(result.errors,[],'Every model and texture must load');
const lab=campus.scene.getObjectByName('Living Systems Research Lab');
for(const prop of labProps){
  const match=lab.children.find(object=>object.name===prop.file&&Math.abs(object.position.x-prop.x)<.001&&Math.abs(object.position.z-prop.z)<.001);
  assert.ok(match,`Missing prop: ${prop.file}`);
  const bounds=new T.Box3().setFromObject(match);
  assert.ok(Number.isFinite(bounds.min.x)&&bounds.max.y>bounds.min.y,`Invalid model bounds: ${prop.file}`);
}
for(let i=0;i<=100;i++){
  campus.renderAt(i/100,i/3);
  assert.ok(campus.camera.position.toArray().every(Number.isFinite),'Camera path must remain finite');
}
assert.equal(campus.labRobots.length,1,'The detailed robot must load');
assert.deepEqual(campus.labRobots[0].clipNames,['Walk','Run','Idle','Look around','Intro']);
assert.ok(campus.expressiveRobots.length >= 2, 'Expressive robots must load in lab and studio');
assert.ok(campus.expressiveRobots[0].actions.Wave, 'Expressive robot must have Wave clip');
assert.ok(campus.expressiveRobots[0].actions.Dance, 'Expressive robot must have Dance clip');
assert.ok(campus.expressiveRobots[0].actions.ThumbsUp, 'Expressive robot must have ThumbsUp clip');
assert.ok(campus.expressiveRobots[0].actions.Jump, 'Expressive robot must have Jump clip');
const robot=campus.scene.getObjectByName('Sprout Research Robot');
let skin;robot.traverse(object=>{if(object.isSkinnedMesh)skin=object;});
assert.ok(skin?.skeleton.bones.length>10,'Robot must have a real skeleton');
campus.renderAt(.26,0);
const before=skin.skeleton.bones.map(bone=>bone.matrixWorld.toArray());
campus.renderAt(.26,.8);
assert.ok(skin.skeleton.bones.some((bone,i)=>bone.matrixWorld.toArray().some((value,j)=>Math.abs(value-before[i][j])>.0001)),'Robot animation must move the skeleton');
let meshes=0;campus.scene.traverse(object=>{if(object.isMesh)meshes++;});
console.log(`PASS: ${labProps.length} lab props, all model/texture loads, 101 camera poses, ${meshes} scene meshes, 5 robot clips and animated skeleton.`);
