import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import * as dat from 'lil-gui';
import CANNON from 'cannon';

THREE.ColorManagement.enabled = false;

/**
 * Debug
 */
const gui = new dat.GUI();
const debugObject = {};

debugObject.createSphere = () => {
  createSphere(0.5, {
    x: 0,
    y: 0,
    z: 4,
  });
};

debugObject.createBox = () => {
  createBox(Math.random(), Math.random(), Math.random(), {
    x: (Math.random() - 0.5) * 3,
    y: 3,
    z: (Math.random() - 0.5) * 3,
  });
};
gui.add(debugObject, 'createBox');

gui.add(debugObject, 'createSphere');
/**
 * Base
 */
// Canvas
const canvas = document.querySelector('canvas.webgl');

// Scene
const scene = new THREE.Scene();

/**
 * Textures
 */
const textureLoader = new THREE.TextureLoader();
const cubeTextureLoader = new THREE.CubeTextureLoader();

const environmentMapTexture = cubeTextureLoader.load([
  '/textures/environmentMaps/0/px.png',
  '/textures/environmentMaps/0/nx.png',
  '/textures/environmentMaps/0/py.png',
  '/textures/environmentMaps/0/ny.png',
  '/textures/environmentMaps/0/pz.png',
  '/textures/environmentMaps/0/nz.png',
]);

const world = new CANNON.World();
world.gravity.set(0, -9.82, 0);

const defaultMaterial = new CANNON.Material('default');
const defaultContactMaterial = new CANNON.ContactMaterial(
  defaultMaterial,
  defaultMaterial,
  {
    friction: 0.1,
    restitution: 0.3,
  }
);
world.addContactMaterial(defaultContactMaterial);
world.defaultContactMaterial = defaultContactMaterial;

const floorShape = new CANNON.Plane();
const floorBody = new CANNON.Body();
floorBody.mass = 0;
floorBody.addShape(floorShape);

floorBody.quaternion.setFromAxisAngle(new CANNON.Vec3(-1, 0, 0), Math.PI * 0.5);
world.addBody(floorBody);

/**
 * Test sphere
 */

/**
 * Floor
 */
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(10, 10),
  new THREE.MeshStandardMaterial({
    color: '#777777',
    metalness: 0.3,
    roughness: 0.4,
    envMap: environmentMapTexture,
    envMapIntensity: 0.5,
  })
);
floor.receiveShadow = true;
floor.rotation.x = -Math.PI * 0.5;
floor.userData.ground = true;
scene.add(floor);

/**
 * Lights
 */
const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.2);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.set(1024, 1024);
directionalLight.shadow.camera.far = 15;
directionalLight.shadow.camera.left = -7;
directionalLight.shadow.camera.top = 7;
directionalLight.shadow.camera.right = 7;
directionalLight.shadow.camera.bottom = -7;
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

/**
 * Sizes
 */
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

window.addEventListener('resize', () => {
  // Update sizes
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  // Update camera
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  // Update renderer
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(
  75,
  sizes.width / sizes.height,
  0.1,
  100
);
camera.position.set(-3, 3, 3);
scene.add(camera);

// Controls
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
});
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

var objectsToUpdate = [];

const sphereGeometry = new THREE.SphereGeometry(1, 20, 20);
const sphereMaterial = new THREE.MeshStandardMaterial({
  metalness: 0.3,
  roughness: 0.4,
  envMap: environmentMapTexture,
  envMapIntensity: 0.5,
});

const createSphere = (radius, position) => {
  // Three.js mesh
  const mesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
  mesh.castShadow = true;
  mesh.scale.set(radius, radius, radius);
  mesh.position.copy(position);
  scene.add(mesh);
  mesh.userData.draggable = true;
  mesh.userData.name = 'SPHERE';

  // Cannon.js body
  const shape = new CANNON.Sphere(radius);

  const body = new CANNON.Body({
    mass: 1,
    position: new CANNON.Vec3(0, 0, 0),
    shape: shape,
    material: defaultMaterial,
  });
  body.position.copy(position);
  world.addBody(body);

  objectsToUpdate.push({ mesh, body });
};

createSphere(0.5, { x: 0, y: 0.01, z: 3 });

// Create box
const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
const boxMaterial = new THREE.MeshStandardMaterial({
  metalness: 0.3,
  roughness: 0.4,
  envMap: environmentMapTexture,
  envMapIntensity: 0.5,
});

const createBox = (width, height, depth, position) => {
  // Cannon.js body
  const shape = new CANNON.Box(
    new CANNON.Vec3(width * 0.5, height * 0.5, depth * 0.5)
  );

  const body = new CANNON.Body({
    mass: 1,
    position: new CANNON.Vec3(
      position.x,
      position.y + height * 0.5,
      position.z
    ),
    shape: shape,
    material: defaultMaterial,
  });
  body.position.copy(position);

  // Three.js mesh
  const mesh = new THREE.Mesh(boxGeometry, boxMaterial);
  mesh.scale.set(width, height, depth);
  mesh.castShadow = true;
  mesh.position.copy(body.position);
  scene.add(mesh);
  mesh.userData.draggable = true;
  mesh.userData.name = 'BOX';

  world.addBody(body);
  // Save in objects
  objectsToUpdate.push({ mesh, body });
};

const numLayers = 5;
const blocksPerLayer = 3;


for (let i = 0; i < numLayers; i++) {
  for (let j = 0; j < blocksPerLayer; j++) {
    createBox(2, 1, 1, {
      x: j * 2,
      y: i + 0.5,
      z: 0,
    });
  }
}



const raycaster = new THREE.Raycaster();
const clickMouse = new THREE.Vector2();
const moveMouse = new THREE.Vector2();

var draggable = THREE.Object3D;

window.addEventListener('click', (e) => {
  if (draggable?.userData?.name) {
    console.log(`drop ${draggable.userData.name} `);
    draggable = null;
    return;
  }

  clickMouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  clickMouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(clickMouse, camera);
  const found = raycaster.intersectObjects(scene.children);
  if (found.length > 0 && found[0].object.userData.draggable) {
    draggable = found[0].object;
    console.log(draggable);

    for (const item of objectsToUpdate) {
      if (item.mesh.uuid === draggable.uuid)
        item.body.applyImpulse(
          new CANNON.Vec3(0, 10, -25),
          new CANNON.Vec3(0, 0, 0)
        );
    }
    console.log(500 * (1 / 60));
  }
});

window.addEventListener('mousemove', (e) => {
  moveMouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  moveMouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
});

function draggObject() {
  if (draggable !== null) {
    raycaster.setFromCamera(moveMouse, camera);
    const found = raycaster.intersectObjects(scene.children);
    if (found.length > 0) {
      for (let item of found) {
        if (!item.object.userData.ground) continue;

        draggable.position.x = item.point.x;
        draggable.position.z = item.point.z;
      }
    }
  }
}

/**
 * Animate
 */
const clock = new THREE.Clock();
let oldElapsedTime = 0;

const tick = () => {
  const elapsedTime = clock.getElapsedTime();
  const deltaTime = elapsedTime - oldElapsedTime;
  oldElapsedTime = elapsedTime;

  world.step(1 / 60, deltaTime, 3);

  for (const object of objectsToUpdate) {
    object.mesh.position.copy(object.body.position);
    object.mesh.quaternion.copy(object.body.quaternion);
  }

  // Update controls
  controls.update();

  // Render
  renderer.render(scene, camera);

  // Call tick again on the next frame
  window.requestAnimationFrame(tick);
};

tick();
