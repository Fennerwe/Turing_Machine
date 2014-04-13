var states;
var tape;
var inputCheckInterval;
var outputString;
var tapeInterval;
var speed = 750;
var running = false;
var currState;
var numberOfTransitions;
var drawTimer;
var ctx, text_ctx;
var CANVAS_WIDTH = 890;
var CANVAS_HEIGHT = 150;
var preloaded = false;

var USER_HALT = 0;
var MACHINE_FINISHED = 1;

var presetPrograms = ["palindrome_detector.txt", "subtractor.txt", "busy_beaver(501).txt"];

$(document).ready(function(){
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
	if($('#input_tt').val() != "" && ($('#input_string').val() != "" || preloaded)) $('#load').removeAttr("disabled");
	else {
		$('#load').attr("disabled", "disabled");
		$('.action-btn').attr("disabled", "disabled");
	}
}

function loadTM(){
	numberOfTransitions = 0;
	var inputString = $('#input_string').val();
	var transitionTable = $('#input_tt').val();
	initializeMachine(transitionTable, inputString);
	//$('#output_area').append("Program loaded.\n");
	$('#output_area').val($('#output_area').val() + "Program loaded.\n");
	
	$('.action-btn').removeAttr("disabled");
	
	currState = states["START"];
	
	tape.draw();
}

function initializeMachine(transitionTable, inputString){
	states = new Array();
	transitionTable = transitionTable.replace(/ +/g, " "); 
	var lines = transitionTable.split('\n');
	try {
	for(var i = 0; i < lines.length; i++){
		var line = lines[i];
		var components = line.split(/[\s+,]/);
		
		if(components[0] == '_') components[0] = " ";
		if(components[1] == '_') components[1] = " ";
		if(components[3] == '_') components[3] = " ";
		
		var state = states[components[0]] === undefined ? new State(components[0]) : states[components[0]];
		state.addTransition(components[1], new Transition(components[2], components[3], components[4]));
		
		states[components[0]] = state;
	}
	}catch(e){
		var text = "Something is wrong with your transition table.\nError message received was: \n\n";
		text += e.message;
		alert(text);
	}

	states["HALT"] = new State("HALT");

	outputString = "";
	tape = new Tape(inputString);
}

function start(){
	if($('#start_stop').text() == "Start"){
		running = true;

		$('#output_area').append("Machine started...\n");
		tapeInterval = setInterval(progressMachine, speed);
		drawTimer = setInterval(tape.draw, speed);
		$('#start_stop').text("Halt");
	}
	else {
		stopMachine(USER_HALT);
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
		//$('#output_area').append((currState.name.length == 1 ? "0"+currState.name : currState.name) + "," + tape.printTape().trim() + '\n');
		$('#output_area').val($('#output_area').val() + (currState.name.length == 1 ? "0"+currState.name : currState.name) + "," + tape.printTape().trim() + '\n');
		
		if(currState == states["HALT"]) {
			stopMachine(MACHINE_FINISHED);
			return;
		};
		var current = tape.getCurr();
		var transition = currState.getTransition(current == "" ? " " : current);

		tape.replace(transition.inputReplace);
		if(transition.direction == '>'){
			if(tape.hasRight() === undefined){
				tape.addNext(new Node(" "));
			}
			tape.moveRight();
		}
		else {
			if(tape.hasLeft() === undefined){
				tape.addPrev(new Node(" "));
			}
			tape.moveLeft();
		}

		currState = states[transition.nextState];
		
		$('#output_area').scrollTop($('#output_area')[0].scrollHeight);
		numberOfTransitions++;
}

function stopMachine(haltSource){
	clearInterval(tapeInterval);
	clearInterval(drawTimer);
	running = false;
	
	//tape.draw();
	
	//$('#output_area').append("\n\nMachine halted:\n");
	$('#output_area').val($('#output_area').val() + "\n\nMachine halted:\n");
	
	switch(haltSource){
		case(USER_HALT):
			//$('#output_area').append("User interrupted\n");
			$('#output_area').val($('#output_area').val() + "User interrupted\n");
			break;
		case(MACHINE_FINISHED):
			//$('#output_area').append("Machine finished\n");
			$('#output_area').val($('#output_area').val() + "Machine finished\n");
			break;
		}
		
	//$('#output_area').append(numberOfTransitions + " total transitions\n");
	$('#output_area').val($('#output_area').val() + numberOfTransitions + " total transitions\n");
	var characters = tape.printTape().replace(/\[|\]|\s/g, "");
	//$('#output_area').append(characters.length + " non-blank characters on tape\n");
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
		preloaded = true;
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
	download("output.txt", $('#output_area').val());
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
		while((node = node.next) !== undefined){
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
		while((node = node.prev) !== undefined){
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

function Transition(nextState, inputReplace, direction){
	this.nextState = nextState;
	this.inputReplace = inputReplace;
	this.direction = direction;
}

function State(name){
	this.name = name;
	this.transitions = new Array();
	
	this.addTransition = addTransition;
	function addTransition(input, transition){
		this.transitions[input] = transition;
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