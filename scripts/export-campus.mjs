import fs from 'node:fs';
import path from 'node:path';
import {createCanvas,Canvas,ImageData,Image} from '../outputs/render-tools/node_modules/@napi-rs/canvas/index.js';
globalThis.devicePixelRatio=1;globalThis.innerWidth=1280;globalThis.innerHeight=720;
globalThis.HTMLCanvasElement=Canvas;globalThis.ImageData=ImageData;
globalThis.document={createElement:()=>createCanvas(1,1),createElementNS:()=>createCanvas(1,1)};
const T=await import('../dist/vendor/three.module.js');
const {createCampus,labProps}=await import('../dist/campus.js');
const stub={setPixelRatio(){},shadowMap:{},capabilities:{getMaxAnisotropy:()=>1},setSize(){},render(scene){scene.updateMatrixWorld(true);}};
const treeFiles=['pine-a.png','pine-b.png','pine-c.png','fir-tree.png','small-tree.png'];
const forestTextures=treeFiles.map(name=>{const image=new Image();image.src=fs.readFileSync(new URL('../dist/assets/'+name,import.meta.url));const texture=new T.Texture(image);texture.colorSpace=T.SRGBColorSpace;texture.needsUpdate=true;return texture;});
const panoramaImage=new Image();panoramaImage.src=fs.readFileSync(new URL('../dist/assets/xanderklinge.jpg',import.meta.url));
const environmentTexture=new T.Texture(panoramaImage);environmentTexture.mapping=T.EquirectangularReflectionMapping;environmentTexture.colorSpace=T.SRGBColorSpace;environmentTexture.needsUpdate=true;
const input={addEventListener(){}};
const campus=createCampus(input,{film:true,rendererFactory:()=>stub,forestTextures,environmentTexture});
campus.scene.updateMatrixWorld(true);
const data={materials:{},meshes:[],textures:{},frames:[],imports:labProps};
for(let i=0;i<361;i++){campus.renderAt(i/360,i/12,{x:0,y:0},false);campus.camera.updateMatrixWorld(true);data.frames.push({position:campus.camera.position.toArray(),quaternion:campus.camera.quaternion.toArray()});}
let meshId=0;
campus.scene.traverse(object=>{
 if(!object.isMesh)return;
 const mat=object.material;if(Array.isArray(mat))return;
 if(!data.materials[mat.uuid]){
  data.materials[mat.uuid]={color:mat.color?.toArray()||[1,1,1],emissive:mat.emissive?.toArray()||[0,0,0],emissiveIntensity:mat.emissiveIntensity||0,metalness:mat.metalness||0,roughness:mat.roughness??.8,opacity:mat.opacity??1,basic:mat.isMeshBasicMaterial,transparent:mat.transparent,water:mat.userData.water===true,map:mat.map?.uuid};
  if(mat.map){
   const treeIndex=forestTextures.indexOf(mat.map);
   if(treeIndex>=0){const bytes=fs.readFileSync(new URL('../dist/assets/'+treeFiles[treeIndex],import.meta.url));data.textures[mat.map.uuid]={url:'data:image/png;base64,'+bytes.toString('base64'),repeat:mat.map.repeat.toArray()};}
   else {const image=mat.map.image,textureCanvas=createCanvas(image.width,image.height);textureCanvas.getContext('2d').drawImage(image,0,0);data.textures[mat.map.uuid]={url:textureCanvas.toDataURL('image/png'),repeat:mat.map.repeat.toArray()};}
  }
 }
 const geo=object.geometry,index=geo.index?.array,positions=geo.attributes.position.array;
 const entry={id:meshId++,geometry:geo.uuid,vertices:Array.from(positions),normals:geo.attributes.normal?Array.from(geo.attributes.normal.array):null,uv:geo.attributes.uv?Array.from(geo.attributes.uv.array):null,indices:index?Array.from(index):Array.from({length:positions.length/3},(_,i)=>i),material:mat.uuid,matrix:object.matrixWorld.toArray()};
 if(object.isInstancedMesh)entry.instances=Array.from(object.instanceMatrix.array).slice(0,object.count*16);
 data.meshes.push(entry);
});
fs.writeFileSync(new URL('../outputs/campus-scene.json',import.meta.url),JSON.stringify(data));
console.log(`Exported ${data.meshes.length} original meshes and ${data.frames.length} camera frames.`);
