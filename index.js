var modelEntity;
var cameraEl;
var sceneEl;
var intersectionPlane;
var isMoving = false;
var lastPinchDistance = null;
var raycaster = new THREE.Raycaster();
var planeMesh;

function setupCameraAndScene() {
    cameraEl = document.querySelector('a-camera');
    sceneEl = document.querySelector('a-scene');

    if (!cameraEl || !sceneEl) {
        console.error('Camera or Scene not found!');
        return;
    }

    setupIntersectionPlane();
}

function setupIntersectionPlane() {
    if (sceneEl) {
        var planeGeometry = new THREE.PlaneGeometry(1000, 1000);
        var planeMaterial = new THREE.MeshBasicMaterial({
            color: 0xffff00, // Color is irrelevant since the plane will be invisible
            side: THREE.DoubleSide,
            // Removed the visible property from material and set the mesh visibility to false instead
        });
        // Assign the new mesh to the global variable planeMesh
        planeMesh = new THREE.Mesh(planeGeometry, planeMaterial);
        planeMesh.visible = false; // Make the mesh invisible
        sceneEl.object3D.add(planeMesh);
    }
}

window.onload = () => {
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
            moveModelToTouchPosition(event.touches[0]);
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
    raycaster.setFromCamera({ x: normalizedPosition.x, y: normalizedPosition.y }, cameraEl.getObject3D('camera'));
    
    // Perform the raycast
    var intersects = raycaster.intersectObject(planeMesh);
    
    // Debugging: log the intersects to see if and where it's occurring
    console.log(intersects);
    
    // If there is an intersection, return the point of intersection
    if (intersects.length > 0) {
        return intersects[0].point;
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