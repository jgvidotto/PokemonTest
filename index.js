import { XRPlanes } from 'XRPlanes';

var modelEntity;
var cameraEl;
var sceneEl;
var intersectionPlane;
var isMoving = false;
var lastPinchDistance = null;
var raycaster = new THREE.Raycaster();
var planeMesh;

function setupRenderer() {
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.xr.enabled = true; // Enable XR
    return renderer;
}

function setupCameraAndScene() {
    cameraEl = document.querySelector('a-camera');
    sceneEl = document.querySelector('a-scene');
    
    if (!cameraEl || !sceneEl) {
      console.error('Camera or Scene not found!');
      return;
    }
  
    // Setup the renderer and assign it to the scene
    sceneEl.renderer = setupRenderer(); // This line is new
    // Removed initializeXRPlaneDetection call from here
}

function startXR() {
    if (navigator.xr) {
      navigator.xr.requestSession('immersive-ar', {
        requiredFeatures: ['local-floor', 'bounded-floor', 'hit-test']
      }).then((session) => {
        sceneEl.renderer.xr.setSession(session);
        initializeXRPlaneDetection();
      }).catch((error) => {
        console.error('Could not start XR session:', error);
      });
    } else {
      console.error('WebXR not available');
    }
}

async function initializeXRPlaneDetection() {
    const renderer = sceneEl.renderer;
    const session = renderer.xr.getSession();
  
    let xrPlaneDetector = new XRPlanes(session);
    
    // Listen for the 'planesadded' event to handle newly detected planes
    xrPlaneDetector.addEventListener('planesadded', (event) => {
      event.planes.forEach((plane) => {
        setupIntersectionPlane(plane);
      });
    });
  
    // Start the plane detection
    xrPlaneDetector.start();
  }

function showStartPrompt() {
    // Create a prompt for the user to start the experience
    const startPrompt = document.createElement('div');
    startPrompt.textContent = 'Tap anywhere to start';
    startPrompt.style.position = 'absolute';
    startPrompt.style.top = '50%';
    startPrompt.style.left = '50%';
    startPrompt.style.transform = 'translate(-50%, -50%)';
    startPrompt.style.color = 'white';
    startPrompt.style.backgroundColor = 'black';
    startPrompt.style.padding = '10px';
    startPrompt.style.cursor = 'pointer';
    document.body.appendChild(startPrompt);

    // Use a user gesture to start the AR experience
    startPrompt.addEventListener('click', function () {
        startXR();
        document.body.removeChild(startPrompt); // Remove the prompt after starting the AR
    });
}

function setupIntersectionPlane(plane) {
    if (sceneEl) {
        var planeGeometry = new THREE.PlaneGeometry(plane.extend.width, plane.extend.height);
        var planeMaterial = new THREE.MeshBasicMaterial({
            color: 0xffff00, 
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.5
        });
        // Assign the new mesh to the global variable planeMesh
        planeMesh = new THREE.Mesh(planeGeometry, planeMaterial);
        planeMesh.position.copy(plane.position);
        planeMesh.quaternion.copy(plane.orientation);
        planeMesh.visible = true; 
        sceneEl.object3D.add(planeMesh);
    }
}

window.onload = () => {
    showStartPrompt();
    setupCameraAndScene();

    staticLoadPlaces().then(places => {
        renderPlaces(places);
    }).catch(error => {
        console.error(error);
    });
    // Register event listeners
    window.addEventListener('touchstart', onTouchStart, { passive: false });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd, { passive: false });
};

function onTouchStart(event) {
    // Prevent default behavior
    event.preventDefault();
    isMoving = true;
    if (event.touches.length === 1) {
        this.isPotentialTap = true;
        this.startTapPosition = {
            x: event.touches[0].clientX,
            y: event.touches[0].clientY
        };
    }
}


function onTouchMove(event) {
    if (event.touches.length == 2) {
        // Prevent the default touch behavior
        event.preventDefault();

        // Calculate pinch distance
        var touch1 = {x: event.touches[0].clientX, y: event.touches[0].clientY};
        var touch2 = {x: event.touches[1].clientX, y: event.touches[1].clientY};
        var pinchDistance = Math.hypot(touch2.x - touch1.x, touch2.y - touch1.y);

        // Check if last pinch distance is set; if not, set it to the current distance
        if (lastPinchDistance === null) {
            lastPinchDistance = pinchDistance;
        }

        // Calculate scale factor based on the pinch distance change
        var scaleFactor = pinchDistance / lastPinchDistance;

        // Get current scale of the model
        var currentScale = modelEntity.getAttribute('scale') || {x: 1, y: 1, z: 1};
        var newScale = {
            x: currentScale.x * scaleFactor,
            y: currentScale.y * scaleFactor,
            z: currentScale.z * scaleFactor
        };

        // Set the new scale to the model
        modelEntity.setAttribute('scale', newScale);

        // Update lastPinchDistance for the next move event
        lastPinchDistance = pinchDistance;
    } else if (event.touches.length == 1) {
        if (this.isPotentialTap) {
            // Check if the finger has moved significantly
            if (hasMovedSignificantly(event.touches[0])) {
                this.isPotentialTap = false; // No longer a tap, start dragging
                moveModelToTouchPosition(event.touches[0]);
            }
        } else {
            if (isMoving) {
                moveModelToTouchPosition(event.touches[0]);
            }
        }
    }
}

