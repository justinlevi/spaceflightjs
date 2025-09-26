import * as THREE from 'three';

let scene, camera, renderer;
let spaceship, spaceshipVelocity;
let asteroids = [];
let stars;
let keys = {};
let score = 0;
let health = 100;
let gameRunning = true;
let clock = new THREE.Clock();

const SPACESHIP_SPEED = 0.5;
const BOOST_MULTIPLIER = 2;
const ASTEROID_SPEED = 0.3;
const SPAWN_DISTANCE = 100;
const DESPAWN_DISTANCE = 20;
const COLLISION_DISTANCE = 2.5;

function init() {
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x000033, 0.008);

  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 5, 15);
  camera.lookAt(0, 0, 0);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.getElementById('app').appendChild(renderer.domElement);

  const ambientLight = new THREE.AmbientLight(0x404040);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(10, 10, 5);
  directionalLight.castShadow = true;
  directionalLight.shadow.camera.near = 0.1;
  directionalLight.shadow.camera.far = 100;
  directionalLight.shadow.camera.left = -50;
  directionalLight.shadow.camera.right = 50;
  directionalLight.shadow.camera.top = 50;
  directionalLight.shadow.camera.bottom = -50;
  scene.add(directionalLight);

  createStarfield();
  createSpaceship();

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('resize', onWindowResize);
}

function createStarfield() {
  const starsGeometry = new THREE.BufferGeometry();
  const starPositions = [];

  for (let i = 0; i < 10000; i++) {
    const x = (Math.random() - 0.5) * 2000;
    const y = (Math.random() - 0.5) * 2000;
    const z = (Math.random() - 0.5) * 2000;
    starPositions.push(x, y, z);
  }

  starsGeometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(starPositions, 3)
  );

  const starsMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.5,
    transparent: true,
    opacity: 0.8,
  });

  stars = new THREE.Points(starsGeometry, starsMaterial);
  scene.add(stars);
}

function createSpaceship() {
  const spaceshipGroup = new THREE.Group();

  const bodyGeometry = new THREE.ConeGeometry(1, 4, 8);
  const bodyMaterial = new THREE.MeshPhongMaterial({
    color: 0x0088ff,
    emissive: 0x0044aa,
    emissiveIntensity: 0.2,
    shininess: 100,
  });
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.rotation.x = Math.PI / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  spaceshipGroup.add(body);

  const wingGeometry = new THREE.BoxGeometry(4, 0.2, 2);
  const wingMaterial = new THREE.MeshPhongMaterial({
    color: 0x0066dd,
    emissive: 0x003388,
    emissiveIntensity: 0.2,
  });
  const wings = new THREE.Mesh(wingGeometry, wingMaterial);
  wings.position.z = 1;
  wings.castShadow = true;
  wings.receiveShadow = true;
  spaceshipGroup.add(wings);

  const engineGeometry = new THREE.CylinderGeometry(0.3, 0.5, 1, 8);
  const engineMaterial = new THREE.MeshPhongMaterial({
    color: 0xff4400,
    emissive: 0xff2200,
    emissiveIntensity: 0.5,
  });

  const engine1 = new THREE.Mesh(engineGeometry, engineMaterial);
  engine1.position.set(-1, 0, 2);
  engine1.rotation.x = Math.PI / 2;
  spaceshipGroup.add(engine1);

  const engine2 = new THREE.Mesh(engineGeometry, engineMaterial);
  engine2.position.set(1, 0, 2);
  engine2.rotation.x = Math.PI / 2;
  spaceshipGroup.add(engine2);

  const thrustLight1 = new THREE.PointLight(0xff4400, 1, 10);
  thrustLight1.position.set(-1, 0, 3);
  spaceshipGroup.add(thrustLight1);

  const thrustLight2 = new THREE.PointLight(0xff4400, 1, 10);
  thrustLight2.position.set(1, 0, 3);
  spaceshipGroup.add(thrustLight2);

  spaceship = spaceshipGroup;
  spaceshipVelocity = new THREE.Vector3(0, 0, 0);
  scene.add(spaceship);
}

function createAsteroid() {
  const size = Math.random() * 2 + 1;
  const detail = Math.floor(Math.random() * 2) + 1;

  const geometry = new THREE.IcosahedronGeometry(size, detail);
  const positions = geometry.attributes.position.array;

  for (let i = 0; i < positions.length; i += 3) {
    const vertex = new THREE.Vector3(
      positions[i],
      positions[i + 1],
      positions[i + 2]
    );
    vertex.normalize();
    vertex.multiplyScalar(size + (Math.random() - 0.5) * 0.5);
    positions[i] = vertex.x;
    positions[i + 1] = vertex.y;
    positions[i + 2] = vertex.z;
  }

  geometry.computeVertexNormals();

  const material = new THREE.MeshPhongMaterial({
    color: new THREE.Color(0.5 + Math.random() * 0.5, 0.3 + Math.random() * 0.3, 0.2),
    shininess: 10,
  });

  const asteroid = new THREE.Mesh(geometry, material);
  asteroid.position.set(
    (Math.random() - 0.5) * 60,
    (Math.random() - 0.5) * 30,
    -SPAWN_DISTANCE
  );

  asteroid.rotation.set(
    Math.random() * Math.PI * 2,
    Math.random() * Math.PI * 2,
    Math.random() * Math.PI * 2
  );

  asteroid.userData = {
    rotationSpeed: new THREE.Vector3(
      (Math.random() - 0.5) * 0.02,
      (Math.random() - 0.5) * 0.02,
      (Math.random() - 0.5) * 0.02
    ),
    size: size,
  };

  asteroid.castShadow = true;
  asteroid.receiveShadow = true;

  return asteroid;
}

