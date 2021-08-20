import './style.css'
import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { GlitchPass } from 'three/examples/jsm/postprocessing/GlitchPass.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';

const canvas = document.querySelector('canvas.webgl')
const pointerLock = document.querySelector('#pointer-lock')
const stats = document.querySelector('#stats')
const popup = document.querySelector('#popup')
const icon = document.querySelector('#icon')
const comms = document.querySelector('#comms')
const next = document.querySelector('#next')

const scene = new THREE.Scene()

// ----------------------------SET-------------------------------- //

//#region [rgba(255, 25, 25, 0.15) ] STORY
/*  
* This section has NPC and STORY info
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
* This section sets up a map for basic color materials, as well as a few textured materials.
*/
const loader = new THREE.TextureLoader();
loader.crossOrigin = '';

//Basic Colors
const mWater = new THREE.MeshBasicMaterial({ map: loader.load('assets/images/water.png') });
const mCobble = new THREE.MeshBasicMaterial({ map: loader.load('assets/images/tile.png') });
// const mWater = new THREE.MeshLambertMaterial({ color: 'green' });
// const mCobble = new THREE.MeshLambertMaterial({ color: 'blue' });
//#endregion

//#region [rgba(128, 25, 25, 0.15) ] SCENERY
/*  
* This section sets up the objects to display in the scene.
*/
class Chunk {
    constructor(x, z, tileArray) {
        this.x = x
        this.z = z
        this.tileArray = tileArray
        this.name = getAbjadWord(4);
    }
}
class Tile {
    constructor(x, z, y, i, type, xChunk, zChunk) {
        this.index = i
        this.type = type
        this.xChunk = xChunk
        this.zChunk = zChunk
        if (type == 'ground') {
            this.geometry = new THREE.BoxBufferGeometry(1, 1, 1)
            this.mesh = new THREE.Mesh(this.geometry, mCobble)
        } else if (type == 'water') {
            this.geometry = new THREE.BoxGeometry(1, 1, 1)
            this.mesh = new THREE.Mesh(this.geometry, mWater)
        }
        this.mesh.position.x = x;
        this.mesh.position.z = z;
        this.mesh.position.y = y;
    }
}
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
    // let tempPointLight = new THREE.PointLight(0xffffff, 0.15)
    // tempPointLight.position.x = (xNewChunkOrigin);
    // tempPointLight.position.z = (zNewChunkOrigin);
    // tempPointLight.position.y = 3;
    // scene.add(tempPointLight)

    chunksMade.set(`${xChunk},${zChunk}`, new Chunk(xChunk, zChunk, floorGameObjectArray));
}
function removeChunk(xChunk, zChunk) {
    var chunkToDelete = chunksMade.get(`${xChunk},${zChunk}`);
    for (let i = 0; i < chunkToDelete.tileArray.length; i++) {
        scene.remove(chunkToDelete.tileArray[i].mesh);
    }
    //scene.remove(chunkToDelete.light);
    chunksMade.delete(`${xChunk},${zChunk}`)
}
function addAndRemoveNeighborChunks(xChunk, zChunk, lastXChunk, lastZChunk) {
    var xDif = xChunk - lastXChunk;
    var zDif = zChunk - lastZChunk;
    if (xDif == 1) {
        addChunk(xChunk + 1, zChunk)
        addChunk(xChunk + 1, zChunk - 1)
        addChunk(xChunk + 1, zChunk + 1)
        removeChunk(xChunk - 2, zChunk)
        removeChunk(xChunk - 2, zChunk - 1)
        removeChunk(xChunk - 2, zChunk + 1)
    } else if (xDif == -1) {
        addChunk(xChunk - 1, zChunk)
        addChunk(xChunk - 1, zChunk - 1)
        addChunk(xChunk - 1, zChunk + 1)
        removeChunk(xChunk + 2, zChunk)
        removeChunk(xChunk + 2, zChunk - 1)
        removeChunk(xChunk + 2, zChunk + 1)
    }
    if (zDif == 1) {
        addChunk(xChunk, zChunk + 1)
        addChunk(xChunk - 1, zChunk + 1)
        addChunk(xChunk + 1, zChunk + 1)
        removeChunk(xChunk, zChunk - 2)
        removeChunk(xChunk - 1, zChunk - 2)
        removeChunk(xChunk + 1, zChunk - 2)
    } else if (zDif == -1) {
        addChunk(xChunk, zChunk - 1)
        addChunk(xChunk - 1, zChunk - 1)
        addChunk(xChunk + 1, zChunk - 1)
        removeChunk(xChunk, zChunk + 2)
        removeChunk(xChunk - 1, zChunk + 2)
        removeChunk(xChunk + 1, zChunk + 2)
    }
}
for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j++) {
        addChunk(i,j)
    }
}
let directionalLight = new THREE.AmbientLight(0xffffff, 0.5)
directionalLight.position.x = 5;
directionalLight.position.z = 6;
directionalLight.position.y = 3;
scene.add(directionalLight)

