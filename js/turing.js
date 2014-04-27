var states;
var tape;
var inputCheckInterval;
var outputString;
var tapeInterval;
var speed = 500;
var running = false;
var currState;
var numberOfTransitions;
var drawTimer;
var ctx, text_ctx;
var CANVAS_WIDTH = 890;
var CANVAS_HEIGHT = 150;
var ruleMatch = new RegExp(/.+( |,).+( |,).+( |,).+( |,).+/);

var USER_HALT = 0;
var MACHINE_FINISHED = 1;

var presetPrograms = ["palindrome_detector.txt", "subtractor.txt", "busy_beaver(501).txt"];

var DIAGRAM_WIDTH, DIAGRAM_HEIGHT;

$(document).ready(function(){
	var output = $('#output_area');
	DIAGRAM_WIDTH = output.width();
	DIAGRAM_HEIGHT = output.height();
	$('#diagram_holder').width(DIAGRAM_WIDTH);
	$('#diagram_holder').height(DIAGRAM_HEIGHT);

	init();
});

function init(){
	$('#speed_select').on("change", function(){
		speed = $('#speed_select').val();
		if(running) {
			clearInterval(tapeInterval);
			tapeInterval = setInterval(progressMachine, speed);
			clearInterval(drawTimer);
			drawTimer = setInterval(tape.draw, speed);
		}
	});
	
	$('#preset_program_select').on("change", loadPresetProgram);
	
	ctx = $('#tape_canvas')[0].getContext("2d");
	ctx.lineWidth = 1;
	ctx.fillStyle = "#FFFFFC";
	text_ctx = $('#tape_text_canvas')[0].getContext("2d");
	
	
	inputCheckInterval = setInterval(validateInput, 500);
}

function validateInput(){
	if($('#input_tt').val() != "") $('#load').removeAttr("disabled");
	else {
		$('#load').attr("disabled", "disabled");
		$('.action-btn').attr("disabled", "disabled");
	}
}

function loadTM(){
	initScene();

	numberOfTransitions = 0;
	var inputString = $('#input_string').val();
	var transitionTable = $('#input_tt').val();
	if(initializeMachine(transitionTable, inputString)){
		if($('#output_area').val() != "") $('#output_area').val($('#output_area').val() + "\n----------------------------------\n");
		$('#output_area').val($('#output_area').val() + "Program loaded.\n");
		
		$('.action-btn').removeAttr("disabled");
		
		currState = states["START"];
		currState.sphere.material = currMaterial;
		
		tape.draw();
	}
}

function initializeMachine(transitionTable, inputString){
	states = new Array();
	transitionTable = transitionTable.replace(/ +/g, " "); 
	var lines = transitionTable.split('\n');
	try {
	for(var i = 0; i < lines.length; i++){
		var line = lines[i];
		line = line.replace(/ ,|, /g, ",");
		if(!ruleMatch.test(line)) throw "Your transition table has an error at\n" + "   " + lines[i];
		var components = line.split(/[\s+,]/);
		
		if(components[0] == '_') components[0] = " ";
		if(components[1] == '_') components[1] = " ";
		if(components[3] == '_') components[3] = " ";
		
		var state = states[components[0]] === undefined ? new State(components[0]) : states[components[0]];
		state.addTransition(components[1], new Transition(components[1], components[2], components[3], components[4]));
		
		states[components[0]] = state;
	}
	}catch(e){
		$('#output_area').val($('#output_area').val() + e + "\n");
		$('#output_area').scrollTop($('#output_area')[0].scrollHeight);
		return false;
	}

	states["HALT"] = new State("HALT");

	outputString = "";
	tape = new Tape(inputString);
	
	if(WEBGL_ENABLED) initializeDiagram();
	
	return true;
}

function start(){
	if($('#start_stop').text() == "Start"){
		running = true;

		$('#output_area').val($('#output_area').val() + "Machine started...\n");
		tapeInterval = setInterval(progressMachine, speed);
		drawTimer = setInterval(tape.draw, speed);
		$('#start_stop').text("Halt");
	}
	else {
		stopMachine("User interrupted.");
		$('#start_stop').text("Start");
	}
}

function pause_resume(){
	if($('#pause_resume').text() == "Pause"){
		clearInterval(tapeInterval);
		$('#pause_resume').text("Resume");
		$('#pause_resume').css({"padding-left":"6px", "padding-right":"6px"});
		clearInterval(drawTimer);
		running = false;
	}
	else {
		tapeInterval = setInterval(progressMachine, speed);
		drawTimer = setInterval(tape.draw, speed);
		running = true;
		$('#pause_resume').text("Pause");
		$('#pause_resume').css({"padding-left":"6px", "padding-right":"6px"});
	}
}

