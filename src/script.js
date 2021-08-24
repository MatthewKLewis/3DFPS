import './style.css'
import * as THREE from 'three'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { GlitchPass } from 'three/examples/jsm/postprocessing/GlitchPass.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';
import { Vector3 } from 'three';

const canvas = document.querySelector('canvas.webgl')

const pointerLock = document.querySelector('#pointer-lock')
pointerLock.height = window.innerHeight;
pointerLock.src = './assets/images/SplashScreen.png'

const stats = document.querySelector('#stats')
const popup = document.querySelector('#popup')
const inventory = document.querySelector('#inventory')
const icon = document.querySelector('#icon')
const comms = document.querySelector('#comms')
const healthAmmo = document.querySelector('#health-ammo')
const gunhand = document.querySelector('#gunhand')
const youDied = document.querySelector('#you-died')

const scene = new THREE.Scene()

//global array instantiations
let monsters = []
let sprites = []
let powerups = []
var chunksMade = new Map();

//#region [rgba(0, 126, 255, 0.15) ] PURE UTILITY
/*  
* This section has NPC and STORY info
*/
function randBetween(min, max) { // min and max included
    return Math.floor(Math.random() * (max - min + 1) + min)
}

//#endregion

// ----------------------------SET-------------------------------- //

//#region [rgba(255, 25, 25, 0.15) ] STORY
/*  
* This section has NPC and STORY info
*/
const NAMES = ["Adam", "Alex", "Aaron", "Ben", "Carl", "Dan", "David", "Edward", "Fred", "Frank", "George", "Hal", "Hank", "Ike", "John", "Jack", "Joe",
    "Larry", "Monte", "Matthew", "Mark", "Nathan", "Otto", "Paul", "Peter", "Roger", "Roger", "Steve", "Thomas", "Tim", "Ty", "Victor", "Walter", "Zeke"]

//105 syllables, 5460 combinations at 2 sylls, 187,460 at 3 sylls, 4,780,230 at 4 sylls.
var SYLLABLES = [] 
const VOWELS = "aeiou".split('')
const CONSONANTS = "bcdfghjklmnpqrstvwxyz".split('')
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
function getName() {
    return NAMES[Math.floor((Math.random() * NAMES.length) + 1)];
}
const story = [
    "You'll be able to carry yourself through ego death.",
    "Sounds contradictory? It's not really a well named concept.",
    "Pass through the dark eye at the center of the universe...",
    "Give birth to yourself from the inky blackness and be torn apart by the light.",
    "Feel the membrane on the periphery of the experience. We're not sure what it is except to say, it's you."
]
//#endregion

//#region [rgba(25, 255, 25, 0.15) ] MATERIALS
/*  
* This section sets up a map for basic color materials, as well as a few textured materials.
*/
const loader = new THREE.TextureLoader();
loader.crossOrigin = '';

//Basic Color Materials
const mRed = new THREE.MeshBasicMaterial({color: new THREE.Color('red')})

//Textured Materials
var waterMap = loader.load('assets/images/water2.png')
var cobbleMap = loader.load('assets/images/tile2.png')
var wallMap = loader.load('assets/images/wall2.png')
var skyMap = loader.load('assets/images/sky.png')
waterMap.magFilter = THREE.NearestFilter;
cobbleMap.magFilter = THREE.NearestFilter;
wallMap.magFilter = THREE.NearestFilter;
const mWater = new THREE.MeshBasicMaterial({ map: waterMap });
const mCobble = new THREE.MeshBasicMaterial({ map: cobbleMap });
const mWall = new THREE.MeshBasicMaterial({ map: wallMap });

//Gun "Sprites" - really images
let gunSpriteURLS = ['./assets/images/pistol_1.png', './assets/images/shotgun_1.png', './assets/images/launcher_1.png']

//Monster Sprites
let monsterSpriteMaterials = new Map()
let monsterSpriteURLS = ['monster']
for (let i = 0; i < monsterSpriteURLS.length; i++) {
    var tempMap = new THREE.TextureLoader().load(`assets/images/${monsterSpriteURLS[i]}.png`);
    tempMap.magFilter = THREE.NearestFilter;
    tempMap.minFilter = THREE.LinearMipMapLinearFilter;
    var tempMat = new THREE.SpriteMaterial({ map: tempMap });
    monsterSpriteMaterials.set(monsterSpriteURLS[i], tempMat);
}

