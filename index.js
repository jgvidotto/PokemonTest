import { startVideoStream } from './opencvtest.js';

window.onload = () => {
  startVideoStream();
};


var model = {
    url: './Assets/bear.glb',
    scale: '1.5 1.5 1.5',
    position: '1 1.5 -3.5',
};


export function setModel(model, entity) {
  if (model.scale) {
      entity.setAttribute('scale', model.scale);
  }

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

export function placeModelOnDetectedPlane(planeModel) {
  let scene = document.querySelector('a-scene');

  // Assuming planeModel contains the position where you want to place the model
  let position = planeModel.point; // Modify this based on how your planeModel is structured

  let modelEntity = document.createElement('a-entity');
  setModel(model, modelEntity);

  modelEntity.setAttribute('position', `${position.x} ${position.y} ${position.z}`);
  scene.appendChild(modelEntity);
}