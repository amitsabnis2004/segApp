import { analyzeHBNThickness, filterByLayerType } from './segmentation.js';

// UI Elements
const imageUpload = document.getElementById('imageUpload');
const uploadArea = document.getElementById('uploadArea');
const canvas = document.getElementById('imageCanvas');
const ctx = canvas.getContext('2d');
const analysisSection = document.getElementById('analysisSection');
const layerFilter = document.getElementById('layerFilter');
const hoverIndicator = document.getElementById('hoverIndicator');

// Display elements
const measurementValue = document.querySelector('.measurement-value');
const measurementUnit = document.querySelector('.measurement-unit');
const colorSwatch = document.getElementById('colorSwatch');
const colorHex = document.querySelector('.color-hex');
const colorRgb = document.querySelector('.color-rgb');

let originalImageData = null;
let currentAnalysis = null;

// Drag and drop functionality
uploadArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
  uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadArea.classList.remove('dragover');
  const files = e.dataTransfer.files;
  if (files.length > 0) {
    handleImageUpload(files[0]);
  }
});

// File input change handler
imageUpload.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    handleImageUpload(file);
  }
});

function handleImageUpload(file) {
  if (!file.type.startsWith('image/')) {
    alert('Please select a valid image file.');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      setupCanvas(img);
      showAnalysisSection();
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function setupCanvas(img) {
  // Calculate optimal canvas size while maintaining aspect ratio
  const maxWidth = 600;
  const maxHeight = 400;
  let { width, height } = img;
  
  if (width > maxWidth || height > maxHeight) {
    const ratio = Math.min(maxWidth / width, maxHeight / height);
    width *= ratio;
    height *= ratio;
  }
  
  canvas.width = width;
  canvas.height = height;
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
  
  ctx.drawImage(img, 0, 0, width, height);
  originalImageData = ctx.getImageData(0, 0, width, height);
}

function showAnalysisSection() {
  analysisSection.style.display = 'grid';
  // Smooth scroll to analysis section
  analysisSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Enhanced mouse tracking with hover indicator
let lastAnalysisTime = 0;
const analysisThrottle = 100; // milliseconds

canvas.addEventListener('mousemove', (evt) => {
  if (!originalImageData) return;
  
  const now = Date.now();
  if (now - lastAnalysisTime < analysisThrottle) return;
  lastAnalysisTime = now;
  
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  
  const x = Math.round((evt.clientX - rect.left) * scaleX);
  const y = Math.round((evt.clientY - rect.top) * scaleY);
  
  // Update hover indicator position
  hoverIndicator.style.left = (evt.clientX - rect.left - 10) + 'px';
  hoverIndicator.style.top = (evt.clientY - rect.top - 10) + 'px';
  hoverIndicator.style.display = 'block';
  
  analyzePixel(x, y);
});

canvas.addEventListener('mouseleave', () => {
  hoverIndicator.style.display = 'none';
  resetDisplay();
});

function analyzePixel(x, y) {
  if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) return;
  
  const pixelData = ctx.getImageData(x, y, 1, 1).data;
  const [r, g, b, a] = pixelData;
  
  if (a === 0) return; // Skip transparent pixels
  
  const analysis = analyzeHBNThickness(r, g, b);
  currentAnalysis = analysis;
  
  updateDisplay(r, g, b, analysis);
}

function updateDisplay(r, g, b, analysis) {
  // Update thickness measurement
  if (analysis.thickness > 0) {
    measurementValue.textContent = analysis.thickness.toFixed(2);
    measurementUnit.textContent = 'nm';
  } else {
    measurementValue.textContent = '--';
    measurementUnit.textContent = '';
  }
  
  // Update color information
  const hex = `#${[r, g, b].map(c => c.toString(16).padStart(2, '0')).join('')}`;
  colorSwatch.style.backgroundColor = hex;
  colorHex.textContent = hex.toUpperCase();
  colorRgb.textContent = `RGB(${r}, ${g}, ${b})`;
  
  // Update measurement card styling based on confidence
  const measurementCard = document.querySelector('.measurement-card');
  if (analysis.confidence > 0.7) {
    measurementCard.style.background = 'linear-gradient(135deg, #10b981, #065f46)';
  } else if (analysis.confidence > 0.4) {
    measurementCard.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
  } else {
    measurementCard.style.background = 'linear-gradient(135deg, #6b7280, #4b5563)';
  }
}

function resetDisplay() {
  measurementValue.textContent = '--';
  measurementUnit.textContent = '';
  colorSwatch.style.backgroundColor = '#ffffff';
  colorHex.textContent = '--';
  colorRgb.textContent = '--';
  
  const measurementCard = document.querySelector('.measurement-card');
  measurementCard.style.background = 'linear-gradient(135deg, #667eea, #764ba2)';
}

// Layer filter functionality
layerFilter.addEventListener('change', () => {
  if (!originalImageData) return;
  
  const filterType = layerFilter.value;
  
  if (filterType === 'all') {
    ctx.putImageData(originalImageData, 0, 0);
  } else {
    const filtered = filterByLayerType(originalImageData, filterType);
    ctx.putImageData(filtered, 0, 0);
  }
});

// Initialize tooltips and help system
function initializeHelp() {
  const layerGuide = document.querySelector('.layer-guide');
  
  // Add click handlers for layer guide items
  const guideItems = layerGuide.querySelectorAll('.guide-item');
  guideItems.forEach((item, index) => {
    item.addEventListener('click', () => {
      const types = ['monolayer', 'bilayer', 'trilayer', 'few', 'bulk'];
      layerFilter.value = types[index];
      layerFilter.dispatchEvent(new Event('change'));
    });
    
    item.style.cursor = 'pointer';
    item.title = 'Click to filter by this layer type';
  });
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  initializeHelp();
  console.log('HBN Thickness Analyzer initialized');
});