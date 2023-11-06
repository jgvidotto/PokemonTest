var modelEntity;

window.onload = () => {
    // Register event listeners
 

    staticLoadPlaces().then(places => {
        renderPlaces(places);
    }).catch(error => {
        console.error(error);
    });
    
    cameraEl = document.querySelector('a-camera');
    sceneEl = document.querySelector('a-scene');
    
    window.addEventListener('touchstart', onTouchStart, { passive: false });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd, { passive: false });
};

var isMoving = false;
var lastPinchDistance = null;

function onTouchStart(event) {
    // Prevent default behavior
    event.preventDefault();
    isMoving = true;
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
    } else if (event.touches.length == 1 && isMoving) {
        console.log("AQUI");
        var touchPosition3D = getTouchPositionIn3D(event.touches[0]);

        // Update model position
        if (touchPosition3D) {
            console.log("touchPosition3D");
            modelEntity.setAttribute('position', touchPosition3D);
        }
    }
}

function onTouchEnd(event) {
    if (event.touches.length < 2) {
        lastPinchDistance = null;
    }
    isMoving = false;
}

function getTouchPositionIn3D(touchEvent) {
    // Calculate the normalized position of the touch event on the screen
    var touchX = (touchEvent.clientX / window.innerWidth) * 2 - 1;
    var touchY = -(touchEvent.clientY / window.innerHeight) * 2 + 1;
  
    // Create a raycaster and set its origin and direction
    var raycaster = new THREE.Raycaster();
    raycaster.setFromCamera({x: touchX, y: touchY}, cameraEl.getObject3D('camera'));
  
    // Perform the raycast
    var intersects = raycaster.intersectObjects(sceneEl.object3D.children, true);
  
    // If there is an intersection, return the point of intersection
    if (intersects.length > 0) {
        var intersectionPoint = intersects[0].point;
        return intersectionPoint;
    }
  
    return null;
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