import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

const testFolders = ['meshes/test1/', 'meshes/test2/', 'meshes/test3/', 'meshes/test4/'];  // Now 4 test cases!
const meshInfos = [
  { file: 'original.obj',    label: 'Original' },
  { file: 'pymeshfix.obj',   label: 'PyMeshFix' },
  { file: 'pymesh.obj',      label: 'PyMesh' },
  { file: 'meshlib.obj',     label: 'MeshLib' },
  { file: 'surfacenets.obj', label: 'SurfaceNets' },
  { file: 'localremesh.obj', label: 'Local Remesh' }
];

const rows = testFolders.length; 
const columns = meshInfos.length;
const totalMeshes = rows * columns;

const subH = 300; 
let canvasHeight = subH * rows;

// --- Create Scenes and Cameras ---
const scenes = [];
const cameras = [];

for (let i = 0; i < totalMeshes; i++) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(5, 10, 5);
  scene.add(dirLight);
  scenes.push(scene);

  // Create a camera for each subplot.
  const cam = new THREE.PerspectiveCamera(45, 1.0, 0.1, 1000);
  cam.position.set(0, 3, 10);
  cameras.push(cam);
}
const masterCamera = cameras[0]; 

// --- Renderer & Container ---
const container = document.getElementById('container');
container.style.height = canvasHeight + 'px';

const renderer = new THREE.WebGLRenderer({
  powerPreference: "high-performance",
  antialias: true,
});
renderer.setSize(window.innerWidth, canvasHeight);
renderer.setPixelRatio(window.devicePixelRatio);
container.appendChild(renderer.domElement);

const controls = new OrbitControls(masterCamera, renderer.domElement);
controls.enableDamping = true;

// --- Clipping Plane ---
const clipPlane = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0);
renderer.clippingPlanes = [clipPlane];
renderer.localClippingEnabled = true;

const clipSlider = document.getElementById('clipSlider');
clipSlider.addEventListener('input', (event) => {
  clipPlane.constant = parseFloat(event.target.value);
  renderAll();
});

// --- Load Meshes ---
const loader = new OBJLoader();

testFolders.forEach((folder, rowIndex) => {
  meshInfos.forEach((meshInfo, colIndex) => {
    const overallIndex = rowIndex * columns + colIndex;
    const url = folder + meshInfo.file;
    loader.load(
      url,
      (object) => {
        object.traverse(child => {
          if (child.isMesh) {
            child.geometry.computeVertexNormals();
            child.material = new THREE.MeshPhongMaterial({
              color: 0xffffff,
              polygonOffset: true,
              polygonOffsetFactor: 1,
              polygonOffsetUnits: 1,
              side: THREE.DoubleSide
            });
            const wireframeGeo = new THREE.WireframeGeometry(child.geometry);
            const wireframeMat = new THREE.LineBasicMaterial({ color: 0x000000 });
            const wireframe = new THREE.LineSegments(wireframeGeo, wireframeMat);
            child.add(wireframe);
          }
        });
        object.position.set(0, 0, 0);
        scenes[overallIndex].add(object);
        renderAll();
      },
      undefined,
      (err) => console.error('Error loading ' + url, err)
    );
  });
});

// --- Create HTML Labels ---
const labels = [];
for (let i = 0; i < totalMeshes; i++) {
  const labelDiv = document.createElement('div');
  labelDiv.className = 'subplot-label';
  const col = i % columns;
  labelDiv.innerText = meshInfos[col].label;
  container.appendChild(labelDiv);
  labels.push(labelDiv);
}

window.addEventListener('resize', onWindowResize);
function onWindowResize() {
  const newWidth = window.innerWidth;
  canvasHeight = subH * rows;
  container.style.height = canvasHeight + 'px';
  renderer.setSize(newWidth, canvasHeight);
  renderAll();
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  
  for (let i = 1; i < totalMeshes; i++) {
    cameras[i].position.copy(masterCamera.position);
    cameras[i].quaternion.copy(masterCamera.quaternion);
    cameras[i].updateMatrixWorld();
  }
  
  renderAll();
}
animate();

// --- Render All Subplots ---
function renderAll() {
  renderer.setScissorTest(true);
  const width = window.innerWidth;
  const subW = width / columns;

  for (let i = 0; i < totalMeshes; i++) {
    const row = Math.floor(i / columns);
    const col = i % columns;
    const viewportX = col * subW;
    const viewportY = canvasHeight - (row + 1) * subH;
    
    cameras[i].aspect = subW / subH;
    cameras[i].updateProjectionMatrix();

    renderer.setViewport(viewportX, viewportY, subW, subH);
    renderer.setScissor(viewportX, viewportY, subW, subH);
    renderer.render(scenes[i], cameras[i]);
    
    labels[i].style.left = (viewportX + 5) + 'px';
    labels[i].style.top  = (viewportY + 5) + 'px';
  }
}
