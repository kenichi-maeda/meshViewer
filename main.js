import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';


// ------------------------------------------------------------------------
// CONFIGURATION
// ------------------------------------------------------------------------
const testFolders = ['meshes/test1/', 'meshes/test2/', 'meshes/test3/', 'meshes/test4/'];
const meshInfos = [
  { file: 'original.obj',    label: 'Original' },
  { file: 'pymeshfix.obj',   label: 'PyMeshFix' },
  { file: 'pymesh.obj',      label: 'PyMesh' },
  { file: 'meshlib.obj',     label: 'MeshLib' },
  { file: 'surfacenets.obj', label: 'SurfaceNets' },
  { file: 'localremesh.obj', label: 'Local Remesh' }
];

const rows    = testFolders.length;
const columns = meshInfos.length; 
const totalMeshes = rows * columns;


const headingHeight = 50;
const subH          = 300;
const rowSpacing    = 40;
const rowHeight     = headingHeight + subH + rowSpacing;
const canvasHeight  = rowHeight * rows + 20;

const intersectingFacesDataArray = new Array(rows).fill(null);

// For each test case folder, fetch the corresponding intersection.json
testFolders.forEach((folder, rowIndex) => {
  fetch(folder + 'intersection.json')
    .then(response => response.json())
    .then(data => {
      intersectingFacesDataArray[rowIndex] = data;
      renderAll();
    })
    .catch(err => console.error('Error loading intersections for row', rowIndex, err));
});

// ------------------------------------------------------------------------
// CREATE RENDERER & CONTAINER
// ------------------------------------------------------------------------
const container = document.getElementById('container');
container.style.height = canvasHeight + 'px';

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, canvasHeight);

renderer.localClippingEnabled = true;
renderer.setScissorTest(true);

container.appendChild(renderer.domElement);

// ------------------------------------------------------------------------
// CREATE SCENES & CAMERAS FOR EACH SUBPLOT
// ------------------------------------------------------------------------
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

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
  camera.position.set(0, 3, 10);
  cameras.push(camera);
}
const masterCamera = cameras[0];
const controls = new OrbitControls(masterCamera, renderer.domElement);
controls.enableDamping = true;

// ------------------------------------------------------------------------
// CREATE A CLIPPING PLANE PER ROW
// ------------------------------------------------------------------------
const clipPlanes = [];
for (let i = 0; i < rows; i++) {
  const plane = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0);
  clipPlanes.push(plane);
}

// ------------------------------------------------------------------------
// BUILD HEADINGS ("Case X" + slider) FOR EACH ROW
// ------------------------------------------------------------------------
for (let rowIndex = 0; rowIndex < rows; rowIndex++) {
  const headingDiv = document.createElement('div');
  headingDiv.className = 'case-heading';

  const rowTop = rowIndex * rowHeight + 10;
  headingDiv.style.top = rowTop + 'px';
  headingDiv.style.left = '20px';
  headingDiv.style.width = 'calc(100% - 40px)';
  
  // "Case X" label
  const titleSpan = document.createElement('span');
  titleSpan.textContent = 'Case ' + (rowIndex + 1);

  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = '-5';
  slider.max = '5';
  slider.step = '0.1';
  slider.value = '0';
  slider.className = 'slider';

  slider.addEventListener('input', e => {
    clipPlanes[rowIndex].constant = parseFloat(e.target.value);
    renderAll();
  });

  headingDiv.appendChild(titleSpan);
  headingDiv.appendChild(slider);
  container.appendChild(headingDiv);
}

