var modelEntity;

window.onload = () => {
    staticLoadPlaces().then(places => {
        renderPlaces(places);
    }).catch(error => {
        console.error(error);
    });
    cameraEl = document.querySelector('a-camera');
    sceneEl = document.querySelector('a-scene');

    // Register event listeners
    window.addEventListener('touchstart', onTouchStart);
    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('touchend', onTouchEnd);
};

var isMoving = false;

function onTouchStart(event) {
    // Prevent default behavior
    event.preventDefault();
    isMoving = true;
}


function onTouchMove(event) {
    if (isMoving) {
        var touchPosition3D = getTouchPositionIn3D(event.touches[0]);

        // Update model position
        if (touchPosition3D) {
            modelEntity.setAttribute('position', touchPosition3D);
        }
    }
}

function onTouchEnd(event) {
    isMoving = false;
}

function getTouchPositionIn3D(touchEvent) {
    // Calculate the position of the touch event on the screen
    var touchX = touchEvent.touches[0].clientX;
    var touchY = touchEvent.touches[0].clientY;
  
    // Create a raycaster and set its origin and direction
    var raycaster = new THREE.Raycaster();
    raycaster.setFromCamera({x: touchX, y: touchY}, cameraEl.getObject3D('camera'));
  
    // Define the plane or surface you expect to intersect with the ray
    // This might be a ground plane or other geometry in your scene
    var planeGeometry = new THREE.PlaneGeometry(1000, 1000); // Large enough to receive the ray
    var planeMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00, side: THREE.DoubleSide });
    var planeMesh = new THREE.Mesh(planeGeometry, planeMaterial);
    planeMesh.visible = false; // Hide it since it's just for raycasting
    sceneEl.object3D.add(planeMesh);
  
    // Perform the raycast
    var intersects = raycaster.intersectObject(planeMesh);
  
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