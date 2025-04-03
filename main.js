import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

// 1) Create 6 Scenes
const scenes = [];
for (let i = 0; i < 6; i++) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xffffff);
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(5, 10, 5);
  scene.add(dirLight);
  scenes.push(scene);
}


// 2) Create 6 Cameras
const cameras = [];
for (let i = 0; i < 6; i++) {
  const cam = new THREE.PerspectiveCamera(45, 1.0, 0.1, 1000);
  cam.position.set(0, 3, 10);
  cameras.push(cam);
}
const masterCamera = cameras[0];


// 3) Set up one Renderer and append its canvas to the container.
const container = document.getElementById('container');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
container.appendChild(renderer.domElement);


// 4) OrbitControls on the master camera
const controls = new OrbitControls(masterCamera, renderer.domElement);
controls.enableDamping = true;


// 5) Shared Clipping Plane (affects all scenes).
const clipPlane = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0);
renderer.clippingPlanes = [clipPlane];
renderer.localClippingEnabled = true;

const clipSlider = document.getElementById('clipSlider');
clipSlider.addEventListener('input', (event) => {
  clipPlane.constant = parseFloat(event.target.value);
  renderAll();
});

// 6) Load 6 OBJ meshes (one per scene) with edge highlighting.
const meshInfos = [
  { url: 'meshes/test1/original.obj',    label: 'Original'    },
  { url: 'meshes/test1/pymeshfix.obj',   label: 'PyMeshFix'   },
  { url: 'meshes/test1/pymesh.obj',      label: 'PyMesh'      },
  { url: 'meshes/test1/meshlib.obj',     label: 'MeshLib'     },
  { url: 'meshes/test1/surfacenets.obj', label: 'SurfaceNets' },
  { url: 'meshes/test1/localremesh.obj', label: 'Local Remesh'},
];

const loader = new OBJLoader();
meshInfos.forEach((info, i) => {
  loader.load(
    info.url,
    (object) => {
      object.traverse(child => {
        if (child.isMesh) {
          const edges = new THREE.EdgesGeometry(child.geometry);
          const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 1 });
          const edgeLines = new THREE.LineSegments(edges, edgeMaterial);
          child.add(edgeLines);
        }
      });
      object.position.set(0, 0, 0);
      scenes[i].add(object);
      renderAll();
    },
    (err) => console.error('Error loading ' + info.url, err)
  );
});


// 7) Create HTML labels
const labels = [];
for (let i = 0; i < 6; i++) {
  labels.push(document.getElementById(`label${i}`));
}

window.addEventListener('resize', onWindowResize);
function onWindowResize() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderAll();
}


// 9) Animation Loop & Synchronized Cameras
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  for (let i = 1; i < 6; i++) {
    cameras[i].quaternion.copy(masterCamera.quaternion);
    cameras[i].position.copy(masterCamera.position);
    cameras[i].updateMatrixWorld();
  }
  renderAll();
}
animate();

// 10) Render All Subplots (2 rows × 3 columns)
function renderAll() {
    renderer.setScissorTest(true);
    const width = window.innerWidth;
    const height = window.innerHeight;
    const subW = width / 3;
    const subH = height / 2;
    
    for (let i = 0; i < 6; i++) {
      const row = Math.floor(i / 3); 
      const col = i % 3;
      
      const viewportY = height - (row + 1) * subH;
      const viewportX = col * subW;
      
      cameras[i].aspect = subW / subH;
      cameras[i].updateProjectionMatrix();
      
      renderer.setViewport(viewportX, viewportY, subW, subH);
      renderer.setScissor(viewportX, viewportY, subW, subH);
      renderer.render(scenes[i], cameras[i]);

      const labelTop = height - viewportY - subH + 5;
      labels[i].style.left = (viewportX + 5) + "px";
      labels[i].style.top = labelTop + "px";
    }
  }
