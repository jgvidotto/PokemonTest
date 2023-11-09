import { placeModelOnDetectedPlane  } from './index.js';

var scene, camera, renderer, currentModelEntity;
let video = document.getElementById("videoInput"); // video is the id of video tag
// Function to start the video stream
export function startVideoStream() {
    // Define video constraints
    const constraints = {
        video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: "environment" // Use the rear camera on mobile devices
        },
        audio: false // Don't capture audio for this application
    };

    // Query the media devices API to access the webcam
    navigator.mediaDevices.getUserMedia(constraints)
        .then(stream => {
            // Assign the stream to the video element
            video.srcObject = stream;

            // Play the video
            video.play();
            // You might want to call your processing functions here
            // to start processing frames once the video is playing
            init();    
        })
        .catch(err => {
            console.error('Error accessing media devices.', err);
        });
}

function init() {
    // Initialization of Three.js scene, camera, renderer
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ alpha: true }); // Alpha: true for transparent background
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Create a model entity and add it to the scene
    currentModelEntity = new THREE.Object3D();
    //setModel(models[modelIndex], currentModelEntity);
    scene.add(currentModelEntity);

    // Further initialization...
    processFrame();
    updateScene();
}

// Function to capture frame and process with OpenCV.js
async function processFrame() {
  if (video.readyState === video.HAVE_ENOUGH_DATA) {
        let canvas = document.getElementById('frameCanvas');
        let context = canvas.getContext('2d', { willReadFrequently: true });
        // Resize the canvas to match the video dimensions
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        // Draw the video frame to the canvas
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);

        // Now, you can use the canvas with OpenCV's imread
        let frame = cv.imread('frameCanvas');

        // Convert the frame to a suitable format for processing
        let gray = new cv.Mat();
        cv.cvtColor(frame, gray, cv.COLOR_RGBA2GRAY, 0);

        // Feature Detection
        // For example, using the Shi-Tomasi corner detection algorithm
        let corners = new cv.Mat();
        let maxCorners = 100;
        let qualityLevel = 0.01;
        let minDistance = 10;
        let blockSize = 3;
        let useHarrisDetector = false;
        let k = 0.04;
        cv.goodFeaturesToTrack(gray, corners, maxCorners, qualityLevel, minDistance, new cv.Mat(), blockSize, useHarrisDetector, k);

        // Process the detected features to find a plane, using RANSAC
        // Assuming ransacForHorizontalPlane is implemented and expects an array of points
        let points = []; // Convert corners to an array of points
        for (let i = 0; i < corners.rows; i++) {
            points.push({ x: corners.data32F[i * 2], y: corners.data32F[i * 2 + 1] });
        }
        let numIterations = 100; // Example value, adjust as needed
        let distanceThreshold = 5;
        let planeModel = ransacForHorizontalPlane(points, numIterations, distanceThreshold);

        if (planeModel) {
			// Convert plane model to Three.js coordinates and orientation
			let planeNormal = new THREE.Vector3(planeModel.normal.x, planeModel.normal.y, planeModel.normal.z);
			let planePoint = new THREE.Vector3(planeModel.point.x, planeModel.point.y, planeModel.point.z);

			// Assuming you have a 3D object that you want to align with the plane
			let my3DObject = new THREE.Mesh(/* geometry, material */);
			scene.add(my3DObject);

			// Align the object with the plane
			alignObjectWithPlane(my3DObject, planePoint, planeNormal);

            if (planeModel) {
                // Call placeModelOnDetectedPlane here
                //placeModelOnDetectedPlane(planeModel);
            }
		}

		

        // Clean up memory
        frame.delete();
        gray.delete();
        corners.delete();
    }

    // Request the next frame
    requestAnimationFrame(processFrame);
}

function alignObjectWithPlane(object, planePoint, planeNormal) {
    // Position the object on the plane
    object.position.copy(planePoint);

    // Align object's up direction with the plane normal
    let up = new THREE.Vector3(0, 1, 0); // Assuming Y-up in Three.js
    let quaternion = new THREE.Quaternion().setFromUnitVectors(up, planeNormal.normalize());
    object.quaternion.copy(quaternion);

    // Optionally adjust the object's scale or additional rotation as needed
    // object.scale.set(1, 1, 1);
    // object.rotation.x = 0; // Additional rotations if necessary
}
		
// Function to update Three.js scene based on detected plane
function updateScene() {
     // Update position and orientation of AR content
    // This will depend on the plane estimation results

    // Render the Three.js scene
    renderer.render(scene, camera);

    // Request the next frame update
    requestAnimationFrame(updateScene);
}

function ransacForHorizontalPlane(points, numIterations, distanceThreshold) {
    let bestPlane = null;
    let bestConsensusSet = [];
    let bestConsensusSize = 0;

    for (let i = 0; i < numIterations; i++) {
        // Step 1: Randomly sample 3 points
        let sample = randomSample(points, 3);

        // Step 2: Fit plane model to the sample (assuming a horizontal plane)
        let planeModel = fitPlaneModel(sample);

        // Step 3 & 4: Determine the consensus set
        let consensusSet = points.filter(point => {
            let distance = distanceFromPlane(point, planeModel);
            return distance <= distanceThreshold;
        });

        // Step 5: Update the best model if the current one is better
        if (consensusSet.length > bestConsensusSize) {
            bestConsensusSize = consensusSet.length;
            bestConsensusSet = consensusSet;
            bestPlane = planeModel;
        }
    }

    return bestPlane; // This is the model for the horizontal plane
}

function randomSample(points, numSamples) {
    let shuffled = points.slice();
    let i = points.length, min = i - numSamples, temp, index;

    while (i-- > min) {
        index = Math.floor((i + 1) * Math.random());
        temp = shuffled[index];
        shuffled[index] = shuffled[i];
        shuffled[i] = temp;
    }

    return shuffled.slice(min);
}

function fitPlaneModel(points) {
    let avgY = points.reduce((sum, p) => sum + p.y, 0) / points.length;

    return { point: { x: 0, y: avgY, z: 0 }, normal: { x: 0, y: 1, z: 0 }};
}

function distanceFromPlane(point, planeModel) {
    return Math.abs(point.y - planeModel.point.y);
}
