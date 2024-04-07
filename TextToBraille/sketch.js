let scl = 20;
let x, y;
let letterFlag;

let inputBox;
let submitButton;
let userInput = ""; //to store the text from the input box

let checkbox;
let anotherButton;
// let checkboxValue = false; //to store checkbox state

function setup() {
  createCanvas(400, 400);
  background(220);

  x = scl * 2;
  y = scl * 2;
  textSize(scl * 0.65);

  // Create an input text box
  inputBox = createInput();
  inputBox.position(20, height + 25);

  // Create a submit button
  submitButton = createButton("convert");
  submitButton.position(inputBox.x + inputBox.width + 5, height + 25);
  submitButton.mousePressed(submitText);

  // Create a checkbox
  checkbox = createCheckbox("Show letters", true);
  checkbox.position(submitButton.x + submitButton.width + 5, height + 25);
  checkbox.changed(setLetterFlag);

  // Create another button
  resetButton = createButton("Reset Canvas");
  resetButton.position(20, inputBox.y + inputBox.height + 5);
  resetButton.mousePressed(resetCanvas);

  letterFlag = checkbox.value();
  fill(0);
  noStroke();

  // drawString("in the jungle");
}

function draw() {
  // background(220);
}

function drawString(phrase) {
  for (let i = 0; i < phrase.length; i++) {
    let character = phrase.charAt(i);
    drawBraille(character);
  }
}

function drawBraille(letter) {
  let cellmap;
  switch (
    letter.toUpperCase() // Convert to uppercase to simplify cases
  ) {
    case "A":
      cellmap = "1";
      break;
    case "B":
      cellmap = "12";
      break;
    case "C":
      cellmap = "14";
      break;
    case "D":
      cellmap = "145";
      break;
    case "E":
      cellmap = "15";
      break;
    case "F":
      cellmap = "124";
      break;
    case "G":
      cellmap = "1245";
      break;
    case "H":
      cellmap = "125";
      break;
    case "I":
      cellmap = "24";
      break;
    case "J":
      cellmap = "245";
      break;
    case "K":
      cellmap = "13";
      break;
    case "L":
      cellmap = "123";
      break;
    case "M":
      cellmap = "134";
      break;
    case "N":
      cellmap = "1345";
      break;
    case "O":
      cellmap = "135";
      break;
    case "P":
      cellmap = "1234";
      break;
    case "Q":
      cellmap = "12345";
      break;
    case "R":
      cellmap = "1235";
      break;
    case "S":
      cellmap = "234";
      break;
    case "T":
      cellmap = "2345";
      break;
    case "U":
      cellmap = "136";
      break;
    case "V":
      cellmap = "1236";
      break;
    case "W":
      cellmap = "2456";
      break;
    case "X":
      cellmap = "1346";
      break;
    case "Y":
      cellmap = "13456";
      break;
    case "Z":
      cellmap = "1356";
      break;
    case " ": // Space
      cellmap = "";
      break;
    case "?": // Question Mark
      cellmap = "236";
      break;
    case ".": // Period
      cellmap = "256";
      break;
    case ",": // Comma
      cellmap = "2";
      break;
    default:
      console.log(letter, " : Letter not recognized");
      return;
  }
  drawCell(cellmap, scl, x, y, letter);
}

function drawCell(cellmap, scl, px, py, l) {
  // Define the relative positions of the Braille dots within the cell
  let positions = [
    { x: 0.3, y: 0.25 }, // Position 1
    { x: 0.3, y: 0.5 }, // Position 2
    { x: 0.3, y: 0.75 }, // Position 3
    { x: 0.7, y: 0.25 }, // Position 4
    { x: 0.7, y: 0.5 }, // Position 5
    { x: 0.7, y: 0.75 }, // Position 6
  ];

  // Adjust the diameter of the dots as a fraction of the cell width
  let dotDiameter = scl * 0.2;

  // Loop through each character in cellmap and draw the corresponding dot
  for (let i = 0; i < cellmap.length; i++) {
    // Get the current dot's position index (1-based)
    let posIndex = parseInt(cellmap.charAt(i), 10) - 1;

    if (posIndex >= 0 && posIndex < positions.length) {
      // Calculate the dot's position
      let posX = px + positions[posIndex].x * scl;
      let posY = py + positions[posIndex].y * scl;

      // Draw the dot
      ellipse(posX, posY, dotDiameter, dotDiameter);
    }
  }

  if (letterFlag) {
    text(l, x + scl * 0.4, y + scl * 2);
  }

  x = x + scl * 2;
  if (x > width - scl) {
    y = y + scl * 3;
    x = scl * 2;
  }
}

function submitText() {
  userInput = inputBox.value();
  console.log("User typed:", userInput);
  drawString(userInput);
}

function setLetterFlag() {
  letterFlag = this.checked(); // Update checkboxValue based on whether the checkbox is checked
  console.log("Checkbox is checked:", letterFlag);
}

function resetCanvas() {
  background(220);

  x = scl * 2;
  y = scl * 2;
  userInput = "";
}