//Powerup Sprites
let powerupSpriteMaterials = new Map()
let powerupSpriteURLS = ['ammo']
for (let i = 0; i < powerupSpriteURLS.length; i++) {
    var tempMap = new THREE.TextureLoader().load(`assets/images/${powerupSpriteURLS[i]}.png`);
    tempMap.magFilter = THREE.NearestFilter;
    tempMap.minFilter = THREE.LinearMipMapLinearFilter;
    var tempMat = new THREE.SpriteMaterial({ map: tempMap });
    powerupSpriteMaterials.set(powerupSpriteURLS[i], tempMat);
}

//Effect Sprites
let effectSpriteMaterials = new Map()
let effectSpriteURLS = ['blood1']
for (let i = 0; i < effectSpriteURLS.length; i++) {
    var tempMap = new THREE.TextureLoader().load(`assets/images/${effectSpriteURLS[i]}.png`);
    tempMap.magFilter = THREE.NearestFilter;
    tempMap.minFilter = THREE.LinearMipMapLinearFilter;
    var tempMat = new THREE.SpriteMaterial({ map: tempMap });
    effectSpriteMaterials.set(effectSpriteURLS[i], tempMat);
}

//#endregion

//#region [rgba(128, 25, 25, 0.15) ] SCENERY
/*  
* This section sets up the objects to display in the scene.
*/
const objLoader = new OBJLoader();
const gltfLoader = new GLTFLoader();
let CHUNK_SIDE_LENGTH = 10;
class Chunk {
    constructor(x, z, tileArray, monsterArray) {
        this.x = x
        this.z = z
        this.tileArray = tileArray
        this.monsterArray = monsterArray
        this.name = getAbjadWord(4);
    }
}
class Tile {
    constructor(x, z, y, i, type, xChunk, zChunk) {
        this.index = i
        this.xChunk = xChunk
        this.zChunk = zChunk
        this.flavor = type;
        if (type == 'ground') {
            this.geometry = new THREE.BoxBufferGeometry(1, 1, 1)
            this.mesh = new THREE.Mesh(this.geometry, mCobble)
        } else if (type == 'wall') {
            this.geometry = new THREE.BoxBufferGeometry(1, 1, 1)
            this.mesh = new THREE.Mesh(this.geometry, mWall)
            this.mesh.flavor = type;
        } else if (type == 'water') {
            this.geometry = new THREE.BoxBufferGeometry(1, 1, 1)
            this.mesh = new THREE.Mesh(this.geometry, mWater)
            this.mesh.flavor = type;
        } else if (type == 'spawner') {
            this.geometry = new THREE.BoxBufferGeometry(1, 1, 1)
            this.mesh = new THREE.Mesh(this.geometry, mRed)
            this.mesh.flavor = type;
        }
        this.mesh.position.x = x;
        this.mesh.position.z = z;
        this.mesh.position.y = y;
    }
}
function generateFloorChunkIndex() {
    var tempIndex = []
    for (let i = 0; i < (CHUNK_SIDE_LENGTH * CHUNK_SIDE_LENGTH); i++) {
        tempIndex.push(randBetween(1,20))
    }
    tempIndex.reverse()
    return tempIndex;
}
function addChunk(xChunk, zChunk) {
    var xNewChunkOrigin = xChunk * CHUNK_SIDE_LENGTH;
    var zNewChunkOrigin = zChunk * CHUNK_SIDE_LENGTH;
    if (Math.random() > 0.90 && xChunk != 0 && zChunk != 0) { // Value > 1 means never
        //LOAD CUSTOM CHUNK
        // //GLBs
        gltfLoader.load( 'assets/objects/sampleChunk4.glb', function ( gltf ) {
            var obj = gltf.scene
            obj.position.x = xNewChunkOrigin + (CHUNK_SIDE_LENGTH / 2) - .5;
            obj.position.y = .2;
            obj.position.z = zNewChunkOrigin + (CHUNK_SIDE_LENGTH / 2) - .5;
            //console.log(obj)
            scene.add( obj );
            chunksMade.set(`${xChunk},${zChunk}`, new Chunk(xChunk, zChunk, []));
        }, undefined, function ( error ) {
            console.error( error );
        } );
    } else {
        //LOAD TILED CHUNK
        if (chunksMade.get(`${xChunk},${zChunk}`)) {
            var existingTileArray = chunksMade.get(`${xChunk},${zChunk}`).tileArray || []
            for (let i = 0; i < existingTileArray.length; i++) {
                scene.add(existingTileArray[i].mesh)
            }
        } else {
            var floorIndex = generateFloorChunkIndex();
            var floorGameObjectArray = []
            var monsterGameObjectArray = []

            for (let i = 0; i < floorIndex.length; i++) {
                switch (floorIndex[i]) {
                    case 1:
                        var tempFloorTile = new Tile((i % CHUNK_SIDE_LENGTH) + xNewChunkOrigin, (Math.floor(i / CHUNK_SIDE_LENGTH)) + zNewChunkOrigin, 0, i, 'water', 0, 0)
                        floorGameObjectArray.push(tempFloorTile);
                        scene.add(tempFloorTile.mesh)
                        break;
                    case 2:
                        var tempFloorTile = new Tile((i % CHUNK_SIDE_LENGTH) + xNewChunkOrigin, (Math.floor(i / CHUNK_SIDE_LENGTH)) + zNewChunkOrigin, 1, i, 'wall', 0, 0)
                        floorGameObjectArray.push(tempFloorTile);
                        scene.add(tempFloorTile.mesh)
                        break;
                    case 3:
                        var tempFloorTile = new Tile((i % CHUNK_SIDE_LENGTH) + xNewChunkOrigin, (Math.floor(i / CHUNK_SIDE_LENGTH)) + zNewChunkOrigin, -.1, i, 'spawner', 0, 0)
                        if (Math.random() > .7) {
                            var tempMonster = createCreatureSprite('monster', (i % CHUNK_SIDE_LENGTH) + xNewChunkOrigin, 1, (Math.floor(i / CHUNK_SIDE_LENGTH)) + zNewChunkOrigin)
                            monsterGameObjectArray.push(tempMonster)
                            monsters.push(tempMonster)
                            scene.add(tempMonster)
                        }
                        floorGameObjectArray.push(tempFloorTile);
                        scene.add(tempFloorTile.mesh)
                        break;
                    default:
                        var tempFloorTile = new Tile((i % CHUNK_SIDE_LENGTH) + xNewChunkOrigin, (Math.floor(i / CHUNK_SIDE_LENGTH)) + zNewChunkOrigin, Math.random() / 10, i, 'ground', 0, 0)
                        floorGameObjectArray.push(tempFloorTile);
                        scene.add(tempFloorTile.mesh)
                        break;
                }
            }
            chunksMade.set(`${xChunk},${zChunk}`, new Chunk(xChunk, zChunk, floorGameObjectArray, monsterGameObjectArray));
        }
    }
}
function removeChunk(xChunk, zChunk) {
    var chunkToDelete = chunksMade.get(`${xChunk},${zChunk}`);
    for (let i = 0; i < chunkToDelete.tileArray.length; i++) {
        scene.remove(chunkToDelete.tileArray[i].mesh);
    }
    //scene.remove(chunkToDelete.light);
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
// Add the starting 9 chunks
for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j++) {
        addChunk(i, j)
    }
}

