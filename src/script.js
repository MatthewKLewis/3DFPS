import './style.css'
import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { GlitchPass } from 'three/examples/jsm/postprocessing/GlitchPass.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';

const canvas = document.querySelector('canvas.webgl')
const stats = document.querySelector('#stats')
const popup = document.querySelector('#popup')
const icon = document.querySelector('#icon')
const comms = document.querySelector('#comms')
const next = document.querySelector('#next')

const scene = new THREE.Scene()

// ----------------------------SET-------------------------------- //

//#region [rgba(255, 25, 25, 0.15) ] STORY
/*  
* 
* This section has NPC and STORY info
*
*/
const VOWELS = "aeiou".split('')
const CONSONANTS = "bcdfghjklmnpqrstvwxyz".split('')
var SYLLABLES = []
for (let i = 0; i < CONSONANTS.length; i++) {
    for (let j = 0; j < VOWELS.length; j++) {
        SYLLABLES.push(CONSONANTS[i] + VOWELS[j])
    }
}
function getAbjadWord(syllables) {
    var tempString = ""
    for (let i = 0; i < syllables; i++) {
        tempString += SYLLABLES[Math.floor((Math.random() * SYLLABLES.length) + 1)]
    }
    return tempString;
}
var storyIndex = 0;
const story = [
    "You'll be able to carry yourself through ego death.",
    "Sounds contradictory? It's not really a well named concept.",
    "Pass through the dark eye at the center of the universe...",
    "Give birth to yourself from the inky blackness and be torn apart by the light.",
    "Feel the membrane on the periphery of the experience. We're not sure what it is except to say, it's you."
]
//#endregion

//#region [rgba(25, 128, 25, 0.15) ] MATERIALS
/*  
* 
* This section sets up a map for basic color materials, as well as a few textured materials.
*
*/
const loader = new THREE.TextureLoader();
loader.crossOrigin = '';

//Basic Colors
const mBrown = new THREE.MeshBasicMaterial()
const mTeal = new THREE.MeshBasicMaterial()
const mRed = new THREE.MeshBasicMaterial()
const mCobble = new THREE.MeshBasicMaterial({ map: loader.load('assets/images/tile.png') });
const mWater = new THREE.MeshBasicMaterial({ map: loader.load('assets/images/water.png') });
mBrown.color = new THREE.Color(0xffaa88)
mTeal.color = new THREE.Color(0x00ddcca)
mRed.color = new THREE.Color(0xff0000)
//#endregion

//#region [rgba(128, 25, 25, 0.15) ] STATIC SCENERY
/*  
* 
* This section sets up the objects to display in the scene.
*
*/
let CHUNK_SIDE_LENGTH = 10;
var chunksMade = new Map();
function generateFloorChunkIndex() {
    var tempIndex = []
    for (let i = 0; i < (CHUNK_SIDE_LENGTH * CHUNK_SIDE_LENGTH); i++) {
        tempIndex.push(Math.random() > .3 ? 1 : 0)
    }
    tempIndex.reverse()
    return tempIndex;
}
function addChunk(xChunk, zChunk) {
    var floorIndex = generateFloorChunkIndex();
    var floorGameObjectArray = []
    var xNewChunkOrigin = xChunk * CHUNK_SIDE_LENGTH;
    var zNewChunkOrigin = zChunk * CHUNK_SIDE_LENGTH;
    for (let i = 0; i < floorIndex.length; i++) {
        if (floorIndex[i] == 1) {
            var tempFloorTile = new Tile((i % CHUNK_SIDE_LENGTH) + xNewChunkOrigin, (Math.floor(i / CHUNK_SIDE_LENGTH)) + zNewChunkOrigin, 0, i, 'ground', 0, 0)
            floorGameObjectArray.push(tempFloorTile);
            scene.add(tempFloorTile.mesh)
        } else {
            var tempFloorTile = new Tile((i % CHUNK_SIDE_LENGTH) + xNewChunkOrigin, (Math.floor(i / CHUNK_SIDE_LENGTH)) + zNewChunkOrigin, -0.1, i, 'water', 0, 0)
            floorGameObjectArray.push(tempFloorTile);
            scene.add(tempFloorTile.mesh)
        }
    }
    chunksMade.set(`${xChunk},${zChunk}`, new Chunk(xChunk, zChunk, floorGameObjectArray));
}
class Tile {
    constructor(x, z, y, i, type, xChunk, zChunk) {
        this.index = i
        this.type = type
        this.xChunk = xChunk
        this.zChunk = zChunk
        if (type == 'ground') {
            this.geometry = new THREE.BoxBufferGeometry(1, 0.1, 1)
            this.mesh = new THREE.Mesh(this.geometry, mCobble)
        } else if (type == 'water') {
            this.geometry = new THREE.BoxGeometry(1, 0.1, 1)
            this.mesh = new THREE.Mesh(this.geometry, mWater)
        }
        this.mesh.position.x = x;
        this.mesh.position.z = z;
        this.mesh.position.y = y;
    }
}
class Chunk {
    constructor(x, z, tileArray) {
        this.x = x
        this.z = z
        this.tileArray = tileArray
        this.name = getAbjadWord(4);
    }
}
for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j++) {
        addChunk(i, j)
    }
}
console.log(chunksMade);
console.log(chunksMade.get("0,0").name);
//#endregion

