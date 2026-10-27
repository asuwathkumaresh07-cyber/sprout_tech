import * as T from './vendor/three.module.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import * as SkeletonUtils from './vendor/SkeletonUtils.js';

// Shared with the offline renderer: local placement in the research pavilion.
export const labProps=[
  {file:'microscope/industrial_microscope_1k.gltf',x:-5.5,y:1.14,z:-1.6,size:1.12,yaw:.55},
  {file:'microscope/industrial_microscope_1k.gltf',x:-4.4,y:.92,z:-4.5,size:.82,yaw:.2},
  {file:'kenney-laptop.glb',x:4.25,y:1.14,z:-1.95,size:.95,axis:'x',yaw:-.18},
  {file:'kenney-stoolbar.glb',x:-5.1,y:.31,z:.5,size:.84},
  {file:'kenney-stoolbar.glb',x:5.3,y:.31,z:.25,size:.84},
  {file:'kenney-chairdesk.glb',x:6.8,y:.31,z:-3.1,size:1.2,yaw:-.5},
  {file:'kenney-kitchenfridge.glb',x:7.65,y:.31,z:-5.35,size:2.1,yaw:-.15},
  {file:'kenney-bookcaseopen.glb',x:-7.65,y:.31,z:-3.9,size:2.5,yaw:.4},
  {file:'kenney-pottedplant.glb',x:-7.7,y:.31,z:2.5,size:1.8},
  {file:'kenney-pottedplant.glb',x:7.6,y:.31,z:2.5,size:1.8},
  {file:'kenney-books.glb',x:-6.5,y:1.14,z:-1.6,size:.58,axis:'x',yaw:.2},
  ...Array.from({length:18},(_,i)=>({file:'kenney-kitchencabinetdrawer.glb',x:-5.95+i*.7,y:.31,z:-4.25,size:.7,axis:'x'})),
  {file:'kenney-laptop.glb',x:2.6,y:.92,z:-4.5,size:.85,axis:'x',yaw:.12},
  ...[
    ['bottle_glassware_beaker_medium',-5.25,.67],['bottle_glassware_test_tube_small',-3.25,.7],
    ['heating_equipment_bunsen_burner',-1.15,.72],['machine_hot_plate',1.05,.78],
    ['funnel_buret',3.15,.82],['bottle_dropper',5.15,.68]
  ].map(([file,x,size])=>({file:`lab-${file}.glb`,x,y:.92,z:-4.38,size}))
];