function onTouchEnd(event) {
    if (this.isPotentialTap && event.touches.length === 0) {
        // If the finger is lifted and it was a potential tap, place the model
        placeModelAtTap(this.startTapPosition);
        this.isPotentialTap = false;
    } else if (event.touches.length < 2) {
        lastPinchDistance = null;
    }
    isMoving = false;
}

function hasMovedSignificantly(touch) {
    // Define what you consider as a significant move
    const threshold = 10; // pixels
    var dx = touch.clientX - this.startTapPosition.x;
    var dy = touch.clientY - this.startTapPosition.y;
    return Math.abs(dx) > threshold || Math.abs(dy) > threshold;
}

function moveModelToTouchPosition(touch) {
    var touchPosition3D = getTouchPositionIn3D(touch);
    console.log(touchPosition3D);
    if (touchPosition3D) {
        modelEntity.setAttribute('position', touchPosition3D);
    }
}

function placeModelAtTap(touchPosition) {
    var touchPosition3D = getTouchPositionIn3D(touchPosition);
    if (touchPosition3D) {
        modelEntity.setAttribute('position', touchPosition3D);
    }
}

function getTouchPositionIn3D(touchEvent) {
    var touchX = touchEvent.clientX;
    var touchY = touchEvent.clientY;
    
    var normalizedPosition = getNormalizedTouchPosition(touchX, touchY, window.innerWidth, window.innerHeight);
    console.log('Normalized Position:', normalizedPosition);

    // Get the camera object from the camera entity
    var cameraObject = cameraEl.getObject3D('camera');
    if (!cameraObject) {
        console.error('Camera object not found in camera entity.');
        return null;
    }

    raycaster.setFromCamera({ x: normalizedPosition.x, y: normalizedPosition.y }, cameraObject);
    console.log('Ray:', raycaster.ray);
    
    // Make sure the planeMesh is in the scene and updated
    if (planeMesh) {
        planeMesh.updateMatrixWorld();
        var intersects = raycaster.intersectObject(planeMesh);
        
        console.log('Intersects:', intersects);
        
        if (intersects.length > 0) {
            return intersects[0].point;
        }
    } else {
        console.error('planeMesh not found in the scene.');
    }
    
    return null;
}

function getNormalizedTouchPosition(touchX, touchY, width, height) {
    return {
        x: (touchX / width) * 2 - 1,
        y: -(touchY / height) * 2 + 1
    };
}

function staticLoadPlaces() {
    return new Promise((resolve, reject) => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(position => {
                resolve([{
                    name: 'Bear',
                    location: {
                        lat: position.coords.latitude ,
                        lng: position.coords.longitude,
                    },
                }]);
            }, error => {
                reject(error);
            });
        } else {
            reject(new Error("Geolocation is not supported by this browser."));
        }
        
    });
}

var models = [
    {
        url: './Assets/magnemite/scene.gltf',
        scale: '25 25 25',
        position: '1 1.5 -20.5',
    },
];

var modelIndex = 0;
var setModel = function (model, entity, distanceInFeet) {
    const scaleFactor = calculateScale(distanceInFeet, 4, 2);

    const scale = `${scaleFactor} ${scaleFactor} ${scaleFactor}`;
    entity.setAttribute('scale', scale);

    if (model.rotation) {
        entity.setAttribute('rotation', model.rotation);
        console.log(model.rotation);
    }

    if (model.position) {
        entity.setAttribute('position', model.position);
    }

    if (model.animation) {
        entity.setAttribute('animation-mixer', {clip: model.animation});
    }

    entity.setAttribute('gltf-model', model.url);
};

function calculateScale(distanceInFeet, desiredHeightInFeet, actualHeightInFeet) {
    return (desiredHeightInFeet / actualHeightInFeet) * (distanceInFeet / 10);
}

function renderPlaces(places) {
    let scene = document.querySelector('a-scene');

    places.forEach((place) => {
        let latitude = place.location.lat;
        let longitude = place.location.lng;

        let outerEntity = document.createElement('a-entity');
        console.log(latitude);
        console.log(longitude);
        outerEntity.setAttribute('gps-entity-place', `latitude: ${latitude}; longitude: ${longitude};`);
        modelEntity = document.createElement('a-entity');
        const distanceInFeet = 10;  

        setModel(models[modelIndex], modelEntity, distanceInFeet);

        modelEntity.setAttribute('animation-mixer', '');
        modelEntity.setAttribute("look-at", "[gps-new-camera]");

        outerEntity.appendChild(modelEntity);
        scene.appendChild(outerEntity);
    });
}