function step(){
	clearInterval(tapeInterval);
	clearInterval(drawTimer);
	running = false;
	progressMachine();
	tape.draw();	
}

function progressMachine(){
		$('#output_area').val($('#output_area').val() + (currState.name.length == 1 ? "0"+currState.name : currState.name) + "," + tape.printTape().trim() + '\n');
		
		if(currState == states["HALT"]) {
			stopMachine("Machine finished.");
			return;
		};
		
		try {
			var current = tape.getCurr();
			var transition = currState.getTransition(current == "" ? " " : current);

			tape.replace(transition.inputReplace);
			if(transition.direction == '>'){
				if(tape.hasRight() === undefined){
					tape.addNext(new Node(" "));
				}
				tape.moveRight();
			}
			else if(transition.direction == '<'){
				if(tape.hasLeft() === undefined){
					tape.addPrev(new Node(" "));
				}
				tape.moveLeft();
			}
			else if(transition.direction == '|'){}
			else throw "Unsupported operation";

			currState.sphere.material = normalMaterial;
			currState = states[transition.nextState];
			currState.sphere.material = currMaterial;
		}catch(e){
			var text = "Machine crashed!\n";
			text +=    "Current state of the machine is:\n";
			text +=    "State: " + currState.name;
			text +=    "\nCurrent symbol on tape: " + tape.getCurr();
			text +=    "\nTransitions:\n"
			for(var transName in currState.transitions){
				var trans = currState.transitions[transName];
				text += "   " + currState.name + "," + 
						(trans.name == " " ? "_" : trans.name) + " " + 
						trans.nextState + "," + 
						(trans.inputReplace == " " ? "_" : trans.inputReplace) + "," + 
						trans.direction + "\n";
			}
			stopMachine(text);
			return;
		}
		
		$('#output_area').scrollTop($('#output_area')[0].scrollHeight);
		numberOfTransitions++;
}

function stopMachine(haltString){
	clearInterval(tapeInterval);
	clearInterval(drawTimer);
	running = false;
	
	$('#output_area').val($('#output_area').val() + "\n\nMachine halted:\n" + haltString + "\n");
				
	$('#output_area').val($('#output_area').val() + numberOfTransitions + " total transitions\n");
	var characters = tape.printTape().replace(/\[|\]|\s/g, "");
	$('#output_area').val($('#output_area').val() + characters.length + " non-blank characters on tape\n");
	$('#output_area').scrollTop($('#output_area')[0].scrollHeight);
	$('#download').removeAttr("disabled");
	$('.action-btn').attr("disabled", "disabled");
	$('#start_stop').text("Start");
	$('#pause_resume').text("Pause");
	$('#pause_resume').css({"padding-left":"6px", "padding-right":"6px"});
}

function loadPresetProgram(){
	var i = $('#preset_program_select').val();
	
	if(i >= 0){
		$.get(presetPrograms[i], function(data){
			var components = data.split(/\n/);
			$('#input_string').val(components.shift());
			$('#input_tt').val(components.join("\n"));
		});
		$('#load').removeAttr("disabled");
	}
	else {
		$('#input_tt').val("");
		$('#input_string').val("");
		preloaded = false;
	}
}

function clearOutput(){
	$('#output_area').val("");
	$('#download').attr("disabled", "disabled");
}

function downloadOutput(){
	download($('#fileName').val()+".txt", $('#output_area').val());
	$('#downloadModal').modal('hide');
	$('#fileName').val("");
}

function switchTo(tab){
	var target = $(tab).data("target");
	if($(target).data("show")) return;
	else {
		var hideTarget = $('.tab_selected').data("target");
		$(hideTarget).attr("data-show", "false");
		$(hideTarget).hide();
	
		$('.tab_selected').removeClass("tab_selected");
		$(tab).addClass("tab_selected");
		$(target).show();
		$(target).attr("data-show", "true");
		if($(target).data("render")) render();
		else cancelAnimationFrame(renderID);
	}
}

function Node(name){
	this.name = name;
	this.next;
	this.prev;
}

