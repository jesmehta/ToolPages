let img; // Variable to store the image
let input, button; // Variables for the input box and button

// https://i.imgur.com/E5cbe9m.jpeg

function setup() {
  createCanvas(600,600);
  // createCanvas(600,600, SVG);
  background(225);


  input = createInput("https://i.imgur.com/E5cbe9m.jpeg"); // Create input box
  input.position(10, height + 10);

  button = createButton('submit'); // Create submit button
  button.position(input.x + input.width, height + 10);
  button.mousePressed(loadAndDisplayImage); // Function to call when button is pressed

  textAlign(CENTER);
  textSize(16);
}

function draw() {
  background(220);
  if (img) {
    image(img, 20, 20, img.width/2, img.height/2); // Display the image
    // image(img, 20, 300,img.width,0); // Display the image
  }
}

function loadAndDisplayImage() {
  let url = input.value(); // Get URL from input box
  img = loadImage(url);

}