/** Sprout Tech environment with locally stored, attributed animated 3D assets. */
export function createCampus(canvas,{film=false,rendererFactory,forestTextures:providedForestTextures,environmentTexture}={}) {
  const renderer=rendererFactory?rendererFactory():new T.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:film,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,film?1:1.5));
  renderer.outputColorSpace=T.SRGBColorSpace;
  renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  const scene=new T.Scene();scene.background=new T.Color('#c1d4c0');scene.fog=new T.FogExp2('#b5cbb3',.013);
  if(environmentTexture){environmentTexture.mapping=T.EquirectangularReflectionMapping;scene.environment=environmentTexture;scene.environmentIntensity=.48;}
  else new T.TextureLoader().load('./assets/xanderklinge.jpg',map=>{map.mapping=T.EquirectangularReflectionMapping;scene.environment=map;scene.environmentIntensity=.48;});
  const camera=new T.PerspectiveCamera(55,1,.1,220);
  const sky=new T.HemisphereLight('#e4f0da','#384732',2.5);scene.add(sky);
  const sun=new T.DirectionalLight('#fff1c4',3.5);sun.position.set(-16,29,12);sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-32;sun.shadow.camera.right=32;sun.shadow.camera.top=34;sun.shadow.camera.bottom=-34;sun.shadow.camera.far=90;sun.shadow.normalBias=.035;scene.add(sun);scene.add(sun.target);
  const material=(color,extra={})=>new T.MeshStandardMaterial({color,roughness:.8,...extra});
  const mats={wood:material('#78634a',{roughness:.64}),darkWood:material('#283631',{roughness:.38}),lightWood:material('#c0ac87',{roughness:.4}),floor:material('#aaa899',{roughness:.52}),metal:material('#263f39',{metalness:.65,roughness:.24}),white:material('#d7d8c9',{roughness:.33}),soil:material('#243d31',{roughness:.9}),black:material('#142e29'),leaf:material('#456c3a'),fern:material('#68884b'),glass:material('#99bfaf',{transparent:true,opacity:.16,metalness:.2,roughness:.1,depthWrite:false}),warm:material('#e6d19e',{emissive:'#e6bd6d',emissiveIntensity:.7})};
  const boxGeo=new T.BoxGeometry(1,1,1);
  function box(x,y,z,w,h,d,mat,parent=scene){const mesh=new T.Mesh(boxGeo,mat);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
  function cylinder(x,y,z,r,h,mat,parent=scene,top=r){const m=new T.Mesh(new T.CylinderGeometry(top,r,h,10),mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
  function texture(width,height,draw){const c=document.createElement('canvas');c.width=width;c.height=height;draw(c.getContext('2d'),width,height);const tx=new T.CanvasTexture(c);tx.colorSpace=T.SRGBColorSpace;tx.anisotropy=renderer.capabilities.getMaxAnisotropy();return tx;}
  function textPanel(text,sub,width=4,height=1,bg='#1e3b30',ink='#e8e9ce'){
    const tx=texture(1024,Math.round(1024*height/width),(c,w,h)=>{c.fillStyle=bg;c.fillRect(0,0,w,h);c.fillStyle=ink;c.font=`500 ${Math.round(h*.30)}px sans-serif`;c.fillText(text,w*.07,h*.49);c.font=`${Math.round(h*.11)}px sans-serif`;c.fillStyle='#b7cbab';c.fillText(sub,w*.075,h*.77);});
    return new T.Mesh(new T.PlaneGeometry(width,height),new T.MeshBasicMaterial({map:tx}));
  }
  function sign(text,sub,x,y,z,w=4,h=1,parent=scene){const m=textPanel(text,sub,w,h);m.position.set(x,y,z);parent.add(m);return m;}
  // Procedural moss and leaf litter, without any external image assets.
  let rng=845;const random=()=>{rng=(rng*16807)%2147483647;return(rng-1)/2147483646;};
  const groundMap=texture(512,512,(c,w,h)=>{c.fillStyle='#526044';c.fillRect(0,0,w,h);for(let i=0;i<18000;i++){const shade=Math.round(45+random()*55);c.fillStyle=`rgba(${shade},${shade+14},${shade-12},.35)`;c.fillRect(random()*w,random()*h,1+random()*5,1+random()*3);}});groundMap.wrapS=groundMap.wrapT=T.RepeatWrapping;groundMap.repeat.set(35,35);
  const ground=new T.Mesh(new T.PlaneGeometry(240,240),material('#b4c19c',{map:groundMap}));ground.rotation.x=-Math.PI/2;ground.position.set(0,-.10,-32);ground.receiveShadow=true;scene.add(ground);

  // The paved walk and camera use the same control points, so the route always
  // remains under the visitor through every turn and room transition.
  // Leave the arrival pavilion through the centered rear doorway before
  // turning toward the lab. This keeps the visitor inside the real opening.
  const routePoints=[[0,22],[0,8],[0,.6],[0,-9],[-6,-10],[-8,-13.2],[-7,-17],[-.5,-16],[7,-17],[9,-30],[9,-34],[9,-38],[9,-42],[6,-44],[2,-46],[1,-50],[0,-54],[0,-62],[1,-70]];
  const pathCurve=new T.CatmullRomCurve3(routePoints.map(([x,z])=>new T.Vector3(x,.015,z)));
  const dummy=new T.Object3D();
  // A continuous, wide boardwalk follows the same exact camera spline.
  const plankCount=Math.ceil(pathCurve.getLength()/.37);
  const plankTotal=plankCount+1,accentCount=Math.ceil(plankTotal/5);
  const regularPlanks=new T.InstancedMesh(boxGeo,mats.wood,plankTotal-accentCount),accentPlanks=new T.InstancedMesh(boxGeo,mats.lightWood,accentCount);
  let regularIndex=0,accentIndex=0;
  for(let i=0;i<=plankCount;i++){
    const t=i/plankCount,p=pathCurve.getPoint(t),dir=pathCurve.getTangent(t),accent=i%5===0;
    dummy.position.set(p.x,.015,p.z);dummy.rotation.set(0,Math.atan2(dir.x,dir.z),0);dummy.scale.set(5.8,.12,.37);dummy.updateMatrix();
    (accent?accentPlanks:regularPlanks).setMatrixAt(accent?accentIndex++:regularIndex++,dummy.matrix);
  }
  for(const mesh of [regularPlanks,accentPlanks]){mesh.instanceMatrix.needsUpdate=true;mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;scene.add(mesh);}
  // Low, rough stone edging marks the trail only through outdoor connectors;
  // it stops at each pavilion threshold so the doors and aisles stay open.
  const pathBorderMaterial=material('#626b5d',{roughness:.95});
  const pathBorderStone=new T.DodecahedronGeometry(.48,1);
  for(const [start,end] of [[.455,.475],[.94,.975]]){
    for(let t=start;t<=end;t+=.009){
      const p=pathCurve.getPoint(t),dir=pathCurve.getTangent(t),bank=new T.Vector3(dir.z,0,-dir.x).normalize();
      for(const side of [-1,1]){
        const stone=new T.Mesh(pathBorderStone,pathBorderMaterial);
        stone.position.set(p.x+bank.x*side*3.5,.24,p.z+bank.z*side*3.5);
        stone.scale.set(.95+random()*.5,.66+random()*.38,1.12+random()*.6);
        stone.rotation.set((random()-.5)*.16,random()*6.28,(random()-.5)*.16);
        stone.castShadow=true;stone.receiveShadow=true;scene.add(stone);
      }
    }
  }
  // CC0 Poly Haven tree photography is rendered as crossed, softly animated
  // forest impostors. This preserves leaf detail without shipping a 900 MB model.
  const treeFiles=['pine-a.png','pine-b.png','pine-c.png','fir-tree.png','small-tree.png'];
  const treeLoader=new T.TextureLoader();
  const treeTextures=treeFiles.map((file,index)=>{const map=providedForestTextures?.[index]||treeLoader.load(`./assets/${file}`);map.colorSpace=T.SRGBColorSpace;map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return map;});
  const treeMaterials=treeTextures.map(map=>new T.MeshBasicMaterial({map,transparent:true,alphaTest:.035,side:T.DoubleSide,depthWrite:false,toneMapped:true}));
  const treeCards=[];
  const treeGeometry=new T.PlaneGeometry(1,1),treeDummy=new T.Object3D();
  function plantForestTree(x,z,height,type,yaw=random()*Math.PI){
    const index=type%treeMaterials.length;
    const imageSize=treeTextures[index].image;
    const width=height*(imageSize?.width||.43*height)/(imageSize?.height||height);
    if(!treeBatches[index])treeBatches[index]=new T.InstancedMesh(treeGeometry,treeMaterials[index],treeCounts[index]*3);
    const batch=treeBatches[index],slot=treeCursor[index]++;
    batch.setMatrixAt(slot*3,new T.Matrix4());
    for(let side=0;side<3;side++){
      treeDummy.position.set(x,height/2,z);treeDummy.rotation.set(0,yaw+side*Math.PI/3,0);treeDummy.scale.set(width,height,1);treeDummy.updateMatrix();
      batch.setMatrixAt(slot*3+side,treeDummy.matrix);
    }
    treeCards.push({x,z,height,width,yaw,index,slot,phase:random()*6.28,amount:.008+random()*.018});
  }
  const trees=[];
  const routeSamples=Array.from({length:180},(_,i)=>pathCurve.getPoint(i/179));
  const treeClear=(x,z,minimum=14)=>routeSamples.every(point=>Math.hypot(x-point.x,z-point.z)>minimum);
  for(let i=0;i<300;i++){
    const t=random(),p=pathCurve.getPoint(t),dir=pathCurve.getTangent(t),side=i%2?1:-1;
    const distance=16+random()*12;
    const x=p.x+dir.z*distance*side,z=p.z-dir.x*distance*side;
    if(treeClear(x,z))trees.push({x,z,h:15+random()*11,type:Math.floor(random()*5)});
  }
  for(let i=0,tries=0;i<130&&tries<1200;tries++){
    const x=(random()-.5)*102,z=34-random()*140;
    if(treeClear(x,z,18)){trees.push({x,z,h:16+random()*13,type:Math.floor(random()*5)});i++;}
  }
  const treeCounts=treeMaterials.map((_,i)=>trees.filter(tree=>tree.type===i).length),treeCursor=treeMaterials.map(()=>0),treeBatches=[];
  trees.forEach(tree=>plantForestTree(tree.x,tree.z,tree.h,tree.type));
  treeBatches.forEach(batch=>{batch.instanceMatrix.needsUpdate=true;batch.frustumCulled=false;scene.add(batch);});
  // Ferns planted along the edges of the path with reactive wind sway data.
  const frondGeo=new T.SphereGeometry(1,6,4);frondGeo.scale(.12,.04,.7);
  const fernCount=650;
  const fernMesh=new T.InstancedMesh(frondGeo,mats.fern,fernCount);
  const fernData=[];
  for(let i=0;i<fernCount;i++){
    const t=random(),p=pathCurve.getPoint(t),dir=pathCurve.getTangent(t),side=i%2?1:-1,r=3.5+random()*3.1;
    const fx=p.x+dir.z*r*side,fy=.14+random()*.16,fz=p.z-dir.x*r*side;
    const s=.52+random()*.58;
    const rx=random()*.45,ry=random()*6.28,rz=random()*.18;
    dummy.position.set(fx,fy,fz);dummy.scale.setScalar(s);dummy.rotation.set(rx,ry,rz);dummy.updateMatrix();
    fernMesh.setMatrixAt(i,dummy.matrix);
    fernData.push({x:fx,y:fy,z:fz,s,rx,ry,rz,phase:random()*6.28});
  }
  scene.add(fernMesh);

  // Dynamic forest leaves fluttering and drifting through the canopy along the trail.
  const leafCount=280;
  const leafGeo=new T.PlaneGeometry(.22,.32,1,2);
  const leafColors=['#5fa66d','#437549','#d49b38','#ba7b2c','#88ad56'];
  const leafMat=new T.MeshBasicMaterial({color:'#ffffff',side:T.DoubleSide,transparent:true,opacity:.85,depthWrite:false});
  const leafMesh=new T.InstancedMesh(leafGeo,leafMat,leafCount);
  const leafParticles=[];
  const leafDummy=new T.Object3D();
  for(let i=0;i<leafCount;i++){
    const t=random(),p=pathCurve.getPoint(t);
    const x=p.x+(random()-.5)*38,z=p.z+(random()-.5)*38;
    const y=2+random()*13;
    const fallSpeed=.65+random()*.85;
    const swirlRadius=.35+random()*.75;
    const swirlFreq=1.8+random()*2.2;
    const tumbleSpeedX=1.8+random()*3.2;
    const tumbleSpeedY=1.4+random()*2.4;
    const scale=.55+random()*.65;
    const phase=random()*6.28;
    leafParticles.push({x,y,z,fallSpeed,swirlRadius,swirlFreq,tumbleSpeedX,tumbleSpeedY,scale,phase,pathT:t});
    leafMesh.setColorAt(i,new T.Color(leafColors[Math.floor(random()*leafColors.length)]));
    leafDummy.position.set(x,y,z);leafDummy.scale.setScalar(scale);leafDummy.updateMatrix();
    leafMesh.setMatrixAt(i,leafDummy.matrix);
  }
  if(leafMesh.instanceColor)leafMesh.instanceColor.needsUpdate=true;
  leafMesh.instanceMatrix.needsUpdate=true;leafMesh.frustumCulled=false;scene.add(leafMesh);

  // Volumetric sunbeams streaming through canopy openings towards the trail.
  const sunbeamGeo=new T.CylinderGeometry(.4,2.2,20,12,1,true);
  const sunbeamMat=new T.MeshBasicMaterial({color:'#fff8dc',transparent:true,opacity:.09,blending:T.AdditiveBlending,side:T.DoubleSide,depthWrite:false});
  const sunbeams=[];
  const beamPositions=[[-3.5,8,-6],[4.5,8,-12],[-10.5,8,-22],[7.5,8,-26],[2.8,8,-42],[-4.5,8,-50],[8.2,8,-58],[11.5,8,-45]];
  beamPositions.forEach(([bx,by,bz],i)=>{
    const beam=new T.Mesh(sunbeamGeo,sunbeamMat.clone());
    beam.position.set(bx,by,bz);beam.rotation.set(-.46,0,.34);scene.add(beam);
    sunbeams.push({beam,phase:i*.92,baseOpacity:.085+(i%3)*.025});
  });

  function plant(x,z,size=1,parent=scene){
    cylinder(x,.24*size,z,.27*size,.48*size,mats.white,parent,.32*size);
    for(let j=0;j<7;j++){const a=j*2.399;const leaf=new T.Mesh(frondGeo,j%2?mats.leaf:mats.fern);leaf.position.set(x+Math.sin(a)*.18*size,.65*size+j*.06*size,z+Math.cos(a)*.18*size);leaf.scale.set(size,size,size);leaf.rotation.set(-.6,a,.4);parent.add(leaf);}
  }
  function pavilion(x,z,width,depth,name,sub,doorWidth=3.8){
    const g=new T.Group();g.position.set(x,0,z);g.scale.set(1.48,1.32,1.48);scene.add(g);
    box(0,.12,0,width,.3,depth,mats.floor,g);
    box(0,3.83,0,width+.75,.32,depth+.75,mats.darkWood,g);
    box(0,4.02,0,width+.48,.10,depth+.48,mats.wood,g);
    for(let i=0;i<9;i++)box(-width/2+i*width/8,3.62,0,.075,.12,depth,mats.metal,g);
    for(const sx of [-1,1])for(const sz of [-1,1])box(sx*(width/2-.25),1.95,sz*(depth/2-.25),.13,3.6,.13,mats.metal,g);
    // Rear wall and cedar fins; entrance and side exits stay open to the route.
    for(const sx of [-1,1])box(sx*(width+doorWidth)/4,1.95,-depth/2+.13,(width-doorWidth)/2,3.55,.18,mats.darkWood,g);
    for(let i=0;i<Math.floor(width/.25);i++){const x=-width/2+i*.25;if(Math.abs(x)>doorWidth/2)box(x,1.95,-depth/2+.25,.11,3.4,.12,mats.wood,g);}
    for(const sx of [-1,1]){box(sx*width/2,2,-depth*.28,.055,3.3,depth*.4,mats.metal,g);box(sx*width*.29,2,-depth*.28,.035,3.15,depth*.4,mats.glass,g);}
    sign(name,sub,0,2.65,-depth/2+.40,Math.min(6,width-2),1.1,g);
    box(0,3.51,0,width-1,.035,.08,mats.warm,g);
    plant(-width/2+1,depth/2-1,1.3,g);plant(width/2-1,depth/2-1,1.3,g);
    return g;
  }
  // 00 — Arrival. Welcome signage and open-air reception.
  const welcome=pavilion(0,0,13,10,'sprout tech','NATURE-INSPIRED. HUMAN-CENTERED.',6.8);
  box(3.8,.75,-.6,3.3,1.3,1.1,mats.wood,welcome);box(3.8,1.45,-.6,3.5,.10,1.3,mats.white,welcome);
  sign('WELCOME','YOUR NEXT CHAPTER STARTS HERE',3.8,1.05,.01,2.5,.6,welcome);
  for(const x of [-2.3,2.3]){box(x,2.4,10.2,.18,4.8,.18,mats.darkWood);box(x,4.8,10.2,.4,.1,.4,mats.warm);}
  box(0,4.55,10.2,5,.15,.2,mats.darkWood);
  sign('SPROUT TECH','A DIFFERENT PATH FORWARD',0,3.55,10.35,4.5,1);

  // 01 — Research lab. Models, strategy board and experiments.
  const lab=pavilion(-8,-18,18,14,'01 / RESEARCH LAB','DISCOVER. QUESTION. EXPERIMENT.');
  // Keep the wide visitor aisle open; real lab equipment lines the back bench.
  box(0,.40,-5.1,12.4,.78,.4,mats.darkWood,lab);
  box(0,.85,-4.55,12.8,.13,1.82,mats.white,lab);
  for(const x of [-5.5,-2.2,2.2,5.5])box(x,.015,-4.55,.08,.035,1.74,mats.metal,lab);
  const labSign=sign('LIVING SYSTEMS LAB','OBSERVE  /  PROTOTYPE  /  LEARN',0,2.55,-6.72,6.5,1.0,lab);
  labSign.rotation.y=0;
  lab.name='Living Systems Research Lab';
  const labStone=material('#d6dcd7',{roughness:.48});
  const labTeal=material('#294a46',{roughness:.44,metalness:.12});
  const labSteel=material('#a6bab4',{roughness:.28,metalness:.78});
  const labLight=material('#dcfff2',{emissive:'#b1efdc',emissiveIntensity:1.8});
  // A fitted interior: porcelain tiles, a dark feature wall, and suspended task lights.
  box(0,.285,0,17.7,.035,13.7,labStone,lab);
  const grout=material('#a5b5af',{roughness:.8});
  for(let x=-8;x<=8;x+=2)box(x,.306,0,.018,.008,13.6,grout,lab);
  for(let z=-6;z<=6;z+=2)box(0,.306,z,17.6,.008,.018,grout,lab);
  box(0,1.8,-6.45,17.5,3,.1,labTeal,lab);
  box(0,3.34,-6.32,17.2,.035,.04,labLight,lab);
  labSign.position.set(0,2.7,-6.3);
  for(const x of [-4.8,4.8])for(const z of [-1.7,-4.5]){
    box(x,3.28,z,4.1,.10,.42,mats.metal,lab);
    box(x,3.22,z,3.85,.025,.32,labLight,lab);
    for(const end of [-1,1])box(x+end*1.65,3.48,z,.018,.36,.018,labSteel,lab);
  }
  const fill=new T.PointLight('#d4f8ec',45,21,1.5);fill.position.set(0,3,-3);lab.add(fill);
  const labLeft=box(-8.75,1.95,0,.06,3.5,13.3,labTeal,lab);
  const labRight=box(8.75,1.95,0,.06,3.5,13.3,labTeal,lab);
  for(const wall of [labLeft,labRight])wall.receiveShadow=true;
  // Ceiling slats frame the open entrance and let the interior lights read clearly.
  box(0,3.92,0,18,.12,14,mats.darkWood,lab);
  for(let i=0;i<29;i++)box(-8.6+i*.615,3.995,0,.045,.035,13.8,labSteel,lab);
  // The left island is the hero workstation on the visitor's side of the aisle.
  function labBench(x,z,w,d){
    box(x,.68,z,w, .73,d,labTeal,lab);
    box(x,1.08,z,w+.14,.12,d+.14,labStone,lab);
    box(x,.34,z,w-.15,.07,d-.1,mats.black,lab);
    box(x,.97,z+d/2+.015,w-.15,.025,.025,labLight,lab);
    for(let i=0;i<3;i++){
      const dx=x-w*.33+i*w*.33;
      box(dx,.69,z+d/2+.025,w*.31,.53,.035,labTeal,lab);
      box(dx,.84,z+d/2+.055,.42,.025,.035,labSteel,lab);
    }
  }
  labBench(-4.9,-1.6,4.8,1.65);
  labBench(5.35,-1.9,4.15,1.65);
  sign('01 / MICROSCOPY','LOOK CLOSER. FIND SOMETHING NEW.',-4.9,.64,-.74,3.7,.38,lab);
  sign('02 / PROTOTYPING','FROM OBSERVATION TO POSSIBILITY.',5.35,.64,-1.04,3.35,.38,lab);
  // Sample trays and colored media give the imported glassware a useful context.
  const media=[material('#58bb97',{roughness:.2,metalness:.15}),material('#d5a953',{roughness:.23})];
  for(const [x,z] of [[-3.65,-1.4],[6.4,-1.7]]){
    box(x,1.16,z,.92,.045,.65,labSteel,lab);
    for(let i=0;i<3;i++){
      cylinder(x-.28+i*.28,1.205,z,.105,.055,media[i%2],lab);
      cylinder(x-.28+i*.28,1.24,z,.12,.025,mats.glass,lab);
    }
  }
  // A sample shelf, a safety station, and plant specimens complete the room.
  for(const y of [1.55,2.12]){
    box(-6.35,y,-5.95,3.4,.07,.65,labStone,lab);
    for(let i=0;i<6;i++){
      cylinder(-7.65+i*.50,y+.17,-5.95,.12,.28,i%2?mats.white:media[0],lab);
      cylinder(-7.65+i*.50,y+.33,-5.95,.13,.045,mats.black,lab);
    }
  }
  box(8.25,1.8,1.5,.12,.72,.62,mats.white,lab);
  box(8.16,1.8,1.5,.025,.40,.12,media[0],lab);
  box(8.15,1.8,1.5,.025,.12,.4,media[0],lab);
  sign('LIVING COLLECTION','SAMPLES / 024',-5.8,2.59,-6.20,3.4,.45,lab);
  sign('RESEARCH NOTEBOOK','FIELD STUDY / 01',5.45,2.57,-6.20,3.6,.48,lab);
  // 02 — Development studio. Monitors are original canvas interface designs.
  const studio=pavilion(9,-34,14,11,'02 / BUILD STUDIO','DESIGN WITH INTENT. BUILD WITH CARE.');
  const studioFloor=material('#cad1c1',{roughness:.54});
  box(0,.29,0,13.3,.035,10.3,studioFloor,studio);
  const studioAccent=material('#b6a483',{roughness:.46});
  for(let z=-4.8;z<=4.8;z+=1.2)box(0,.315,z,13.1,.01,.018,studioAccent,studio);
  for(let x=-6;x<=6;x+=1.2)box(x,.315,0,.018,.01,9.6,studioAccent,studio);
  box(0,3.48,0,13.2,.08,10.3,mats.darkWood,studio);
  for(const x of [-4.8,0,4.8]){
    box(x,3.55,-1,2.9,.06,.38,mats.metal,studio);
    box(x,3.50,-1,2.7,.025,.30,labLight,studio);
    const studioLight=new T.PointLight('#e1f6d9',22,8,1.6);studioLight.position.set(x,2.9,-1);studio.add(studioLight);
  }
  function interfaceTexture(kind){return texture(1024,640,(c,w,h)=>{
    c.fillStyle=kind==='code'?'#132721':'#e6e8d7';c.fillRect(0,0,w,h);
    c.fillStyle=kind==='code'?'#223d31':'#c3cdb0';c.fillRect(0,0,w,48);
    c.fillStyle=kind==='code'?'#bdd492':'#304b37';c.font='bold 18px sans-serif';c.fillText(kind==='code'?'SPROUT / build.js':'FERN & FORM',30,31);
    if(kind==='code'){const lines=['const experience = {','  purpose: "human",','  design: "thoughtful",','  builtWith: "care",','};','','function bringToLife(idea) {','  return craft(idea)','    .connect(people)','    .growWith(business);','}'];c.font='23px monospace';lines.forEach((s,i)=>{c.fillStyle=i%3===0?'#b7d286':'#94bca7';c.fillText(s,48,105+i*39);});}
    else{c.fillStyle='#2a4a35';c.font='58px Georgia';c.fillText('A little closer',70,160);c.fillText('to nature.',70,222);c.fillStyle='#93a976';c.beginPath();c.ellipse(770,225,100,155,-.5,0,6.28);c.fill();for(let i=0;i<3;i++){c.fillStyle=['#cbd4b5','#b8c69c','#d7dcca'][i];c.fillRect(60+i*320,360,285,190);c.fillStyle='#48613d';c.fillRect(80+i*320,570,160,7);}}
  });}
  function monitor(x,y,z,tx,parent=scene,w=2.5){box(x,y,z,w+.12,w*.625+.12,.12,mats.black,parent);const screen=new T.Mesh(new T.PlaneGeometry(w,w*.625),new T.MeshBasicMaterial({map:tx}));screen.position.set(x,y,z+.067);parent.add(screen);box(x,y-.9,z,.08,.5,.1,mats.metal,parent);box(x,y-1.1,z,.8,.04,.4,mats.metal,parent);return screen;}
  const codeTx=interfaceTexture('code'),siteTx=interfaceTexture('site');
  const travelTx=texture(1024,640,(c,w,h)=>{const sky=c.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#a8bd9c');sky.addColorStop(1,'#345a46');c.fillStyle=sky;c.fillRect(0,0,w,h);for(let i=0;i<22;i++){const x=i*58-50;c.fillStyle=i%2?'#284b3b':'#496d4d';c.fillRect(x,0,12+i%3*4,h);c.beginPath();c.moveTo(x-55,280);c.lineTo(x+6,20+i%3*30);c.lineTo(x+70,280);c.fill();}c.fillStyle='#eef0d9';c.font='bold 20px sans-serif';c.fillText('FIELDNOTES',50,50);c.font='70px Georgia';c.fillText('Somewhere',165,290);c.fillText('less ordinary.',165,365);c.font='18px sans-serif';c.fillText('TAKE THE SCENIC ROUTE',170,445);});
  for(const x of [-3.6,3.6]){box(x,.95,-1,4.4,.14,1.8,mats.lightWood,studio);for(const sx of [-1,1])box(x+sx*1.8,.5,-1,.09,.9,1.5,mats.metal,studio);monitor(x,2.0,-1.4,x<0?codeTx:siteTx,studio,2.65);box(x,.99,-.6,1.1,.04,.38,mats.black,studio);cylinder(x,.5,1.0,.4,.08,mats.darkWood,studio);box(x,.3,1,.1,.4,.1,mats.metal,studio);}
  // Prototype review lounge, plant shelf, and a physical screen for the design concept.
  for(const x of [-4.4,4.4]){
    box(x,1.22,3.35,2.9,.18,1.65,mats.darkWood,studio);
    box(x,.72,2.95,.12,1,.12,mats.metal,studio);box(x,.72,3.75,.12,1,.12,mats.metal,studio);
    box(x,1.78,4.02,2.9,.09,.12,mats.lightWood,studio);
    box(x,2.22,4.02,2.65,.65,.07,mats.fern,studio);
  }
  sign('THOUGHTFUL BY DESIGN','A SMALL STUDIO FOR BIG IDEAS.',0,2.25,-5.16,5.5,.72,studio);
  sign('IDEA → DESIGN → CODE → LAUNCH','MADE FOR THE WAY YOUR BUSINESS MOVES',0,1.6,-5.05,4.8,.8,studio);

  // 03 — A living water court: a true falling sheet, mirror pool, stone apron,
  // lit fountain, and fine spray placed alongside the route into the gallery.
  const animatedWater=[];
  function flowingMaterial({falling=false,horizontal=false,opacity=1}={}){
    const mat=new T.MeshPhysicalMaterial({color:'#ffffff',metalness:falling?.12:.24,roughness:falling?.085:.14,clearcoat:1,clearcoatRoughness:.035,transparent:falling,opacity,depthWrite:!falling,side:T.DoubleSide});
    mat.userData.water=true;mat.userData.falling=falling;
    mat.onBeforeCompile=shader=>{
      shader.uniforms.uFlowTime={value:0};shader.uniforms.uRipple={value:new T.Vector3(6,0,-47)};shader.uniforms.uRipplePower={value:.18};
      shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nuniform float uFlowTime; varying vec3 vFlowPosition;');
      const displacement=falling?'sin(position.x*13.0+uFlowTime*2.5)*0.016+sin(position.x*31.0-uFlowTime*3.7)*0.009':horizontal?'sin(position.x*1.7+uFlowTime*.5)*.035+sin(position.z*1.2-uFlowTime*.38)*.028':'sin(position.x*2.4+uFlowTime*1.15)*0.022+sin(position.y*3.1-uFlowTime*.8)*0.016';
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>\ntransformed.${horizontal?'y':'z'} += ${displacement};`);
      shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvFlowPosition = worldPosition.xyz;');
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nuniform float uFlowTime; uniform vec3 uRipple; uniform float uRipplePower; varying vec3 vFlowPosition;');
      const look=falling?`float streak=sin(vFlowPosition.y*32.0-uFlowTime*8.0+sin(vFlowPosition.x*14.0)*.8);\nfloat glint=smoothstep(.62,.96,streak);\ndiffuseColor.rgb=mix(diffuseColor.rgb,vec3(.78,.88,.83),glint*.33);\ndiffuseColor.a*=.88+glint*.11;`:`float ray=distance(vFlowPosition.xz,uRipple.xz);\nfloat ring=sin(ray*16.0-uFlowTime*7.0)*exp(-ray*.75)*uRipplePower;\nfloat grain=sin(vFlowPosition.x*3.8+uFlowTime*.55)*sin(vFlowPosition.z*3.2-uFlowTime*.45);\nfloat fresnel=pow(1.0-max(dot(normalize(vNormal),normalize(vViewPosition)),0.0),4.0);\ndiffuseColor.rgb=mix(vec3(.045,.13,.135),vec3(.33,.55,.52),clamp(.27+fresnel*.68+grain*.075+ring*.22,0.0,1.0));\ndiffuseColor.rgb=mix(diffuseColor.rgb,vec3(.82,.89,.80),smoothstep(.56,.95,ring)*.32);`;
      shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment',`#include <color_fragment`);
      shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n'+look);
      mat.userData.shader=shader;
    };
    animatedWater.push(mat);return mat;
  }
  const waterSurface=flowingMaterial();
  const fallWater=flowingMaterial({falling:true,opacity:.84});
  const riverMaterial=flowingMaterial({horizontal:true});
  function routeRibbon(curve,{segments=300,across=7,width=6,offset=0,y=0,material}={}){
    const vertices=[],uv=[],indices=[];
    for(let i=0;i<=segments;i++){
      const t=i/segments,center=curve.getPoint(t),tangent=curve.getTangent(t),bank=new T.Vector3(tangent.z,0,-tangent.x).normalize();
      const centerOffset=typeof offset==='function'?offset(t):offset;
      center.addScaledVector(bank,centerOffset);
      const ribbonWidth=typeof width==='function'?width(t):width;
      for(let j=0;j<across;j++){
        const edge=(j/(across-1)-.5)*ribbonWidth;
        vertices.push(center.x+bank.x*edge,y+center.y,center.z+bank.z*edge);
        uv.push(j/(across-1),t*34);
      }
    }
    for(let i=0;i<segments;i++)for(let j=0;j<across-1;j++){
      const a=i*across+j,b=a+across;indices.push(a,b,b+1,a,b+1,a+1);
    }
    const geometry=new T.BufferGeometry();
    geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
    geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();
    const mesh=new T.Mesh(geometry,material);mesh.receiveShadow=true;return mesh;
  }
  // A broad river winds alongside the entire visitor route, with a real mesh
  // surface for the moving current and pointer-driven reflections.
  const river=routeRibbon(pathCurve,{segments:430,across:9,width:t=>7.2+Math.sin(t*16)*.8,offset:t=>-15.5-Math.sin(t*9)*2.3,y:-.055,material:riverMaterial});
  river.userData.rippleSurface=true;scene.add(river);
  for(let i=0;i<70;i++){
    const t=.08+random()*.84,center=pathCurve.getPoint(t),tangent=pathCurve.getTangent(t),bank=new T.Vector3(tangent.z,0,-tangent.x).normalize(),side=i%2?1:-1;
    center.addScaledVector(bank,-15.5-Math.sin(t*9)*2.3+side*(3.8+random()*1.4));
    const stone=new T.Mesh(new T.DodecahedronGeometry(.42+random()*.7,1),material(i%3?'#687564':'#90917d',{roughness:.82}));
    stone.position.set(center.x,.03,center.z);stone.scale.set(1.5,.6,.85);stone.rotation.y=random()*6.28;stone.castShadow=true;scene.add(stone);
  }
  const flightActors=[],butterflyActors=[],hummingbirds=[],labRobots=[],expressiveRobots=[];
  let fountainMixer=null,fountainRoot=null,labScanner=null,labArm=null;
  const assetErrors=[];
  let resolveAssets;
  const ready=new Promise(resolve=>{resolveAssets=resolve;});
  const assetManager=new T.LoadingManager(()=>resolveAssets({errors:assetErrors}));
  assetManager.onError=url=>{assetErrors.push(url);console.error('Campus asset failed:',url);};
  if(!film){
    const gltfLoader=new GLTFLoader(assetManager);
    // Cache one source per file, then clone furniture instead of fetching duplicates.
    for(const file of new Set(labProps.map(prop=>prop.file)))gltfLoader.load(`./assets/${file}`,gltf=>{
      gltf.scene.updateMatrixWorld(true);
      const bounds=new T.Box3().setFromObject(gltf.scene),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());
      for(const prop of labProps.filter(prop=>prop.file===file)){
        const model=gltf.scene.clone(true),scale=prop.size/Math.max(size[prop.axis||'y'],.001);
        model.scale.multiplyScalar(scale);model.position.set(-center.x*scale,-bounds.min.y*scale,-center.z*scale);
        model.traverse(part=>{if(part.isMesh){part.castShadow=true;part.receiveShadow=true;}});
        const holder=new T.Group();holder.name=file;holder.position.set(prop.x,prop.y,prop.z);holder.rotation.y=prop.yaw||0;
        holder.add(model);lab.add(holder);
      }
      renderer.render(scene,camera);
    });
    gltfLoader.load('./assets/bake3d-robot-animated.glb',gltf=>{
      gltf.scene.updateMatrixWorld(true);
      const sourceBounds=new T.Box3().setFromObject(gltf.scene),sourceSize=sourceBounds.getSize(new T.Vector3());
      const clips=Object.fromEntries(gltf.animations.map(clip=>[clip.name,clip]));
      const scanner=new T.Mesh(new T.TorusGeometry(.88,.026,10,64),new T.MeshStandardMaterial({color:'#8ce4bd',emissive:'#3dbb8a',emissiveIntensity:1.4,metalness:.45,roughness:.24}));
      scanner.rotation.x=Math.PI/2;scanner.position.set(2.4,.33,-1.75);lab.add(scanner);
      labScanner=scanner;
      const makeRobot=({x,y,z,height,primary,gesture})=>{
        const model=SkeletonUtils.clone(gltf.scene),center=sourceBounds.getCenter(new T.Vector3()),scale=height/Math.max(sourceSize.y,.01);
        model.scale.setScalar(scale);model.position.set(-center.x*scale,-sourceBounds.min.y*scale,-center.z*scale);
        model.traverse(part=>{if(part.isMesh){part.castShadow=true;part.receiveShadow=true;part.material=part.material.clone();
          if(part.material.name==='Main'||part.material.name==='robot'){part.material.color.set(primary);part.material.metalness=.48;part.material.roughness=.24;}
          if(part.material.name==='Grey'){part.material.color.set('#253b36');part.material.metalness=.72;part.material.roughness=.28;}
          if(part.material.name==='Black'){part.material.color.set('#101a19');part.material.metalness=.5;part.material.roughness=.2;}
        }});
        const station=new T.Group();station.name='Sprout Research Robot';station.position.set(x,y,z);station.add(model);lab.add(station);
        const mixer=new T.AnimationMixer(model),idle=mixer.clipAction(clips.Idle);
        const walking=mixer.clipAction(clips.Walk),greeting=mixer.clipAction(clips.Intro),curious=mixer.clipAction(clips['Look around']);
        for(const action of [idle,walking,greeting,curious]){action.setLoop(T.LoopRepeat,Infinity);action.play();}
        walking.setEffectiveWeight(0);greeting.setEffectiveWeight(0);curious.setEffectiveWeight(0);
        labRobots.push({station,mixer,idle,walking,greeting,curious,gesture,homeX:x,homeZ:z,hero:true,clipNames:gltf.animations.map(clip=>clip.name)});
      };
      // One detailed, textured, fully rigged research robot takes center stage.
      makeRobot({x:2.4,y:.31,z:-1.75,height:1.65,primary:'#e1eee8',gesture:'Intro'});
      // A six-joint, brushed-metal research arm performs a slow pick-and-place
      // cycle behind the greeting robot. Rounded, high-segment parts catch the
      // same soft reflections as the lab's glass and polished worktop.
      const armHousing=new T.MeshStandardMaterial({color:'#dbe5df',metalness:.58,roughness:.24});
      const armSteel=new T.MeshStandardMaterial({color:'#84958f',metalness:.88,roughness:.2});
      const armDark=new T.MeshStandardMaterial({color:'#1e302d',metalness:.72,roughness:.3});
      const armGlow=new T.MeshStandardMaterial({color:'#8ce4bd',emissive:'#34d99a',emissiveIntensity:1.7,metalness:.25,roughness:.2});
      const armRoot=new T.Group();armRoot.position.set(4.05,.915,-4.43);armRoot.scale.setScalar(.78);lab.add(armRoot);
      const base=new T.Mesh(new T.CylinderGeometry(.55,.62,.20,48),armDark);base.position.y=.10;base.castShadow=true;base.receiveShadow=true;armRoot.add(base);
      const baseBand=new T.Mesh(new T.TorusGeometry(.48,.035,12,64),armSteel);baseBand.rotation.x=Math.PI/2;baseBand.position.y=.22;armRoot.add(baseBand);
      const turret=new T.Group();turret.position.y=.26;armRoot.add(turret);
      const turntable=new T.Mesh(new T.CylinderGeometry(.42,.46,.22,40),armHousing);turntable.position.y=.15;turntable.castShadow=true;turret.add(turntable);
      const shoulder=new T.Group();shoulder.position.set(0,.28,0);turret.add(shoulder);
      const shoulderJoint=new T.Mesh(new T.SphereGeometry(.37,32,24),armDark);shoulderJoint.castShadow=true;shoulder.add(shoulderJoint);
      const upperArm=new T.Mesh(new T.CylinderGeometry(.28,.34,.95,32,1),armHousing);upperArm.position.y=.51;upperArm.castShadow=true;upperArm.receiveShadow=true;shoulder.add(upperArm);
      const upperBand=new T.Mesh(new T.TorusGeometry(.31,.045,12,40),armSteel);upperBand.rotation.x=Math.PI/2;upperBand.position.y=.35;shoulder.add(upperBand);
      const elbow=new T.Group();elbow.position.y=1.0;shoulder.add(elbow);
      const elbowJoint=new T.Mesh(new T.SphereGeometry(.30,32,24),armDark);elbowJoint.castShadow=true;elbow.add(elbowJoint);
      const forearm=new T.Mesh(new T.CylinderGeometry(.20,.28,.78,32,1),armHousing);forearm.position.y=.40;forearm.castShadow=true;elbow.add(forearm);
      const piston=new T.Mesh(new T.CylinderGeometry(.055,.055,.72,20),armSteel);piston.position.set(.25,.4,0);elbow.add(piston);
      const wrist=new T.Group();wrist.position.y=.82;elbow.add(wrist);
      const wristJoint=new T.Mesh(new T.SphereGeometry(.22,28,20),armSteel);wrist.add(wristJoint);
      const palm=new T.Mesh(new T.BoxGeometry(.32,.22,.36),armDark);palm.position.set(0,-.16,0);palm.castShadow=true;wrist.add(palm);
      const fingers=[];
      for(const side of [-1,1]){const finger=new T.Mesh(new T.BoxGeometry(.075,.3,.10),armSteel);finger.position.set(side*.105,-.39,.06);finger.castShadow=true;wrist.add(finger);fingers.push({finger,side});}
      const indicator=new T.Mesh(new T.SphereGeometry(.075,20,16),armGlow);indicator.position.set(0,.38,.36);turret.add(indicator);
      labArm={turret,shoulder,elbow,wrist,fingers,indicator};
      renderer.render(scene,camera);
    });
    // High-animation Expressive Robot from Sketchfab / Three.js collection (14 authored clips)
    gltfLoader.load('./assets/robot-expressive.glb',gltf=>{
      gltf.scene.updateMatrixWorld(true);
      const sourceBounds=new T.Box3().setFromObject(gltf.scene),sourceSize=sourceBounds.getSize(new T.Vector3());
      const makeExpressive=({x,y,z,parent,height=1.56,primary='#4ae3a8',name='Expressive Assistant',yaw=0,room='lab'})=>{
        const model=SkeletonUtils.clone(gltf.scene),center=sourceBounds.getCenter(new T.Vector3()),scale=height/Math.max(sourceSize.y,.01);
        model.scale.setScalar(scale);model.position.set(-center.x*scale,-sourceBounds.min.y*scale,-center.z*scale);
        model.traverse(part=>{
          if(part.isMesh){
            part.castShadow=true;part.receiveShadow=true;part.material=part.material.clone();
            if(part.material.name==='Main'){part.material.color.set(primary);part.material.metalness=.45;part.material.roughness=.24;}
            if(part.material.name==='Grey'){part.material.color.set('#253b36');part.material.metalness=.70;part.material.roughness=.28;}
            if(part.material.name==='Black'){part.material.color.set('#101a19');part.material.metalness=.5;part.material.roughness=.2;}
          }
        });
        const station=new T.Group();station.name=name;station.position.set(x,y,z);station.rotation.y=yaw;
        station.add(model);parent.add(station);
        const mixer=new T.AnimationMixer(model);
        const actions={};
        for(const clip of gltf.animations){
          const act=mixer.clipAction(clip);
          act.setLoop(T.LoopRepeat,Infinity);
          act.play();
          act.setEffectiveWeight(clip.name==='Idle'?1:0);
          actions[clip.name]=act;
        }
        expressiveRobots.push({station,model,mixer,actions,room,homeYaw:yaw,homeX:x,homeZ:z,customAction:null,userExpiry:0});
      };
      // 1. Lead Research Assistant Robot beside microscope in Research Lab:
      makeExpressive({x:-3.4,y:.31,z:1.8,parent:lab,height:1.56,primary:'#4ae3a8',name:'Sprout Assistant Robot Lab',yaw:.45,room:'lab'});
      // 2. Creative Build Studio Engineer beside workstation in Build Studio:
      makeExpressive({x:2.2,y:.31,z:-1.5,parent:studio,height:1.56,primary:'#dff2e8',name:'Sprout Studio Robot',yaw:-1.25,room:'studio'});
      renderer.render(scene,camera);
    });
    gltfLoader.load('./assets/animated-garden-fountain.glb',gltf=>{
      const model=gltf.scene;model.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(model);
      const size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3()),scale=5.4/Math.max(size.x,size.z);
      model.scale.setScalar(scale);model.position.set(-center.x*scale,-bounds.min.y*scale,-center.z*scale);
      model.traverse(part=>{
        if(part.isMesh){part.castShadow=true;part.receiveShadow=true;}
        if(part.material){
          if(part.material.name==='Water'){part.material.color.set('#4c9a9c');part.material.metalness=.3;part.material.roughness=.13;}
          if(part.material.name==='Stone')part.material.color.set('#4b5650');
          if(part.material.name==='Light stone')part.material.color.set('#b1ad98');
          if(part.material.name==='Foam')part.material.color.set('#dcebe1');
        }
      });
      const plaza=new T.Group();plaza.position.set(-7.3,0,-68);plaza.add(model);scene.add(plaza);fountainRoot=plaza;
      fountainMixer=new T.AnimationMixer(model);gltf.animations.forEach(clip=>fountainMixer.clipAction(clip).play());
      renderer.render(scene,camera);
    });
    gltfLoader.load('./assets/innescene-drone.glb',gltf=>{
      const flight=new T.Group(),model=gltf.scene;model.updateMatrixWorld(true);
      const bounds=new T.Box3().setFromObject(model),center=bounds.getCenter(new T.Vector3());
      model.position.sub(center);model.scale.setScalar(1.45);flight.add(model);scene.add(flight);
      const rotors=[];model.traverse(part=>{if(part.name.startsWith('Rotor blade'))rotors.push(part);});
      flightActors.push({flight,rotors});
      renderer.render(scene,camera);
    });
    gltfLoader.load('./assets/cc0-butterfly.glb',gltf=>{
      for(let i=0;i<4;i++){
        const holder=new T.Group(),model=SkeletonUtils.clone(gltf.scene);model.updateMatrixWorld(true);
        const bounds=new T.Box3().setFromObject(model),center=bounds.getCenter(new T.Vector3());
        model.position.sub(center);model.scale.setScalar(.055);holder.add(model);scene.add(holder);
        const mixer=new T.AnimationMixer(model);
        if(gltf.animations[0])mixer.clipAction(gltf.animations[0]).play();
        butterflyActors.push({holder,mixer,phase:i*.24,side:i%2?1:-1});
      }
      renderer.render(scene,camera);
    });
    gltfLoader.load('./assets/cc0-hummingbird.glb',gltf=>{
      const bounds=new T.Box3().setFromObject(gltf.scene),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());
      const scale=.78/Math.max(size.y,.01);
      const hoverClip=gltf.animations[0]?T.AnimationUtils.subclip(gltf.animations[0],'hover',0,30,24):null;
      for(let i=0;i<3;i++){
        const model=SkeletonUtils.clone(gltf.scene),holder=new T.Group();
        model.scale.setScalar(scale);model.position.set(-center.x*scale,-bounds.min.y*scale,-center.z*scale);
        model.traverse(part=>{if(part.isMesh){part.castShadow=true;part.receiveShadow=true;}});
        holder.add(model);scene.add(holder);
        const mixer=new T.AnimationMixer(model);if(hoverClip)mixer.clipAction(hoverClip).play();
        hummingbirds.push({holder,mixer,phase:i/3});
      }
      renderer.render(scene,camera);
    });
  }
  const courtX=13.8,courtZ=-47.3;
  box(courtX,.04,courtZ,9.2,.34,8.2,mats.darkWood);
  box(courtX,.205,courtZ,8.75,.06,7.8,mats.lightWood);
  // Deep still basin. The rippling top carries real reflections from the canopy.
  const pool=new T.Mesh(new T.PlaneGeometry(7.8,6.8,48,42),waterSurface);
  pool.rotation.x=-Math.PI/2;pool.position.set(courtX,.27,courtZ);pool.userData.rippleSurface=true;scene.add(pool);
  const fallWall=box(courtX,2.25,courtZ+1.6,6.7,4.15,.5,mats.white);
  box(courtX,4.42,courtZ+1.22,7.4,.35,1.0,mats.darkWood);
  box(courtX,4.59,courtZ+1.22,7.1,.045,.76,mats.warm);
  const cascade=new T.Mesh(new T.PlaneGeometry(5.8,4.05,34,54),fallWater);
  cascade.position.set(courtX,2.28,courtZ+1.31);cascade.userData.rippleSurface=true;scene.add(cascade);
  const lip=new T.Mesh(new T.BoxGeometry(6.2,.055,.42),mats.warm);lip.position.set(courtX,4.35,courtZ+1.12);scene.add(lip);
  // Rounded river stones break up the basin edge and anchor the sheet of water.
  for(let i=0;i<16;i++){
    const a=i/16*Math.PI*2,r=3.7+random()*.55;
    const pebble=new T.Mesh(new T.DodecahedronGeometry(.34+random()*.46,1),material(i%3?'#666d5b':'#818476',{roughness:.9}));
    pebble.position.set(courtX+Math.cos(a)*r,.29,courtZ+Math.sin(a)*r);pebble.scale.set(1.15,.5,.82);pebble.rotation.y=random()*6.28;pebble.castShadow=true;scene.add(pebble);
  }
  // A downloaded, rigged CC0 garden fountain replaces the primitive bowl.
  const fountainX=-7.3,fountainZ=-68;
  const fountainPlaza=new T.Mesh(new T.CylinderGeometry(4.1,4.1,.18,12),material('#4a554e',{roughness:.76}));
  fountainPlaza.position.set(fountainX,-.005,fountainZ);fountainPlaza.receiveShadow=true;scene.add(fountainPlaza);
  const fountainDropMat=new T.MeshBasicMaterial({color:'#c7e7d7',transparent:true,opacity:.67,depthWrite:false});
  const sprayCount=180,sprayPositions=new Float32Array(sprayCount*3),sprayGeo=new T.BufferGeometry();
  for(let i=0;i<sprayCount;i++){sprayPositions[i*3]=courtX+(random()-.5)*5.7;sprayPositions[i*3+1]=random()*4;sprayPositions[i*3+2]=courtZ+(random()-.5)*.36;}
  sprayGeo.setAttribute('position',new T.BufferAttribute(sprayPositions,3));
  const spray=new T.Points(sprayGeo,new T.PointsMaterial({color:'#d8eee2',size:.075,transparent:true,opacity:.7,depthWrite:false,sizeAttenuation:true}));scene.add(spray);
  const lampMat=material('#ffe1a2',{emissive:'#ffc76b',emissiveIntensity:1.3,roughness:.24});
  for(const side of [-1,1]){
    const sconce=new T.Mesh(new T.SphereGeometry(.14,12,10),lampMat);sconce.position.set(courtX+side*3.45,3.8,courtZ+1.01);scene.add(sconce);
    const light=new T.PointLight('#ffd897',18,9,1.7);light.position.copy(sconce.position);scene.add(light);
  }
  // 03 — Gallery. Work is exhibited as walkable, architectural installations.
  const gallery=pavilion(0,-51,16,13,'03 / PROJECT GALLERY','DIGITAL EXPERIENCES, OUT IN THE WORLD.');
  box(0,.29,0,15.1,.035,12.2,studioFloor,gallery);
  for(let i=0;i<16;i++)box(-7.2+i*.96,.315,0,.015,.01,12,studioAccent,gallery);
  for(const x of [-5.4,5.4]){
    box(x,3.25,0,3.4,.08,7.2,mats.darkWood,gallery);
    box(x,3.31,0,3.15,.025,6.8,labLight,gallery);
    box(x,.95,-.4,3.9,.13,1.5,mats.lightWood,gallery);
    for(const sx of [-1,1])box(x+sx*1.7,.52,-.4,.08,.8,1.2,mats.metal,gallery);
  }
  const projectScreens=[];
  for(const [x,tx,name,sub] of [[-4.5,siteTx,'FERN & FORM','COMMERCE / STUDIO CONCEPT'],[4.5,travelTx,'FIELDNOTES','EXPERIENCES / STUDIO CONCEPT']]){
    const exhibit=new T.Group();exhibit.position.x=x;exhibit.rotation.y=x<0?1.05:-1.05;gallery.add(exhibit);
    box(0,.55,0,3.7,1.1,1.2,mats.darkWood,exhibit);const screen=monitor(0,2.25,0,tx,exhibit,3.1);projectScreens.push(screen);sign(name,sub,0,.75,.63,3,.6,exhibit);
  }
  const ring=new T.Mesh(new T.TorusGeometry(1.1,.06,10,90),mats.warm);ring.position.set(0,2.0,-4.9);gallery.add(ring);
  sign('BUILT TO MAKE AN IMPACT','YOUR PROJECT COULD BE NEXT',0,1.9,-4.7,3.9,.7,gallery);

  // 04 — The meeting garden. A shared table facing the forest.
  const deck=box(0,.05,-72,14,.2,12,mats.wood);
  for(let i=0;i<34;i++)box(-6.8+i*.4,.17,-72,.025,.015,12,mats.darkWood);
  const tableX=4.15;
  cylinder(tableX,.8,-72,1.8,.12,mats.lightWood);cylinder(tableX,.43,-72,.35,.7,mats.metal);
  for(let i=0;i<5;i++){const a=i/5*Math.PI*2;cylinder(tableX+Math.cos(a)*2.4,.55,-72+Math.sin(a)*2.4,.45,.12,mats.white);box(tableX+Math.cos(a)*2.4,.3,-72+Math.sin(a)*2.4,.12,.5,.12,mats.darkWood);}
  for(const x of [-6.3,6.3])for(const z of [-77,-67]){box(x,2.4,z,.14,4.8,.14,mats.darkWood);}
  for(let i=0;i<14;i++)box(-6.3+i*.97,4.7,-72,.1,.15,11,mats.darkWood);
  sign('LET’S BUILD WHAT’S NEXT.','YOUR VISION. OUR CRAFT. A SHARED JOURNEY.',0,2.7,-77.4,6.5,1.15);
  for(const x of [-5.1,5.1]){
    const canopy=new T.Mesh(new T.CylinderGeometry(.045,.07,4.4,12),mats.metal);canopy.position.set(x,2.2,-72);deck.add(canopy);
    box(x,4.42,-72,.14,.08,11,mats.darkWood);
  }
  for(let i=0;i<7;i++){
    const planterX=-5.2+i*1.72;
    const planter=new T.Mesh(new T.BoxGeometry(1.35,.42,.8),mats.darkWood);planter.position.set(planterX,.38,-77);scene.add(planter);
    cylinder(planterX,.7,-77,.48,.22,mats.soil);plant(planterX,-77,.85);
  }
  for(const x of [-5.4,5.4])for(const z of [-76,-68])plant(x,z,1.8);
  const water=new T.Mesh(new T.PlaneGeometry(13,22),waterSurface);water.rotation.x=-Math.PI/2;water.position.set(12,-.055,-65);water.userData.rippleSurface=true;scene.add(water);
  // Low path lights guide the visitor without floating UI in the world.
  for(let i=0;i<20;i++){const t=i/19,p=pathCurve.getPoint(t),dir=pathCurve.getTangent(t);const x=p.x+dir.z*1.9,z=p.z-dir.x*1.9;box(x,.3,z,.12,.6,.12,mats.darkWood);box(x,.61,z,.18,.06,.18,mats.warm);}
  const motePositions=new Float32Array(160*3);
  for(let i=0;i<160;i++){motePositions[i*3]=(random()-.5)*45;motePositions[i*3+1]=1+random()*7;motePositions[i*3+2]=20-random()*105;}
  const moteGeo=new T.BufferGeometry();moteGeo.setAttribute('position',new T.BufferAttribute(motePositions,3));const motes=new T.Points(moteGeo,new T.PointsMaterial({color:'#f4eac3',size:.045,transparent:true,opacity:.45,depthWrite:false}));scene.add(motes);
  // Camera and focus have independent smooth tracks: approach, walk inside,
  // turn toward the room's work, leave through the open front/side, continue.
  const keys=[
    [0,[0,1.7,22],[0,2.7,0]],
    [.08,[0,1.7,8],[1.6,2,-3]],
    [.14,[0,1.7,.6],[0,2,-4]],
    [.17,[0,1.7,-9],[0,2,-14]],
    [.20,[-6,1.7,-10],[-8,2,-16]],
    [.26,[-8,1.7,-13.2],[-15.3,1.9,-20.2]],
    [.32,[-7,1.7,-17],[-11,1.65,-18]],
    [.37,[-.5,1.7,-16],[4,2,-28]],
    [.42,[7,1.7,-17],[9,2,-25]],
    [.48,[9,1.7,-30],[9,2,-38]],
    [.53,[9,1.7,-34],[9,2,-41]],
    [.56,[9,1.7,-38],[9,2,-42]],
    [.58,[9,1.7,-42],[6,2,-46]],
    [.65,[6,1.7,-44],[2,2,-49]],
    [.71,[2,1.7,-46],[0,2,-51]],
    [.77,[1,1.7,-50],[0,2,-57]],
    [.83,[0,1.7,-54],[0,2,-62]],
    [.90,[0,1.7,-62],[1,2.5,-70]],
    [1,[1,2,-70],[1,2.6,-77]]
  ];
  const positions=new T.CatmullRomCurve3(keys.map(k=>new T.Vector3(...k[1])),false,'centripetal');
  const targets=new T.CatmullRomCurve3(keys.map(k=>new T.Vector3(...k[2])),false,'centripetal');
  const temp=new T.Vector3();
  function sample(progress){let i=0;while(i<keys.length-2&&progress>keys[i+1][0])i++;return(i+T.MathUtils.clamp((progress-keys[i][0])/(keys[i+1][0]-keys[i][0]),0,1))/(keys.length-1);}
  function resize(w=innerWidth,h=innerHeight){renderer.setSize(w,h,false);camera.clearViewOffset();camera.aspect=w/h;camera.updateProjectionMatrix();}
  let ripplePoint=new T.Vector3(courtX,0,courtZ),ripplePower=.15;
  const raycaster=new T.Raycaster(),pointerNdc=new T.Vector2();
  canvas.addEventListener('pointermove',event=>{
    const rect=canvas.getBoundingClientRect();pointerNdc.set((event.clientX-rect.left)/rect.width*2-1,-((event.clientY-rect.top)/rect.height)*2+1);
    raycaster.setFromCamera(pointerNdc,camera);
    const hit=raycaster.intersectObjects([pool,river,...(fountainRoot?[fountainRoot]:[])],true)[0];
    if(hit){ripplePoint.copy(hit.point);ripplePower=.8;}
  },{passive:true});
  let lastTime=0;
  function setRobotAction(actionName,duration=5.0){
    const valid=['Wave','ThumbsUp','Dance','Jump','Yes','No','Walking','Running','Sitting','Standing','Punch','Idle'];
    if(!valid.includes(actionName))return;
    expressiveRobots.forEach(actor=>{
      actor.customAction=actionName;
      actor.userExpiry=lastTime+duration;
    });
  }
  canvas.addEventListener('pointerdown',event=>{
    const rect=canvas.getBoundingClientRect();pointerNdc.set((event.clientX-rect.left)/rect.width*2-1,-((event.clientY-rect.top)/rect.height)*2+1);
    raycaster.setFromCamera(pointerNdc,camera);const hit=raycaster.intersectObjects([pool,river,...(fountainRoot?[fountainRoot]:[])],true)[0];
    if(hit){ripplePoint.copy(hit.point);ripplePower=1.65;}
    const robotTargets=[];
    expressiveRobots.forEach(r=>robotTargets.push(r.station));
    labRobots.forEach(r=>robotTargets.push(r.station));
    const robotHit=raycaster.intersectObjects(robotTargets,true)[0];
    if(robotHit){
      const fun=['Wave','ThumbsUp','Dance','Jump','Yes'];
      const act=fun[Math.floor(Math.random()*fun.length)];
      setRobotAction(act,4.5);
      canvas.dispatchEvent?.(new CustomEvent('robotact',{detail:{action:act}}));
    }
  },{passive:true});
  function renderAt(progress,time=0,pointer={x:0,y:0},still=false){
    lastTime=time;
    const p=T.MathUtils.clamp(progress,0,1),t=sample(p);positions.getPoint(t,camera.position);
    const smooth=value=>{const x=T.MathUtils.clamp(value,0,1);return x*x*(3-2*x);};
    const walkIn=smooth((p-.195)/.045)*(1-smooth((p-.25)/.025));
    const walkOut=smooth((p-.315)/.035)*(1-smooth((p-.37)/.03));
    const labGreeting=smooth((p-.24)/.035)*(1-smooth((p-.32)/.04));
    const approach=smooth((p-.19)/.09),returnHome=smooth((p-.315)/.09),robotTravel=approach*(1-returnHome);
    labRobots.forEach(actor=>{
      const {idle,walking,greeting,curious,gesture}=actor;
      const rawWalk=actor.hero?Math.min(1,walkIn+walkOut):0,rawHello=labGreeting*(actor.hero ? .94 : .72);
      const total=Math.min(1,rawWalk+rawHello),normalizer=rawWalk+rawHello>1?1/(rawWalk+rawHello):1;
      const walkWeight=rawWalk*normalizer,helloWeight=rawHello*normalizer;
      const curiousWeight=(1-total)*(.5+.5*Math.sin(time*.22))*.7;
      idle.setEffectiveWeight(1-total-curiousWeight);curious.setEffectiveWeight(curiousWeight);
      walking.setEffectiveWeight(walkWeight);greeting.setEffectiveWeight(helloWeight);
      if(actor.hero){
        actor.station.position.x=actor.homeX+1.45*robotTravel;actor.station.position.z=actor.homeZ+1.62*robotTravel;
        actor.station.rotation.y=.70*walkIn-2.42*walkOut+Math.PI*Math.max(0,1-walkWeight-helloWeight);
      }
    });
    // Keep the first-person view aligned to the paved route. Room-focus targets
    // can ease the gaze a little, but can never turn the camera through a wall.
    const travel=positions.getTangent(t).normalize();
    const authored=targets.getPoint(t).sub(camera.position).normalize();
    const travelYaw=Math.atan2(travel.x,travel.z),authoredYaw=Math.atan2(authored.x,authored.z);
    let yawDelta=Math.atan2(Math.sin(authoredYaw-travelYaw),Math.cos(authoredYaw-travelYaw));
    const labView=smooth((p-.22)/.025)*(1-smooth((p-.28)/.035));
    const lookLimit=T.MathUtils.lerp(.48,1.05,labView);
    yawDelta=T.MathUtils.clamp(yawDelta,-lookLimit,lookLimit)+pointer.x*.20;
    const pitch=T.MathUtils.clamp(Math.atan2(authored.y,Math.max(.001,Math.hypot(authored.x,authored.z)))+pointer.y*.10,-.12,.20);
    const heading=travelYaw+yawDelta,cosPitch=Math.cos(pitch);
    temp.set(camera.position.x+Math.sin(heading)*cosPitch*10,camera.position.y+Math.sin(pitch)*10,camera.position.z+Math.cos(heading)*cosPitch*10);
    camera.lookAt(temp);
    if(!still){
      ring.rotation.z=time*.08;
      motes.position.y=Math.sin(time*.2)*.12;
      motes.rotation.y=time*.018;

      // Dynamic spatial wind wave across forest canopy:
      const windAngle=0.68,wCos=Math.cos(windAngle),wSin=Math.sin(windAngle);
      const gustGlobal=Math.sin(time*.42)*.35+Math.sin(time*.95)*.22;
      treeCards.forEach(({x,z,height,width,yaw,index,slot,phase,amount})=>{
        const proj=x*wCos+z*wSin;
        const wave=Math.sin(proj*.052-time*1.65)*.65+Math.sin(proj*.12-time*3.1)*.35;
        const gust=Math.max(-.15,wave+gustGlobal);
        const flex=Math.min(1.4,height/15);
        const bend=(amount*2.2+gust*.032)*flex;
        const flutter=Math.sin(time*2.5+phase)*.012;
        const tiltX=wCos*bend+flutter;
        const tiltZ=wSin*bend+Math.cos(time*2.1+phase)*.012;
        const leanX=tiltX*height*.14,leanZ=tiltZ*height*.14;
        for(let side=0;side<3;side++){
          treeDummy.position.set(x+leanX,height/2,z+leanZ);
          treeDummy.rotation.set(tiltX,yaw+side*Math.PI/3,tiltZ);
          treeDummy.scale.set(width,height,1);
          treeDummy.updateMatrix();
          treeBatches[index].setMatrixAt(slot*3+side,treeDummy.matrix);
        }
      });
      treeBatches.forEach(batch=>batch.instanceMatrix.needsUpdate=true);

      // Swaying ground ferns in the breeze:
      for(let i=0;i<fernData.length;i++){
        const f=fernData[i];
        const fernWind=Math.sin((f.x*wCos+f.z*wSin)*.09-time*2.2+f.phase*.4);
        dummy.position.set(f.x,f.y,f.z);dummy.scale.setScalar(f.s);
        dummy.rotation.set(
          f.rx+wCos*fernWind*.16+Math.sin(time*3.2+f.phase)*.03,
          f.ry+Math.sin(time*1.5+f.phase)*.06,
          f.rz+wSin*fernWind*.16+Math.cos(time*2.8+f.phase)*.03
        );
        dummy.updateMatrix();
        fernMesh.setMatrixAt(i,dummy.matrix);
      }
      fernMesh.instanceMatrix.needsUpdate=true;

      // Drifting forest foliage particles (tumbling leaves in the canopy air):
      for(let i=0;i<leafParticles.length;i++){
        const lp=leafParticles[i];
        const cycle=16.0;
        const life=((time*lp.fallSpeed+lp.phase*4.0)%cycle);
        const curY=Math.max(.12,14.5-life);
        const swirl=Math.sin(time*lp.swirlFreq+lp.phase)*lp.swirlRadius;
        const driftX=wCos*(life*.55)+Math.cos(time*1.3+lp.phase)*.4;
        const driftZ=wSin*(life*.55)+Math.sin(time*1.5+lp.phase)*.4;
        leafDummy.position.set(lp.x+driftX+swirl,curY,lp.z+driftZ);
        leafDummy.rotation.set(time*lp.tumbleSpeedX+lp.phase,time*lp.tumbleSpeedY+lp.phase,Math.sin(time*2.8+lp.phase)*.7);
        leafDummy.scale.setScalar(lp.scale*(curY<.25?0.0:1.0));
        leafDummy.updateMatrix();
        leafMesh.setMatrixAt(i,leafDummy.matrix);
      }
      leafMesh.instanceMatrix.needsUpdate=true;

      // Volumetric sunbeams softly breathing in canopy openings:
      sunbeams.forEach(({beam,phase,baseOpacity})=>{
        const flicker=Math.sin(time*.8+phase)*.035+Math.sin(time*1.9+phase*2.0)*.02;
        beam.material.opacity=Math.max(.02,baseOpacity+flicker);
      });

      const values=sprayGeo.attributes.position.array;
      for(let i=0;i<sprayCount;i++){const phase=i/sprayCount*17.3,cycle=(time*.86+phase)%3.8;values[i*3]=courtX+(Math.sin(phase*5+time*.7))*2.7;values[i*3+1]=4.15-cycle*cycle*.3;values[i*3+2]=courtZ+1.2+Math.sin(phase*3)*.34;}
      fountainMixer?.setTime(time*.72);
      labRobots.forEach(({mixer})=>mixer.setTime(time));

      // Update Expressive Robots with 14 authored high-animation clips:
      expressiveRobots.forEach(actor=>{
        const {station,mixer,actions,room,homeYaw,userExpiry,customAction}=actor;
        mixer.setTime(time);
        if(time<userExpiry&&customAction&&actions[customAction]){
          for(const [name,act] of Object.entries(actions)){
            act.setEffectiveWeight(name===customAction?1.0:0.0);
          }
          return;
        }
        if(room==='lab'){
          const waveW=smooth((p-.195)/.035)*(1-smooth((p-.255)/.03));
          const thumbsW=smooth((p-.25)/.035)*(1-smooth((p-.31)/.03));
          const yesW=smooth((p-.28)/.03)*(1-smooth((p-.33)/.03))*.7;
          const idleW=Math.max(0,1-waveW-thumbsW-yesW);
          actions.Wave?.setEffectiveWeight(waveW);
          actions.ThumbsUp?.setEffectiveWeight(thumbsW);
          actions.Yes?.setEffectiveWeight(yesW);
          actions.Idle?.setEffectiveWeight(idleW);
          if(actions.Dance)actions.Dance.setEffectiveWeight(0);
          if(actions.Jump)actions.Jump.setEffectiveWeight(0);
          station.rotation.y=homeYaw+Math.sin(time*.8)*.12+(waveW>.1?.22:0);
        }else if(room==='studio'){
          const danceW=smooth((p-.46)/.04)*(1-smooth((p-.52)/.035))*.85;
          const jumpW=smooth((p-.51)/.03)*(1-smooth((p-.55)/.025))*.9;
          const thumbsW=smooth((p-.44)/.035)*(1-smooth((p-.48)/.03));
          const idleW=Math.max(0,1-danceW-jumpW-thumbsW);
          actions.Dance?.setEffectiveWeight(danceW);
          actions.Jump?.setEffectiveWeight(jumpW);
          actions.ThumbsUp?.setEffectiveWeight(thumbsW);
          actions.Idle?.setEffectiveWeight(idleW);
          if(actions.Wave)actions.Wave.setEffectiveWeight(0);
          if(actions.Yes)actions.Yes.setEffectiveWeight(0);
          station.rotation.y=homeYaw+Math.sin(time*1.1)*.15;
        }
      });

      if(labScanner)labScanner.scale.setScalar(.96+Math.sin(time*2.2)*.055);
      if(labArm){
        labArm.turret.rotation.y=Math.sin(time*.44)*.62;
        labArm.shoulder.rotation.z=-.32+Math.sin(time*.7)*.20;
        labArm.elbow.rotation.z=.62+Math.sin(time*.7+1.1)*.26;
        labArm.wrist.rotation.z=Math.sin(time*.7+2.0)*.19;
        const grip=(Math.sin(time*.55+1.2)+1)*.5;
        labArm.fingers.forEach(({finger,side})=>{finger.position.x=side*(.09+.075*grip);});
        labArm.indicator.material.emissiveIntensity=1.1+Math.sin(time*2.1)*.7;
      }
      sprayGeo.attributes.position.needsUpdate=true;
      if(flightActors.length){
        const t=(time*.031+.09)%1,point=pathCurve.getPoint(t),tangent=pathCurve.getTangent(t);
        point.y=7.3+Math.sin(time*1.3)*.7;point.x+=tangent.z*3.5;point.z-=tangent.x*3.5;
        const actor=flightActors[0];actor.flight.position.copy(point);actor.flight.rotation.y=Math.atan2(tangent.x,tangent.z);actor.flight.rotation.z=Math.sin(time*1.2)*.045;
        actor.rotors.forEach((rotor,index)=>{rotor.rotation.y=time*34+(index%2)*Math.PI;});
      }
      butterflyActors.forEach(({holder,mixer,phase,side},index)=>{
        const t=(time*.048+phase)%1,point=pathCurve.getPoint(t),tangent=pathCurve.getTangent(t),bank=new T.Vector3(tangent.z,0,-tangent.x).normalize();
        point.addScaledVector(bank,side*(2.5+Math.sin(time*.82+phase*8)*1.6));point.y=1.1+Math.sin(time*2.4+phase*10)*.7;
        holder.position.copy(point);holder.rotation.y=Math.atan2(tangent.x,tangent.z)+Math.sin(time*.8+phase)*.35;
        mixer.setTime(time*2.1+index*.11);
      });
      hummingbirds.forEach(({holder,mixer,phase},index)=>{
        const t=(time*.014+phase)%1,point=pathCurve.getPoint(t),tangent=pathCurve.getTangent(t),bank=new T.Vector3(tangent.z,0,-tangent.x).normalize();
        point.addScaledVector(bank,4.5+Math.sin(time*.8+index)*1.1);point.y=6.8+Math.sin(time*1.3+index*2)*.45;
        holder.position.copy(point);holder.rotation.y=Math.atan2(tangent.x,tangent.z)+Math.PI;
        mixer.setTime(time%1.25);
      });
      ripplePower=Math.max(.1,ripplePower*.992);
    }
    for(const mat of animatedWater)if(mat.userData.shader){mat.userData.shader.uniforms.uFlowTime.value=time;mat.userData.shader.uniforms.uRipple.value.copy(ripplePoint);mat.userData.shader.uniforms.uRipplePower.value=ripplePower;}
    // Keep the shadow frustum near the room currently being explored.
    sun.target.position.set(camera.position.x,0,camera.position.z-9);sun.position.set(camera.position.x-16,29,camera.position.z+12);
    renderer.render(scene,camera);
  }
  if(film)resolveAssets({errors:assetErrors});
  resize();renderAt(0);
  return {renderer,scene,camera,ready,labRobots,expressiveRobots,setRobotAction,resize,renderAt,dispose(){renderer.dispose();scene.traverse(object=>{object.geometry?.dispose();});}};
}