//#region [rgba(128, 128, 25, 0.15) ] LIGHTS AND FOG
/*  
* 
* This section sets up the light grid to display in the scene.
*
*/
let lightArray = []
for (let i = 0; i < chunksMade.length; i++) {
    let tempPointLight = new THREE.PointLight(0xffffff, 0.15)
    tempPointLight.position.x = (chunksMade[i][0] * CHUNK_SIDE_LENGTH) + (CHUNK_SIDE_LENGTH / 2);
    tempPointLight.position.z = (chunksMade[i][1] * CHUNK_SIDE_LENGTH) + (CHUNK_SIDE_LENGTH / 2);
    tempPointLight.position.y = 2;
    lightArray.push(tempPointLight);
    scene.add(tempPointLight)
}

let fog = new THREE.FogExp2(0x111111, 0.18)
scene.fog = fog;
scene.background = new THREE.Color(0x111111)
//#endregion

// ----------------------------MVC-------------------------------- //

//#region [rgba(128, 25, 128, 0.15) ] GAME OBJECTS
/*  
* 
* This section sets up the camera and player.
*
*/

//#endregion

//#region [rgba(25, 25, 128, 0.15) ] CONTROLS (CONTROLLER)
/*  
* 
* This section sets up the controls.
*
*/
let W_PRESSED = false;
let S_PRESSED = false;
let A_PRESSED = false;
let D_PRESSED = false;
let E_PRESSED = false;
let SPACE_PRESSED = false;
let PLAYER_SPEED = 0.1;
window.addEventListener('keydown', (e) => {
    if (e.key == 'w') {
        W_PRESSED = true;
    } else if (e.key == 's') {
        S_PRESSED = true;
    } else if (e.key == 'a') {
        A_PRESSED = true;
    } else if (e.key == 'd') {
        D_PRESSED = true;
    } else if (e.key == " ") {
        SPACE_PRESSED = true;
    }
})
window.addEventListener('keyup', (e) => {
    if (e.key == 'w') {
        W_PRESSED = false;
    } else if (e.key == 's') {
        S_PRESSED = false;
    } else if (e.key == 'a') {
        A_PRESSED = false;
    } else if (e.key == 'd') {
        D_PRESSED = false;
    } else if (e.key == " ") {
        SPACE_PRESSED = false;
    }
})
window.addEventListener('keypress', (e) => {
    if (e.key == 'e') {
        storyIndex++;
        if (storyIndex > story.length - 1) {
            storyIndex = 0;
        }
    }
})
canvas.addEventListener('click', () => {
    console.log('BANG!')
})
window.addEventListener('resize', () => {
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})
function acceptPlayerInputs() {
    if (W_PRESSED) {
        controls.moveForward(PLAYER_SPEED);
    }
    if (S_PRESSED) {
        controls.moveForward(-PLAYER_SPEED);
    }
    if (A_PRESSED) {
        controls.moveRight(-PLAYER_SPEED);
    }
    if (D_PRESSED) {
        controls.moveRight(PLAYER_SPEED);
    }
    if (SPACE_PRESSED) {
        console.log('jump')
    }
    if (E_PRESSED) {
        console.log('interact')
    }
}
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100)
camera.position.x = 0
camera.position.y = 1
camera.position.z = 0
camera.lookAt(0, 1, 1)
scene.add(camera)
const controls = new PointerLockControls(camera, document.body);
let pointerLock = document.querySelector('#pointer-lock')
pointerLock.addEventListener('click', () => { controls.lock() })
controls.addEventListener('lock', function () { pointerLock.style.display = 'none'; });
controls.addEventListener('unlock', function () { pointerLock.style.display = 'block'; });
//#endregion

//#region [rgba(25, 128, 128, 0.15) ] RENDERER (VIEW)
/*  
* 
* This section sets up rendering.
*
*/
const renderer = new THREE.WebGLRenderer({
    canvas: canvas
})
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap

const renderPass = new RenderPass(scene, camera)
// const glitchPass = new BokehPass(scene, camera, {
//     focus: 2,
//     aspect: camera.aspect,
//     aperture: .0125,
//     maxblur: 0.01
// });
const glitchPass = new GlitchPass(scene, camera);
const composer = new EffectComposer(renderer)
composer.addPass(renderPass)
//composer.addPass( glitchPass );

renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
function generateHUDText(elapsedTime) {
    stats.innerText = "FPS: " + (1 / (elapsedTime - timeOfLastFrame)) + "\n"
    stats.innerText += "Position: " + camera.position.x.toFixed(3) + " " + camera.position.y.toFixed(3) + " " + camera.position.z.toFixed(3) + " " + "\n"
    stats.innerText += "Look Vector: " + camera.rotation.x.toFixed(3) + " " + camera.rotation.y.toFixed(3) + " " + camera.rotation.z.toFixed(3) + " " + "\n"
    stats.innerText += "Current Chunk: " + "\n"
    if (W_PRESSED) {
        stats.innerText += "Forward ."
    }
    if (S_PRESSED) {
        stats.innerText += "Backward ."
    }
    if (A_PRESSED) {
        stats.innerText += "Left ."
    }
    if (D_PRESSED) {
        stats.innerText += "Right ."
    }
}
function generateCommsText() {
    if (camera.position.x > 2 && camera.position.z > 2) {
        popup.className = 'popup'
        if (icon) {
            icon.src = './assets/images/npc1.png'
        }
        if (comms) {
            comms.innerText = story[storyIndex];
        }
    } else {
        popup.className = 'hidden'
    }
}
//#endregion

//#region [rgba(128, 128, 128, 0.15) ] GAME LOOP
/*  
* 
* This section sets off the game loop.
*
*/
const clock = new THREE.Clock()
var timeOfLastFrame = 0
const tick = () => {
    const elapsedTime = clock.getElapsedTime()
    generateHUDText(elapsedTime);
    acceptPlayerInputs();
    generateCommsText();

    // Render
    composer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
    timeOfLastFrame = elapsedTime
}
tick()
//#endregion