//Add light
let directionalLight = new THREE.AmbientLight(0xffffff, 0.4)
directionalLight.position.x = 5;
directionalLight.position.z = 6;
directionalLight.position.y = 3;
scene.add(directionalLight)

//Add Fog
let fog = new THREE.FogExp2(0x6699cc, 0.1)
scene.fog = fog;
//scene.background = skyMap;
scene.background = new THREE.Color(0x6699cc)

//#endregion

//#region [rgba(128, 40, 255, 0.15) ] AUDIO
/*  
* This section sets up audios to play
*/

const gunshot = new Audio('./assets/audios/gunshot_short.mp3')
const gunclick = new Audio('./assets/audios/gunclick.mp3')
const ricochet = new Audio('./assets/audios/ricochet.mp3')
const bkgMusic = new Audio('./assets/audios/Flossed In Paradise - In The No.mp3')
gunshot.volume = 0.25;
gunclick.volume = 0.25;
ricochet.volume = 0.3
bkgMusic.volume = 0.1;

//#endregion

// ----------------------------MVC-------------------------------- //

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
camera.position.x = 0
camera.position.y = 1.0
camera.position.z = 0
scene.add(camera)

// Camera Custom Properties
camera.forward = new THREE.Vector3(0, 0, -1);
camera.left = new THREE.Vector3(1, 0, 0)
camera.up = new THREE.Vector3(0,1,0);
camera.speed = 0.07;
camera.heightOffset = 1;
camera.health = 100;
camera.canMove = false;
camera.currentChunk = 'Unknown'
camera.currentTile = 0
camera.currentGun = 0
camera.guns = [
    { name: 'pistol', damage: 1, roundsChambered: 6, roundsPerReload: 6, roundsTotal: 30, timeLastReloaded: 0, timeLastFired: 0, cooldown: 600 },
    { name: 'shotgun', damage: 5, roundsChambered: 2, roundsPerReload: 2, roundsTotal: 50, timeLastReloaded: 0, timeLastFired: 0, cooldown: 600 },
    { name: 'rocketLauncher', damage: 20, roundsChambered: 1, roundsPerReload: 1, roundsTotal: 4, timeLastReloaded: 0, timeLastFired: 0, cooldown: 600 },
]

