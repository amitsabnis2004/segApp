const imageUpload = document.getElementById('imageUpload');
const canvas = document.getElementById('imageCanvas');
const ctx = canvas.getContext('2d');
const colorDisplay = document.getElementById('colorDisplay');

let timeoutId, lastX, lastY;

// List of known colors (RGB + Name)
const namedColors = [
  { name: "Violet", rgb: [238, 130, 238] },
  { name: "Indigo", rgb: [75, 0, 130] },
  { name: "Blue", rgb: [0, 0, 255] },
  { name: "Green", rgb: [0, 255, 0] },
  { name: "Yellow", rgb: [255, 255, 0] },
  { name: "Orange", rgb: [255, 165, 0] },
  { name: "Red", rgb: [255, 0, 0] },
  { name: "Black", rgb: [0, 0, 0] },
  { name: "White", rgb: [255, 255, 255] }
];

imageUpload.addEventListener('change', function(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      const scaleFactor = 0.5; // Scale down to 50%
      const width = img.width * scaleFactor;
      const height = img.height * scaleFactor;

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
});

canvas.addEventListener('mousemove', function(event) {
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  if (lastX === x && lastY === y) return;
  lastX = x;
  lastY = y;

  clearTimeout(timeoutId);
  timeoutId = setTimeout(() => {
    const pixel = ctx.getImageData(x, y, 1, 1).data;
    const hexColor = `#${pixel[0].toString(16).padStart(2, '0')}${pixel[1].toString(16).padStart(2, '0')}${pixel[2].toString(16).padStart(2, '0')}`;
    const nearestColor = findNearestColor(pixel[0], pixel[1], pixel[2]);

    colorDisplay.textContent = `Color: ${hexColor} (${nearestColor})`;
    colorDisplay.style.color = 'black';
  }, 500); // 0.5 seconds delay
});

canvas.addEventListener('mouseleave', () => clearTimeout(timeoutId));

// Function to find the nearest named color
function findNearestColor(r, g, b) {
  let minDistance = Infinity;
  let closestColor = "";

  namedColors.forEach(color => {
    const distance = Math.sqrt(
      Math.pow(color.rgb[0] - r, 2) +
      Math.pow(color.rgb[1] - g, 2) +
      Math.pow(color.rgb[2] - b, 2)
    );

    if (distance < minDistance) {
      minDistance = distance;
      closestColor = color.name;
    }
  });

  return closestColor;
}