// ------------------------------------------------------------------------
// LOAD MESHES INTO EACH (row, column) SCENE
// ------------------------------------------------------------------------
const loader = new OBJLoader();
testFolders.forEach((folder, rowIndex) => {
  meshInfos.forEach((meshInfo, colIndex) => {
    const overallIndex = rowIndex * columns + colIndex;
    const url = folder + meshInfo.file;

    loader.load(
      url,
      object => {
        object.traverse(child => {
          if (child.isMesh) {
            if (meshInfo.file === 'original.obj' && intersectingFacesDataArray[rowIndex]) {
              let geometry = child.geometry;
              if (geometry.index) {
                geometry = geometry.toNonIndexed();
              }
              geometry.computeVertexNormals();
              
              const positionAttr = geometry.attributes.position;
              const faceCount = positionAttr.count / 3;
              const colors = new Float32Array(positionAttr.count * 3);
              
              // Get the intersection data
              const intersectingFaces = intersectingFacesDataArray[rowIndex];
              
              for (let i = 0; i < faceCount; i++) {
                // Highlight in red if the face index is in the intersection data; otherwise white.
                const isIntersecting = intersectingFaces.includes(i);
                const color = isIntersecting ? [1, 0, 0] : [1, 1, 1];
                for (let j = 0; j < 3; j++) {
                  const vertexIndex = i * 3 + j;
                  colors[vertexIndex * 3 + 0] = color[0];
                  colors[vertexIndex * 3 + 1] = color[1];
                  colors[vertexIndex * 3 + 2] = color[2];
                }
              }
              
              geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
              child.geometry = geometry;
              
              child.material = new THREE.MeshPhongMaterial({
                vertexColors: true,
                polygonOffset: true,
                polygonOffsetFactor: 1,
                polygonOffsetUnits: 1,
                side: THREE.DoubleSide,
                clippingPlanes: [clipPlanes[rowIndex]]
              });
              
              const wireframeGeo = new THREE.WireframeGeometry(geometry);
              const wireframeMat = new THREE.LineBasicMaterial({
                color: 0x000000,
                clippingPlanes: [clipPlanes[rowIndex]]
              });
              const wireframe = new THREE.LineSegments(wireframeGeo, wireframeMat);
              child.add(wireframe);
            } else {
              child.geometry.computeVertexNormals();
              child.material = new THREE.MeshPhongMaterial({
                color: 0xffffff,
                polygonOffset: true,
                polygonOffsetFactor: 1,
                polygonOffsetUnits: 1,
                side: THREE.DoubleSide,
                clippingPlanes: [clipPlanes[rowIndex]]
              });
              
              const wireframeGeo = new THREE.WireframeGeometry(child.geometry);
              const wireframeMat = new THREE.LineBasicMaterial({
                color: 0x000000,
                clippingPlanes: [clipPlanes[rowIndex]]
              });
              const wireframe = new THREE.LineSegments(wireframeGeo, wireframeMat);
              child.add(wireframe);
            }
          }
        });
        
        scenes[overallIndex].add(object);
        renderAll();
      },
      undefined,
      err => console.error('Error loading ' + url, err)
    );
    
    
    
  });
});

// ------------------------------------------------------------------------
// CREATE OVERLAY LABELS FOR EACH SUBPLOT (method name in top-left corner)
// ------------------------------------------------------------------------
const labels = [];
for (let i = 0; i < totalMeshes; i++) {
  const labelDiv = document.createElement('div');
  labelDiv.className = 'subplot-label';
  const col = i % columns;
  labelDiv.innerText = meshInfos[col].label;
  container.appendChild(labelDiv);
  labels.push(labelDiv);
}

// ------------------------------------------------------------------------
// HANDLE WINDOW RESIZING
// ------------------------------------------------------------------------
window.addEventListener('resize', onWindowResize);
function onWindowResize() {
  renderer.setSize(window.innerWidth, canvasHeight);
  renderAll();
}

// ------------------------------------------------------------------------
// ANIMATION LOOP
// ------------------------------------------------------------------------
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

// ------------------------------------------------------------------------
// RENDER ALL SUBPLOTS
// ------------------------------------------------------------------------
function renderAll() {
  const width = container.clientWidth;
  const subW = width / columns;

  for (let i = 0; i < totalMeshes; i++) {
    const row = Math.floor(i / columns);
    const col = i % columns;

    const rowTop = row * rowHeight + headingHeight;

    const viewportY = canvasHeight - (rowTop + subH);
    const viewportX = col * subW;

    cameras[i].aspect = subW / subH;
    cameras[i].updateProjectionMatrix();

    renderer.setViewport(viewportX, viewportY, subW, subH);
    renderer.setScissor(viewportX, viewportY, subW, subH);
    renderer.render(scenes[i], cameras[i]);

    const labelDiv = labels[i];
    labelDiv.style.left = (viewportX + 5) + 'px';
    labelDiv.style.top  = (canvasHeight - viewportY - subH + 5) + 'px';
  }
}