// Raycaster
const rayCaster = new THREE.Raycaster();
const mousePosition = new THREE.Vector2();

// Collisioncasters
const fwdCaster = new THREE.Raycaster();
const bckCaster = new THREE.Raycaster();
const lftCaster = new THREE.Raycaster();
const rigCaster = new THREE.Raycaster();

fwdCaster.camera = camera;
fwdCaster.ray.origin = new Vector3(0,1,0)
fwdCaster.ray.direction = new Vector3(0,1,-1)

bckCaster.camera = camera;
bckCaster.ray.origin = new Vector3(0,1,0)
bckCaster.ray.direction = new Vector3(0,1,1)

lftCaster.camera = camera;
lftCaster.ray.origin = new Vector3(0,1,0)
lftCaster.ray.direction = new Vector3(1,1,0)

rigCaster.camera = camera;
rigCaster.ray.origin = new Vector3(0,1,0)
rigCaster.ray.direction = new Vector3(-1,1,0)

// Control Properties
let W_PRESSED = false;
let S_PRESSED = false;
let A_PRESSED = false;
let D_PRESSED = false;
let E_PRESSED = false;
let R_PRESSED = false;
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
    } else if (e.key == "x") {
        X_PRESSED = true;
    } else if (e.key == "r") {
        R_PRESSED = true;
    } else {
        //console.log('pressed ' + e.key)
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
    } else if (e.key == "x") {
        X_PRESSED = false;
    } else if (e.key == "r") {
        R_PRESSED = false;
    }
})
window.addEventListener('keypress', (e) => {
    if (e.key == 'e') {
        if (camera.canMove) {
            rayCaster.setFromCamera(mousePosition, camera);
            const intersects = rayCaster.intersectObjects(scene.children);
            if (intersects[0]) {
                if (intersects[0].object.flavor == "button" && intersects[0].distance < .8) {
                    //console.log(intersects[0])
                    intersects[0].object.callback()
                }
            }
        }
    } else if (e.key == 'i') {
        if (inventory.className == 'inventory') {
            inventory.className = 'hidden'
        } else {
            inventory.className = 'inventory'
        }
    } else if (e.key == '1') {
        camera.currentGun = 0
    } else if (e.key == '2') {
        camera.currentGun = 1
    } else if (e.key == '3') {
        camera.currentGun = 2
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
    if (camera.canMove && Date.now() > camera.guns[camera.currentGun].timeLastFired + camera.guns[camera.currentGun].cooldown) {
        if (camera.guns[camera.currentGun].roundsChambered > 0) {   
            gunshot.play()
            camera.guns[camera.currentGun].roundsChambered--;
            camera.guns[camera.currentGun].timeLastFired = Date.now()

            gunhand.classList.add('fire-animation')
            setTimeout(()=>{gunhand.classList.remove('fire-animation')}, 250)

            rayCaster.setFromCamera(mousePosition, camera);
            const intersects = rayCaster.intersectObjects(scene.children);
            //console.log(intersects)
            if (intersects[0]) {
                if (intersects[0].object.type == "Sprite") {
                    console.log(intersects[0])
                    intersects[0].object.health -= camera.guns[camera.currentGun].damage;
                    var blood = createEffectSprite('blood1', intersects[0].point.x, intersects[0].point.y, intersects[0].point.z)
                    sprites.push(blood)
                    scene.add(blood);
                } else if (intersects[0].object.type == "Mesh") {
                    //console.log('kerang')
                    ricochet.play()
                } else {
                    console.log(intersects[0])
                }
            }
        } else {
            gunclick.play()
        }
    }
})
pointerLock.addEventListener('click', () => {
    controls.lock()
    //bkgMusic.play()
})
controls.addEventListener('lock', function () {
    pointerLock.style.display = 'none';
    camera.canMove = true;
});
controls.addEventListener('unlock', function () {
    pointerLock.style.display = 'block';
    camera.canMove = false;
});

// This is a pseudo-Model class, in that it is called every frame.
var ALLOW_FWD = true;
var ALLOW_BACK = true;
var ALLOW_LEFT = true;
var ALLOW_RIGHT = true;
let BARRIER_DISTANCE = 0.5;
function acceptPlayerInputs() {

    if (camera.health <= 0) {
        camera.canMove = false;
        canvas.classList.add('dead')
        youDied.classList.add('died')
    }

    camera.getWorldDirection(camera.forward)
    camera.getWorldDirection(camera.left);
    camera.left.applyAxisAngle(camera.up, Math.PI / 2)
    ALLOW_FWD = true;
    ALLOW_BACK = true;
    ALLOW_LEFT = true;
    ALLOW_RIGHT = true;
    // //Determine forward collision objects
    fwdCaster.set(camera.position, camera.forward);
    var fwdIntersects = fwdCaster.intersectObjects(scene.children);
    if (fwdIntersects.length > 0) {
        if (fwdIntersects[0].distance < BARRIER_DISTANCE && fwdIntersects[0].object.flavor == "wall") {
            ALLOW_FWD = false;
        }
    }
    // //Determine backward collision objects
    bckCaster.set(camera.position, new Vector3(-camera.forward.x, camera.forward.y, -camera.forward.z));
    var bckIntersects = bckCaster.intersectObjects(scene.children);
    if (bckIntersects.length > 0) {
        if (bckIntersects[0].distance < BARRIER_DISTANCE && bckIntersects[0].object.flavor == "wall") {
            ALLOW_BACK = false;
        }
    }
    // //Determine backward collision objects
    lftCaster.set(camera.position, camera.left);
    var lftIntersects = lftCaster.intersectObjects(scene.children);
    if (lftIntersects.length > 0) {
        if (lftIntersects[0].distance < BARRIER_DISTANCE && lftIntersects[0].object.flavor == "wall") {
            ALLOW_LEFT = false;
        }
    }
    // //Determine backward collision objects
    rigCaster.set(camera.position, new Vector3(-camera.left.x, camera.left.y, -camera.left.z));
    var rigIntersects = rigCaster.intersectObjects(scene.children);
    if (rigIntersects.length > 0) {
        if (rigIntersects[0].distance < BARRIER_DISTANCE && rigIntersects[0].object.flavor == "wall") {
            ALLOW_RIGHT = false;
        }
    }
    // Determine current chunk and tile, despawn faraway chunks
    var curChunkX = chunksMade.get(`${Math.floor((camera.position.x + 0.5) / CHUNK_SIDE_LENGTH)},${Math.floor((camera.position.z + 0.5) / CHUNK_SIDE_LENGTH)}`).x
    var curChunkZ = chunksMade.get(`${Math.floor((camera.position.x + 0.5) / CHUNK_SIDE_LENGTH)},${Math.floor((camera.position.z + 0.5) / CHUNK_SIDE_LENGTH)}`).z
    if (camera.currentChunk && curChunkX != camera.currentChunk.x || curChunkZ != camera.currentChunk.z) {
        addAndRemoveNeighborChunks(curChunkX, curChunkZ, camera.currentChunk.x, camera.currentChunk.z);
    }
    camera.currentChunk = chunksMade.get(`${Math.floor((camera.position.x + 0.5) / CHUNK_SIDE_LENGTH)},${Math.floor((camera.position.z + 0.5) / CHUNK_SIDE_LENGTH)}`)
    // Postion camera based on height and ducking
    if (camera.currentChunk.tileArray.length > 0) {
        for (let i = 0; i < camera.currentChunk.tileArray.length; i++) {
            if (camera.currentChunk.tileArray[i].mesh.position.x == Math.floor(camera.position.x + .5) && camera.currentChunk.tileArray[i].mesh.position.z == Math.floor(camera.position.z + .5)) {
                camera.currentTile = camera.currentChunk.tileArray[i]
                if (camera.position.y < camera.currentTile.mesh.position.y + camera.heightOffset) {
                    //console.log('step up')
                    camera.position.y = camera.currentTile.mesh.position.y + camera.heightOffset
                } else if (camera.position.y > camera.currentTile.mesh.position.y + camera.heightOffset) {
                    //console.log('step down')
                    camera.position.y = camera.currentTile.mesh.position.y + camera.heightOffset
                }
            }
        }
    } else {
        camera.position.y = 1.2
    }

    if (camera.canMove) {
        if (W_PRESSED && ALLOW_FWD) {
            controls.moveForward(camera.speed);
        }
        if (S_PRESSED && ALLOW_BACK) {
            controls.moveForward(-camera.speed);
        }
        if (A_PRESSED && ALLOW_LEFT) {
            controls.moveRight(-camera.speed);
        }
        if (D_PRESSED && ALLOW_RIGHT) {
            controls.moveRight(camera.speed);
        }
        if (SPACE_PRESSED) {
            console.log('jump')
        }
        if (E_PRESSED) {
            console.log('interact')
        }
        if (R_PRESSED
            && camera.guns[camera.currentGun].roundsChambered == 0
            && camera.guns[camera.currentGun].roundsTotal > 0
            && Date.now() > camera.guns[camera.currentGun].timeLastReloaded + camera.guns[camera.currentGun].cooldown) {

            gunhand.classList.add('reload-animation');
            setTimeout(()=>{gunhand.classList.remove('reload-animation')}, 1000)

            camera.guns[camera.currentGun].timeLastReloaded = Date.now()
            camera.guns[camera.currentGun].roundsChambered += camera.guns[camera.currentGun].roundsPerReload;
            camera.guns[camera.currentGun].roundsTotal -= camera.guns[camera.currentGun].roundsPerReload;
        }
    }
}
//#endregion

//#region [rgba(128, 25, 128, 0.15) ] GAME OBJECTS
/*  
* This section sets up the camera and player.
*/
function createButton(x, y, z, callback) {
    var buttonGeo = new THREE.BoxBufferGeometry(.2, .2, .2)
    var buttonMesh = new THREE.Mesh(buttonGeo, mRed)
    buttonMesh.position.x = x
    buttonMesh.position.y = y
    buttonMesh.position.z = z
    buttonMesh.callback = callback;
    buttonMesh.flavor = "button"
    return buttonMesh;
}
function createCreatureSprite(name, x, y, z) {
    var tempSprite = new THREE.Sprite(monsterSpriteMaterials.get(name));
    tempSprite.rayCaster = new THREE.Raycaster(new Vector3(x,y,z), new Vector3(x, y, z - 1));
    tempSprite.rayCaster.camera = new THREE.PerspectiveCamera();
    tempSprite.position.x = x;
    tempSprite.position.y = y;
    tempSprite.position.z = z;
    tempSprite.scale.set(1.2, 1.2)
    tempSprite.name = getName()
    tempSprite.health = 20
    tempSprite.status = "idle"
    return tempSprite;
}
function createPowerupSprite(name, x, y, z) {
    var tempSprite = new THREE.Sprite(powerupSpriteMaterials.get(name));
    tempSprite.position.x = x;
    tempSprite.position.y = y;
    tempSprite.position.z = z;
    tempSprite.scale.set(.5, .5)
    return tempSprite;
}
function createEffectSprite(name, x, y, z) {
    var tempSprite = new THREE.Sprite(effectSpriteMaterials.get(name));
    var tempSprite = new THREE.Sprite(tempMat);
    tempSprite.position.x = x;
    tempSprite.position.y = y;
    tempSprite.position.z = z;
    tempSprite.timer = 0
    tempSprite.lifeSpan = 20
    return tempSprite;
}

function worldMoves() {
    //monster decisions
    if (Math.random() > .95) {
        for (let i = 0; i < monsters.length; i++) {
            var randomChoice = randBetween(1, 5)
            switch (randomChoice) {
                case 1:
                    monsters[i].status = "move forward"
                    break;
                case 2:
                    monsters[i].status = "move backward"
                    break;
                case 3:
                    monsters[i].status = "move left"
                    break;
                case 4:
                    monsters[i].status = "move right"
                    break;
                case 5:
                    monsters[i].status = "idle"
                    break;
            }
        }
    }
    //monster actions
    for (let i = 0; i < monsters.length; i++) {
        if (monsters[i].status == 'idle') {
            if (monsters[i].position.distanceTo(camera.position) < 8 && Math.random() > .95) {
                //console.log('ATTACK FROM ' + monsters[i].name)
            }
        } else if (monsters[i].status == 'move forward') {
            monsters[i].position.z += .01;
        } else if (monsters[i].status == 'move backward') {
            monsters[i].position.z -= .01;
        } else if (monsters[i].status == 'move left') {
            monsters[i].position.x += .01;
        } else if (monsters[i].status == 'move right') {
            monsters[i].position.x -= .01;
        }
    }
    for (let i = 0; i < sprites.length; i++) {
        sprites[i].timer++;
        if (sprites[i].timer == sprites[i].lifeSpan) {
            scene.remove(sprites[i])
            sprites.splice(i, 1);
        }
    }
}

//Add a button
scene.add(createButton(0, 1, 4, ()=>{
    camera.health -= 20;
}));

scene.add(createButton(0, 1, -4, ()=>{
    console.log('message')
}));

//#endregion

//#region [rgba(25, 128, 128, 0.15) ] RENDERER (VIEW)
/*  
* This section sets up rendering.
*/
const renderer = new THREE.WebGLRenderer({
    canvas: canvas
})
//renderer.outputEncoding = THREE.sRGBEncoding;

const renderPass = new RenderPass(scene, camera)
// const glitchPass = new BokehPass(scene, camera, {
//     focus: 2,
//     aspect: camera.aspect,
//     aperture: .0125,
//     maxblur: 0.01
// });
//const glitchPass = new GlitchPass(scene, camera);
const composer = new EffectComposer(renderer)
composer.addPass(renderPass)
//composer.addPass(glitchPass);

renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
function generateHUDText(elapsedTime) {
    // //STATS
    stats.innerText = "FPS: " + (1 / (elapsedTime - timeOfLastFrame)).toFixed(0) + "\n"
    stats.innerText += "Position: " + camera.position.x.toFixed(3) + " " + camera.position.y.toFixed(3) + " " + camera.position.z.toFixed(3) + "\n"
    stats.innerText += "Vector Fwd: " + camera.forward.x.toFixed(3) + ", " + camera.forward.y.toFixed(3) + ", " + camera.forward.z.toFixed(3) + "\n"
    if (camera.currentChunk) {
        stats.innerText += "Current Chunk: " + camera.currentChunk.name + " (" + camera.currentChunk.x + ", " + camera.currentChunk.z + ") \n"
        stats.innerText += "Current Tile Index: " + camera.currentTile.index + " " + camera.currentTile.flavor + "\n"
        stats.innerText += "Current Tile Height: " + camera.currentTile.mesh.position.y + "\n"
    }
    if (monsters.length > 0) {
        stats.innerText += "First Monster: " + monsters[0].name + " (" + monsters[0].position.x.toFixed(2) + ", " + monsters[0].position.z.toFixed(2) + ") " + monsters[0].status
    }

    // //HEALTH AND AMMO
    healthAmmo.innerText = camera.health + " : " + camera.guns[camera.currentGun].roundsChambered + " / " + camera.guns[camera.currentGun].roundsTotal
}
function generateGunImage() {
    gunhand.src = gunSpriteURLS[camera.currentGun]
    gunhand.width = 400;
    gunhand.heigh = 600;
}
function generateCommsText() {
    if (camera.currentChunk && camera.canMove && Math.abs(camera.position.z) > 5) {
        popup.className = 'popup'
        if (icon) {
            icon.src = './assets/images/npc1.png'
        }
        if (comms) {
            comms.innerText = story[Math.min(Math.abs(camera.currentChunk.z), story.length - 1)];
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

    // //Generate Overlay
    generateGunImage();
    generateHUDText(elapsedTime);
    generateCommsText();

    //This will be a number of milliseconds slower than elapsed time at the beginning of next frame.
    timeOfLastFrame = elapsedTime
}
console.log(monsters[0])
tick()
//#endregion