function spawnAsteroids() {
  const spawnRate = Math.max(0.02, 0.05 - score * 0.0001);

  if (Math.random() < spawnRate) {
    const asteroid = createAsteroid();
    asteroids.push(asteroid);
    scene.add(asteroid);
  }
}

function updateAsteroids(deltaTime) {
  for (let i = asteroids.length - 1; i >= 0; i--) {
    const asteroid = asteroids[i];

    asteroid.position.z += ASTEROID_SPEED * deltaTime * 60;

    asteroid.rotation.x += asteroid.userData.rotationSpeed.x;
    asteroid.rotation.y += asteroid.userData.rotationSpeed.y;
    asteroid.rotation.z += asteroid.userData.rotationSpeed.z;

    if (asteroid.position.z > DESPAWN_DISTANCE) {
      scene.remove(asteroid);
      asteroids.splice(i, 1);
      score += 10;
      updateScore();
    }

    if (spaceship) {
      const distance = asteroid.position.distanceTo(spaceship.position);
      if (distance < COLLISION_DISTANCE + asteroid.userData.size) {
        handleCollision();
        scene.remove(asteroid);
        asteroids.splice(i, 1);
      }
    }
  }
}

function handleCollision() {
  health -= 20;
  updateHealth();

  spaceship.traverse((child) => {
    if (child.isMesh) {
      child.material.emissive = new THREE.Color(0xff0000);
      child.material.emissiveIntensity = 1;

      setTimeout(() => {
        if (child.material) {
          child.material.emissive = child.material.color;
          child.material.emissiveIntensity = 0.2;
        }
      }, 200);
    }
  });

  if (health <= 0) {
    gameOver();
  }
}

function updateSpaceship(deltaTime) {
  const speed = keys[' '] ? SPACESHIP_SPEED * BOOST_MULTIPLIER : SPACESHIP_SPEED;

  if (keys['ArrowLeft'] || keys['a'] || keys['A']) {
    spaceshipVelocity.x = Math.max(spaceshipVelocity.x - speed, -speed * 10);
  }
  if (keys['ArrowRight'] || keys['d'] || keys['D']) {
    spaceshipVelocity.x = Math.min(spaceshipVelocity.x + speed, speed * 10);
  }
  if (keys['ArrowUp'] || keys['w'] || keys['W']) {
    spaceshipVelocity.y = Math.min(spaceshipVelocity.y + speed, speed * 10);
  }
  if (keys['ArrowDown'] || keys['s'] || keys['S']) {
    spaceshipVelocity.y = Math.max(spaceshipVelocity.y - speed, -speed * 10);
  }

  spaceshipVelocity.multiplyScalar(0.95);

  spaceship.position.x += spaceshipVelocity.x * deltaTime;
  spaceship.position.y += spaceshipVelocity.y * deltaTime;

  spaceship.position.x = Math.max(-25, Math.min(25, spaceship.position.x));
  spaceship.position.y = Math.max(-15, Math.min(15, spaceship.position.y));

  spaceship.rotation.z = -spaceshipVelocity.x * 0.1;
  spaceship.rotation.x = -spaceshipVelocity.y * 0.1;

  camera.position.x = spaceship.position.x * 0.3;
  camera.position.y = spaceship.position.y * 0.3 + 5;
}

function updateScore() {
  document.getElementById('score').textContent = score;
}

function updateHealth() {
  document.getElementById('health').textContent = Math.max(0, health);
  const healthElement = document.getElementById('health');
  if (health <= 30) {
    healthElement.style.color = '#ff4444';
  } else if (health <= 60) {
    healthElement.style.color = '#ffaa00';
  } else {
    healthElement.style.color = '#ffffff';
  }
}

function gameOver() {
  gameRunning = false;
  document.getElementById('finalScore').textContent = score;
  document.getElementById('gameOver').style.display = 'block';
}

function onKeyDown(event) {
  keys[event.key] = true;
}

function onKeyUp(event) {
  keys[event.key] = false;
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);

  if (!gameRunning) return;

  const deltaTime = clock.getDelta();

  spawnAsteroids();
  updateAsteroids(deltaTime);
  updateSpaceship(deltaTime);

  if (stars) {
    stars.rotation.z += 0.0001;
  }

  renderer.render(scene, camera);
}

init();
animate();