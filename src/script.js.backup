import { filterParticlesByColor, getShade } from './segmentation.js';

const imageUpload = document.getElementById('imageUpload');
const canvas      = document.getElementById('imageCanvas');
const ctx         = canvas.getContext('2d');
const colorDisplay= document.getElementById('colorDisplay');
const colorFilter = document.getElementById('colorFilter');

let originalImageData = null;
let timeoutId, lastX, lastY;

imageUpload.addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const scale = 0.5;
      canvas.width  = img.width  * scale;
      canvas.height = img.height * scale;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
});

canvas.addEventListener('mousemove', function(evt) {
  if (!originalImageData) return;
  const rect = canvas.getBoundingClientRect();
  const x = evt.clientX - rect.left;
  const y = evt.clientY - rect.top;
  if (x === lastX && y === lastY) return;
  lastX = x; lastY = y;

  clearTimeout(timeoutId);
  timeoutId = setTimeout(() => {
    const p = ctx.getImageData(x, y, 1, 1).data;
    const hex = `#${[0,1,2].map(i =>
      p[i].toString(16).padStart(2,'0')
    ).join('')}`;
    const rawShade = getShade(p[0], p[1], p[2]);
    // turn “blue1” → “blue 1”, uppercase “Other”:
    const displayShade = rawShade === 'other'
      ? 'Other'
      : rawShade.replace(/(\d)$/, ' $1');
    colorDisplay.textContent = `Color: ${hex} (${displayShade})`;
    colorDisplay.style.color = hex;
  }, 200);
});

canvas.addEventListener('mouseleave', () => clearTimeout(timeoutId));

colorFilter.addEventListener('change', () => {
  if (!originalImageData) return;
  const filtered = filterParticlesByColor(originalImageData, colorFilter.value);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.putImageData(filtered, 0, 0);
});