import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import { XRPlanes } from 'XRPlanes';

let camera, scene, renderer, gltfLoader;
let controller, controllerGrip;
let xrSession = null;
let reticle;
let hitTestSource = null;

async function init() {
  // Set up the THREE.js scene
  scene = new THREE.Scene();

  // Set up the camera
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

  // Set up the WebGL renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  // Load the .glb model
  gltfLoader = new GLTFLoader();
  gltfLoader.load('./Assets/magnemite/scene.gltf', (gltf) => {
    // Store the loaded model for later use
    reticle = gltf.scene;
    reticle.visible = false; // Initially hidden until a plane is detected
    scene.add(reticle);
  });

  // Set up the controller for input
  controller = renderer.xr.getController(0);
  controller.addEventListener('select', onSelect);
  scene.add(controller);

  // Start the WebXR AR session
  navigator.xr.requestSession('immersive-ar', { requiredFeatures: ['local-floor', 'hit-test'] })
    .then(onSessionStarted);
}

function onSessionStarted(session) {
  xrSession = session;
  renderer.xr.setSession(session);
  session.addEventListener('end', onSessionEnded);

  // Set up hit test source
  session.requestReferenceSpace('viewer').then((referenceSpace) => {
    session.requestHitTestSource({ space: referenceSpace }).then((source) => {
      hitTestSource = source;
    });
  });

  // Set up the environment with detected planes
  const planes = new XRPlanes();
  planes.addEventListener('planeadded', onPlaneAdded);
  scene.add(planes);
}

function onPlaneAdded(event) {
    const plane = event.plane;
  
    // Create a mesh to visually represent the plane in the scene
    const geometry = new THREE.PlaneGeometry(plane.width, plane.height);
    const material = new THREE.MeshBasicMaterial({
      color: 0x00FF00, // Example: Green color for the plane
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.5
    });
    const mesh = new THREE.Mesh(geometry, material);
  
    // Set the mesh position and orientation based on the plane's pose
    // The pose contains the position and orientation in a matrix form
    mesh.matrixAutoUpdate = false;
    mesh.matrix.fromArray(plane.poseMatrix);
    mesh.userData.plane = plane; // Store the plane data for later use if needed
  
    // Add the mesh to the scene
    scene.add(mesh);
}

function onSelect() {
  if (reticle.visible) {
    // Place the model at the reticle's position
    const model = reticle.clone();
    model.position.setFromMatrixPosition(reticle.matrix);
    model.visible = true;
    scene.add(model);
  }
}

function onSessionEnded(event) {
  xrSession = null;
}

function animate() {
  renderer.setAnimationLoop(render);
}

function render(timestamp, frame) {
  if (frame) {
    const hitTestResults = frame.getHitTestResults(hitTestSource);
    if (hitTestResults.length > 0) {
      const hit = hitTestResults[0];
      const pose = hit.getPose(renderer.xr.getReferenceSpace());
      reticle.matrix.fromArray(pose.transform.matrix);
      reticle.visible = true;
    } else {
      reticle.visible = false;
    }
  }

  renderer.render(scene, camera);
}

init();
animate();