function Tape(input){
	var head = null;
	var curr = null;
	var tail = null;
	
	
	curr = new Node(input.charAt(0));
	head = curr;
	tail = curr;
	for(var i = 1; i < input.length; i++){
		addToTape(new Node(input.charAt(i)));
	}
		
	function addToTape(node){
		tail.next = node;
		node.prev = tail;
		tail = node;
	}
	
	this.addNext = addNext;
	function addNext(node){
		var temp = curr.next;
		curr.next = node;
		node.next = temp;
		node.prev = curr;
	}
	
	this.addPrev = addPrev;
	function addPrev(node){		
		var temp = curr.prev;
		curr.prev = node;
		node.prev = temp;
		node.next = curr;
		
		if(this.curr == this.head){
			head = node;
		}
	}
	
	this.replace = replace;
	function replace(text){
		curr.name = text;
	}
	
	this.printTape = printTape;
	function printTape(){
		var node = head;
		var string = "";
		
		while(node !== undefined){
			if(node == curr){
				string += '[' + node.name + ']';
			}
			else {
				string += node.name;
			}
			node = node.next;
		}
		
		return string;
	}
	
	this.getCurr = function(){return curr.name;};
	this.moveRight = function(){curr = curr.next;};
	this.moveLeft = function(){curr = curr.prev;};
	this.hasRight = function(){return curr.next;};
	this.hasLeft = function(){return curr.prev;};
	
	this.draw = draw;
	function draw(){
		ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
		text_ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
		
		var node = curr;
		
		ctx.fillRect(405, 20, 81, 110);
		ctx.lineWidth = 6;
		ctx.strokeStyle = "#FF0000";
		ctx.strokeRect(405, 20, 81, 110);
		ctx.strokeStyle = "#000000";
		text_ctx.font = "110px Courier";
		text_ctx.fillText(curr.name, 415, 110);
		
		var counter = -2;
		while(((node = node.next) !== undefined) && counter < 7){
			switch(counter){
				case -2:
					ctx.lineWidth = 4;
					ctx.fillRect(496, 31, 65, 88);
					ctx.strokeRect(496, 31, 65, 88);
					ctx.lineWidth = 1;
					text_ctx.font = "80px Courier";
					text_ctx.fillText(node.name, 504, 101);
					text_ctx.font = "36px Courier";
					break;
				case -1:
					ctx.lineWidth = 2;
					ctx.fillRect(569, 40, 52, 70);
					ctx.strokeRect(569, 40, 52, 70);
					ctx.lineWidth = 1;
					text_ctx.font = "64px Courier";
					text_ctx.fillText(node.name, 576, 97);
					text_ctx.font = "36px Courier";
					break;
				default:
					var left = 621 + (counter * 42);
					if(left < 950){
						ctx.fillRect(left, 47, 42, 56);
						ctx.strokeRect(left, 47, 42, 56);
						text_ctx.fillText(node.name, left+11, 85);
					}
			}
			counter++;
		}
		
		counter = -2;
		node = curr;
		while(((node = node.prev) !== undefined) && counter < 7){
			switch(counter){
				case -2:
					ctx.lineWidth = 4;
					ctx.fillRect(330, 31, 65, 88);
					ctx.strokeRect(330, 31, 65, 88);
					ctx.lineWidth = 1;
					text_ctx.font = "80px Courier";
					text_ctx.fillText(node.name, 338, 101);
					text_ctx.font = "36px Courier";
					break;
				case -1:
					ctx.lineWidth = 2;
					ctx.fillRect(270, 40, 52, 70);
					ctx.strokeRect(270, 40, 52, 70);
					ctx.lineWidth = 1;
					text_ctx.font = "64px Courier";
					text_ctx.fillText(node.name, 277, 97);
					text_ctx.font = "36px Courier";
					break;
				default:
					var left = 228 - (counter * 42);
					if(left > -50){
						ctx.fillRect(left, 47, 42, 56);
						ctx.strokeRect(left, 47, 42, 56);
						text_ctx.fillText(node.name, left+11, 85);
					}
			}
			counter++;
		}		
	}
}

function Transition(name, nextState, inputReplace, direction){
	this.name = name;
	this.nextState = nextState;
	this.inputReplace = inputReplace;
	this.direction = direction;
}

function State(name){
	this.name = name;
	this.transitions = new Array();
	
	this.sphere = new THREE.Mesh(sphereGeometry, normalMaterial);
	this.sphere.position.set(Math.floor(Math.random()*50-25), Math.floor(Math.random()*50-25), Math.floor(Math.random()*50-25));
	scene.add(this.sphere);
	
	this.sphereNextPos;
	
	this.addTransition = addTransition;
	function addTransition(input, transition){
		this.transitions[input] = transition;
		var con;
		var text = (input == " " ? "_" : input) + "," + (transition.inputReplace == " " ? "_" : transition.inputReplace) + "," + transition.direction;
		if((con = cList.getConnection(this.name, transition.nextState)) != null) con.addTransitionText(text);
		else cList.addConnection(this.name, transition.nextState, text);
	}
	
	this.getTransition = getTransition;
	function getTransition(input){
		return this.transitions[input];
	}
}

function download(filename, text) {
    var pom = document.createElement('a');
    pom.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    pom.setAttribute('download', filename);
    pom.click();
}