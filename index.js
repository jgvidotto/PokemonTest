// Import the necessary modules from Three.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';

// Declare your variables
let camera, scene, renderer, gltfLoader;
let controller;
let xrSession = null;
let reticle;
let hitTestSource = null;

// This event listener will call init() when the 'start-xr' button is clicked.
document.getElementById('start-xr').addEventListener('click', init);

async function init() {
  // Set up the THREE.js scene
  console.log('Init function called');
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

  // Remove the event listener to prevent multiple bindings
  document.getElementById('start-xr').removeEventListener('click', init);

  // Request the session within the user gesture event listener
  navigator.xr.requestSession('immersive-ar', { requiredFeatures: ['local-floor', 'hit-test'] })
    .then(onSessionStarted)
    .catch(err => {
      console.error('Could not start AR session.', err);
    });
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

  // Start the animation loop here, after the session has started
  animate();
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
