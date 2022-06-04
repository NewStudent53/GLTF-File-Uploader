import * as THREE from './libs/three.js'
import { GLTFLoader } from './libs/GLTFLoader.js'
import { DRACOLoader } from './libs/DRACOLoader.js'
import {  OrbitControls  } from './libs/OrbitControls.js'
import { GUI } from './libs/lil-gui.module.min.js';

const realFileBtn = document.getElementById("real-file");
const customBtn = document.getElementById("custom-button");
const customTxt = document.getElementById("custom-text");


//File reader & Detector -------------------------------------->
customBtn.addEventListener("click", function() {
  realFileBtn.click();
});

realFileBtn.addEventListener("change", function() {
  if (realFileBtn.value) {
    customTxt.innerHTML = realFileBtn.value.match(
      /[\/\\]([\w\d\s\.\-\(\)]+)$/
    )[1];
  } else {
    customTxt.innerHTML = "No file chosen, yet.";
  }
});
//File Reader & Detector -------------------------------------->


const clock = new THREE.Clock();
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

const renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputEncoding = THREE.sRGBEncoding;

const geometry = new THREE.BoxGeometry();
const material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
const cube = new THREE.Mesh( geometry, material );

const loader = new GLTFLoader();
const draco = new DRACOLoader();
draco.setDecoderPath('libs/draco/');

loader.setDRACOLoader(draco);

const controls = new OrbitControls( camera, renderer.domElement );

const pmremGenerator = new THREE.PMREMGenerator( renderer );
pmremGenerator.compileEquirectangularShader();

const actionsArray = [];
const mixers  = [];

const modelO = 'models/DrDre2/DrDre2.gltf';

new THREE.TextureLoader().load( 'textures/equirectangular.png', (texture) => {
    
    texture.encoding = THREE.sRGBEncoding;
    const text = pmremGenerator.fromEquirectangular( texture );

    const panel = new GUI( { width: 310 } );

    Promise.all([
        loadModel(modelO),
    ]).then(
        values => {
            const drDre = values[0];
            const animations = drDre.animations
            scene.add(drDre.scene);
            
            
            drDre.scene.traverse( (node) => {
                if(node.material != undefined){
                    
                    node.material.envMap = text.texture;
                    node.material.needsUpdate = true;
                    
                }
            })
            
            const variables = {
                'stop Animations' : stopAnimations,
                'play Animations': playAnimations
            }

            const animationsFolder = panel.addFolder('Animations');
            animationsFolder.add(variables, 'stop Animations');
            animationsFolder.add(variables, 'play Animations');

            const drDreFolder = panel.addFolder('drDre');
            const drDreActions = registerAnimation(animations, drDre.scene);
            actionsArray.push(drDreActions);

            for(let i = 1; i < values.length; i++){
                
                const element = values[i];
                drDre.scene.add(element.scene);
                element.scene.position.z += 0.03
                element.scene.traverse( (node) => {
                    if(node.material != undefined){
                        
                        node.material.envMap = text.texture;
                        node.material.needsUpdate = true;
                        
                    }
                })
                const name  = 'show/hide' + element.scene.children[1].name;

                variables[name] = function () {
                    element.scene.visible = !element.scene.visible;
                };
                drDreFolder.add(variables, name);
                const actions = registerAnimation(animations, element.scene);
                actions[1].play();
                actionsArray.push(actions);
            }
            
            scene.background = text.texture;
            
            drDreFolder.add(variables, 'show/hide DrDre');

            animate();

        }
    );
});

camera.position.z = 5;
function animate() {

    requestAnimationFrame( animate );

    const delta = clock.getDelta();

    mixers.forEach(element => {
        element.update( delta );
    });

    controls.update();
    
    renderer.render( scene, camera );

};


const loadModel = (url) => {

    return new Promise ( (resolve) =>{

        loader.load(url, (gltf) => {
            resolve(gltf);
        });
    })
}

const registerAnimation = (animations, model) => {

    const mixer = new THREE.AnimationMixer( model );
    const actions = [];

    animations.forEach(

        element => {
            actions.push(mixer.clipAction( element ));
        }

    );
    
    mixers.push(mixer);
    return actions; 
}

const stopAnimations = () => {

    actionsArray.forEach(
        element => {
            element[1].stop();
        }
    )
}

const playAnimations = () => {

    actionsArray.forEach(
        element => {
            element[1].play();
        }
    )
}