let fog = new THREE.FogExp2(0x111111, 0.18)
scene.fog = fog;
scene.background = new THREE.Color(0x111111)
//#endregion

// ----------------------------MVC-------------------------------- //

//#region [rgba(128, 25, 128, 0.15) ] GAME OBJECTS
/*  
* This section sets up the camera and player.
*/
function worldMoves() { }
//#endregion

//#region [rgba(25, 25, 128, 0.15) ] CONTROLS (CONTROLLER)
/*  
* This section sets up the controls.
*/
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}
// Camera Built-in Properties
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100)
const controls = new PointerLockControls(camera, document.body);
camera.position.x = 4.5
camera.position.y = 1.5
camera.position.z = 4.5
camera.lookAt(4.5, 1.5, 5.5)
scene.add(camera)

// Camera Custom Properties
camera.speed = 0.1;
camera.health = 100;
camera.canMove = false;
camera.currentChunk = 'Unknown'

// Control Properties
let W_PRESSED = false;
let S_PRESSED = false;
let A_PRESSED = false;
let D_PRESSED = false;
let E_PRESSED = false;
let SPACE_PRESSED = false;
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
        console.log('use');
    }
})
window.addEventListener('resize', () => {
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})
document.body.addEventListener('click', () => {
    console.log('bang')
})
pointerLock.addEventListener('click', () => {
    controls.lock()
})
controls.addEventListener('lock', function () {
    pointerLock.style.display = 'none';
    camera.canMove = true;
});
controls.addEventListener('unlock', function () {
    pointerLock.style.display = 'block';
    camera.canMove = false;
});

// This is a pseudo-Model class, in that it is called on every frame.
function acceptPlayerInputs() {

    var curChunkX = chunksMade.get(`${Math.floor((camera.position.x + 0.5) / CHUNK_SIDE_LENGTH)},${Math.floor((camera.position.z + 0.5) / CHUNK_SIDE_LENGTH)}`).x
    var curChunkZ = chunksMade.get(`${Math.floor((camera.position.x + 0.5) / CHUNK_SIDE_LENGTH)},${Math.floor((camera.position.z + 0.5) / CHUNK_SIDE_LENGTH)}`).z
    if (camera.currentChunk && curChunkX != camera.currentChunk.x || curChunkZ != camera.currentChunk.z) {
        addAndRemoveNeighborChunks(curChunkX, curChunkZ, camera.currentChunk.x, camera.currentChunk.z);
    }
    camera.currentChunk = chunksMade.get(`${Math.floor((camera.position.x + 0.5) / CHUNK_SIDE_LENGTH)},${Math.floor((camera.position.z + 0.5) / CHUNK_SIDE_LENGTH)}`)

    if (camera.canMove) {
        if (W_PRESSED) {
            controls.moveForward(camera.speed);
        }
        if (S_PRESSED) {
            controls.moveForward(-camera.speed);
        }
        if (A_PRESSED) {
            controls.moveRight(-camera.speed);
        }
        if (D_PRESSED) {
            controls.moveRight(camera.speed);
        }
        if (SPACE_PRESSED) {
            console.log('jump')
        }
        if (E_PRESSED) {
            console.log('interact')
        }
    }


}
//#endregion

//#region [rgba(25, 128, 128, 0.15) ] RENDERER (VIEW)
/*  
* This section sets up rendering.
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
    stats.innerText = "FPS: " + (1 / (elapsedTime - timeOfLastFrame)).toFixed(0) + "\n"
    stats.innerText += "Position: " + camera.position.x.toFixed(3) + " " + camera.position.y.toFixed(3) + " " + camera.position.z.toFixed(3) + " " + "\n"
    if (camera.currentChunk) {
        stats.innerText += "Current Chunk: " + camera.currentChunk.name + " (" + camera.currentChunk.x + ", " + camera.currentChunk.z + ") \n"
    }
}
function generateCommsText() {
    if (camera.currentChunk && camera.canMove) {
        popup.className = 'popup'
        if (icon) {
            icon.src = './assets/images/npc1.png'
        }
        if (comms) {
            comms.innerText = story[camera.currentChunk.z];
        }
    } else {
        popup.className = 'hidden'
    }
}
//#endregion

//#region [rgba(128, 128, 128, 0.15) ] GAME LOOP
/*  
* This section sets off the game loop.
*/
const clock = new THREE.Clock()
var timeOfLastFrame = 0
const tick = () => {
    const elapsedTime = clock.getElapsedTime()

    //CONTROLLER
    acceptPlayerInputs();

    //MODEL
    worldMoves();

    //VIEW
    composer.render(scene, camera)

    //Call tick again after this
    window.requestAnimationFrame(tick)

    //Generate Overlay Text
    //generateCommsText();
    //generateHUDText(elapsedTime);

    //This will be a number of milliseconds slower than elapsed time at the beginning of next frame.
    timeOfLastFrame = elapsedTime
}

tick()
//#endregion