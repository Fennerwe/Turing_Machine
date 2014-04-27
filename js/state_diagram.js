var normalMaterial = new THREE.MeshPhongMaterial({color: 0x00ee00, ambient: 0x001100, specular: 0x00ee00, shininess: 3});
var currMaterial = new THREE.MeshPhongMaterial({color: 0xee0000, ambient: 0x110000, specular: 0xee0000, shininess: 3});
var connectionMaterial = new THREE.MeshPhongMaterial({color: 0xff3399, specular: 0xff5cad, shininess: 3});

var sphereGeometry = new THREE.SphereGeometry(5, 32, 32);
var scene = new THREE.Scene();
var camera;

var dLight = new THREE.DirectionalLight(0xffffff, 0.7);
scene.add(dLight);

var renderer = new THREE.WebGLRenderer();

var WEBGL_ENABLED = Detector.webgl;
var renderId;

var controls;

var cList = new ConnectionList();

var ATTRACTION_CONSTANT = 0.1;
var REPULSION_CONSTANT = 500;
var SPRING_LENGTH = 50;

// http://paulirish.com/2011/requestanimationframe-for-smart-animating/
// http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating
 
// requestAnimationFrame polyfill by Erik Möller. fixes from Paul Irish and Tino Zijdel
(function() {
    var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
        window.cancelAnimationFrame = window[vendors[x]+'CancelAnimationFrame'] 
                                   || window[vendors[x]+'CancelRequestAnimationFrame'];
    }
 
    if (!window.requestAnimationFrame)
        window.requestAnimationFrame = function(callback, element) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function() { callback(currTime + timeToCall); }, 
              timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };
 
    if (!window.cancelAnimationFrame)
        window.cancelAnimationFrame = function(id) {
            clearTimeout(id);
        };
}());

$(document).ready(function(){
	renderer.setSize($('#diagram_holder').width(), $('#diagram_holder').height());
	if(WEBGL_ENABLED) $('#diagram_holder').append(renderer.domElement);
	
	camera = new THREE.PerspectiveCamera(75, $('#diagram_holder').width()/$('#diagram_holder').height(), 0.1, 10000);

	initScene();
	
	controls = new THREE.OrbitControls(camera, renderer.domElement);
});

function initScene(){
	scene = new THREE.Scene();
	scene.add(dLight);
	scene.add(camera);
	camera.position.set(0, 0, 200);
	dLight.position.set(0, 0, 200);
}

function render(){
	renderId = requestAnimationFrame(render);
	controls.update();
	dLight.position.copy(camera.position);
	renderer.render(scene, camera);
}

function initializeDiagram(){
	positionSpheres();
	cList.createConnections();
}

function positionSpheres(){
	var stopCount = iterations = 0;
	var damping = 0.5;
	
	var totalDisplacement;
	
	while(true){
		totalDisplacement = 0;
	
		for(var stateName in states){
			var state = states[stateName];
			var currentPos = state.sphere.position;
			var velocity = new THREE.Vector3(0,0,0);
			
			var connections = cList.getStateConnections(state.name);
			for(var i = 0; i < connections.length; i++){
				var tempCon = connections[i];
				velocity.add(calcAttractionForces(states[tempCon.firstState].sphere.position, states[tempCon.secondState].sphere.position));
			}
			
			for(var nodeName in states){
				var node = states[nodeName];
				if(node != state) velocity.add(calcRepulsionForces(state.sphere.position, node.sphere.position));
			}
			
			state.sphereNextPos = state.sphere.position.add(velocity).multiplyScalar(damping);
		}
		
		for(var stateName in states){
			var state = states[stateName];
			totalDisplacement += state.sphere.position.distanceTo(state.sphereNextPos);
			state.sphere.position.copy(state.sphereNextPos);
		}
		iterations++;
		
		if(totalDisplacement < 10) stopCount++;
		if(stopCount >= 15) break;
		if(iterations >= 500) break;
	}
}

function calcAttractionForces(posOne, posTwo){
	var direction = new THREE.Vector3(0,0,0);
	direction.subVectors(posOne, posTwo);
	
	var proximity = Math.max(posOne.distanceTo(posTwo), 1);
	
	var force = ATTRACTION_CONSTANT * Math.max((proximity - SPRING_LENGTH, 0));
	
	direction.setLength(force);
	
	return direction;
}

function calcRepulsionForces(posOne, posTwo){
	var direction = new THREE.Vector3(0,0,0);
	direction.subVectors(posOne, posTwo);
	
	var proximity = Math.max(posOne.distanceTo(posTwo), 1);
	
	var force = -(REPULSION_CONSTANT/(proximity*proximity));
	
	direction.setLength(force);
	
	return direction;
}

function ConnectionList(){
	this.connections = new Array();
	
	this.addConnection = addConnection;
	function addConnection(firstState, secondState, text){
		this.connections.push(new Connection(firstState, secondState, text));
	}
		
	this.getConnection = getConnection;
	function getConnection(firstState, secondState){
		try{
			for(var i = 0; i < this.connections.length; i++){
				var tempCon = this.connections[i];
				if(firstState == tempCon.firstState && secondState == tempCon.secondState) return this.connections[i];
			}
		}catch(e){
			return null;
		}
		return null;
	}
	
	this.getStateConnections = getStateConnections
	function getStateConnections(state){	
		var cons = new Array();
		for(var i = 0; i < this.connections.length; i++){
			var tempCon = this.connections[i];
			if(tempCon.firstState == state) cons.push(tempCon);
			else if(tempCon.secondState == state && getConnection(state, tempCon.firstState) == null) cons.push(tempCon);
		}
		
		return cons;
	}
	
	this.createConnections = createConnections;
	function createConnections(){
		var con, posOne, posTwo;
		for(var i = 0; i < this.connections.length; i++){
			con = this.connections[i];
			posOne = states[con.firstState];
			posTwo = states[con.secondState];
			if(posOne == posTwo){
				//TODO: curve from and to same state
			}
			else {
				var path = new THREE.LineCurve3(posOne.sphere.position, posTwo.sphere.position);
				var tubeGeo = new THREE.TubeGeometry(path, 10, 1, 10, false, false);
				var tube = new THREE.Mesh(tubeGeo, connectionMaterial);
				scene.add(tube);
			}
		}
	}
	
	
}

function Connection(firstState, secondState, text){
	this.firstState = firstState;
	this.secondState = secondState;
	this.transitionText = new Array();
	this.transitionText.push(text);
	
	this.addTransitionText = addTransitionText;
	function addTransitionText(text){
		this.transitionText.push(text);
	}
}

/*
	Function taken from tutorial at stemkoski.github.io/Three.js
	All credit goes to Lee Stemkoski
	http://stemkoski.github.io/Three.js/Sprite-Text-Labels.html
*/
function makeTextSprite( message, parameters )
{
	if ( parameters === undefined ) parameters = {};
	
	var fontface = parameters.hasOwnProperty("fontface") ? 
		parameters["fontface"] : "Arial";
	
	var fontsize = parameters.hasOwnProperty("fontsize") ? 
		parameters["fontsize"] : 18;
	
	var borderThickness = parameters.hasOwnProperty("borderThickness") ? 
		parameters["borderThickness"] : 4;
	
	var borderColor = parameters.hasOwnProperty("borderColor") ?
		parameters["borderColor"] : { r:0, g:0, b:0, a:1.0 };
	
	var backgroundColor = parameters.hasOwnProperty("backgroundColor") ?
		parameters["backgroundColor"] : { r:255, g:255, b:255, a:1.0 };

	var spriteAlignment = THREE.SpriteAlignment.topLeft;
		
	var canvas = document.createElement('canvas');
	var context = canvas.getContext('2d');
	context.font = "Bold " + fontsize + "px " + fontface;
    
	// get size data (height depends only on font size)
	var metrics = context.measureText( message );
	var textWidth = metrics.width;
	
	// background color
	context.fillStyle   = "rgba(" + backgroundColor.r + "," + backgroundColor.g + ","
								  + backgroundColor.b + "," + backgroundColor.a + ")";
	// border color
	context.strokeStyle = "rgba(" + borderColor.r + "," + borderColor.g + ","
								  + borderColor.b + "," + borderColor.a + ")";

	context.lineWidth = borderThickness;
	roundRect(context, borderThickness/2, borderThickness/2, textWidth + borderThickness, fontsize * 1.4 + borderThickness, 6);
	// 1.4 is extra height factor for text below baseline: g,j,p,q.
	
	// text color
	context.fillStyle = "rgba(255, 255, 255, 1.0)";

	context.fillText( message, borderThickness, fontsize + borderThickness);
	
	// canvas contents will be used for a texture
	var texture = new THREE.Texture(canvas) 
	texture.needsUpdate = true;

	var spriteMaterial = new THREE.SpriteMaterial( 
		{ map: texture, useScreenCoordinates: false, alignment: spriteAlignment } );
	var sprite = new THREE.Sprite( spriteMaterial );
	sprite.scale.set(100,50,1.0);
	return sprite;	
}