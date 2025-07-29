# HBN Thickness Analyzer

![HBN Analyzer](https://img.shields.io/badge/Material-Science-blue) ![Electron](https://img.shields.io/badge/Electron-47848F?style=flat&logo=electron&logoColor=white) ![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)

Advanced 2D nanomaterial thickness detection software specifically designed for hexagonal boron nitride (h-BN) analysis. This application provides accurate thickness measurements based on optical microscopy color analysis with real-time hover detection.

## Features

### 🔬 **Accurate Thickness Detection**
- **Monolayer detection**: ~0.33 nm (very light blue/transparent)
- **Bilayer detection**: ~0.66 nm (light blue)
- **Trilayer detection**: ~1.0 nm (blue)
- **Few layers**: 1.3-3.3 nm (blue to green transition)
- **Bulk material**: >3.3 nm (yellow to white)

### 🎨 **Advanced Color Analysis**
- Real-time HSL and LAB color space analysis
- Enhanced background subtraction
- Confidence scoring for measurements
- Precise color shade detection

### 🖥️ **Modern User Interface**
- Drag-and-drop image upload
- Real-time hover analysis with visual indicators
- Layer-specific filtering
- Interactive layer guide
- Responsive design with gradient backgrounds

### ⚡ **Performance Optimized**
- Throttled analysis for smooth performance
- Efficient image processing algorithms
- Real-time visual feedback

## Scientific Background

### HBN Material Properties

Hexagonal boron nitride is a 2D material similar to graphene but with unique optical properties that allow thickness determination through color analysis:

| Layer Type | Thickness (nm) | Color Characteristics | Optical Properties |
|------------|----------------|----------------------|-------------------|
| Monolayer | 0.33 | Very light blue, high transparency | Weak optical contrast |
| Bilayer | 0.66 | Light blue | Moderate optical contrast |
| Trilayer | 1.0 | Blue | Strong optical contrast |
| Few Layers | 1.3-3.3 | Blue to green transition | Variable contrast |
| Bulk | >3.3 | Yellow to white | High optical density |

### Analysis Algorithm

The software uses a multi-parameter analysis approach:

1. **Color Space Conversion**: RGB → HSL and LAB for comprehensive analysis
2. **Background Detection**: Advanced substrate identification
3. **Layer Classification**: HSL-based thickness estimation with confidence scoring
4. **Confidence Assessment**: Multi-parameter validation for accuracy

## Installation

### Prerequisites
- Node.js (version 14 or higher)
- npm (Node Package Manager)

### Setup
```bash
# Clone or download the project
cd segApp

# Install dependencies
npm install

# Start the application
npm start
```

## Usage Guide

### 1. **Image Upload**
- **Drag & Drop**: Simply drag your microscopy image into the upload area
- **File Selector**: Click "Choose File" to browse and select an image
- **Supported Formats**: JPG, PNG, BMP, TIFF

### 2. **Real-time Analysis**
- **Hover Detection**: Move your mouse over the image to get instant thickness measurements
- **Color Information**: View RGB and HEX color values
- **Confidence Indicator**: Color-coded measurement reliability
  - 🟢 **Green**: High confidence (>70%)
  - 🟡 **Yellow**: Medium confidence (40-70%)
  - ⚫ **Gray**: Low confidence (<40%)

### 3. **Layer Filtering**
Use the layer filter dropdown to isolate specific thickness ranges:
- **All Layers**: Show complete image
- **Monolayer**: Highlight only ~0.33nm regions
- **Bilayer**: Show ~0.66nm areas
- **Trilayer**: Display ~1.0nm regions
- **Few Layers**: Emphasize 1.3-3.3nm areas
- **Bulk**: Show regions >3.3nm

### 4. **Interactive Layer Guide**
Click on any layer type in the guide to automatically filter the image to that specific thickness range.

## Technical Specifications

### Color Analysis Parameters

#### Monolayer Detection
- **Hue Range**: 180°-220°
- **Saturation**: 10%-40%
- **Lightness**: 70%-95%
- **Confidence Threshold**: >60%

#### Bilayer Detection
- **Hue Range**: 190°-230°
- **Saturation**: 20%-60%
- **Lightness**: 60%-85%
- **Confidence Threshold**: >70%

#### Trilayer Detection
- **Hue Range**: 200°-250°
- **Saturation**: 30%-70%
- **Lightness**: 40%-75%
- **Confidence Threshold**: >75%

#### Few Layers Detection
- **Hue Range**: 160°-200° or 210°-260°
- **Saturation**: 25%-80%
- **Lightness**: 25%-70%
- **Confidence Threshold**: >65%

#### Bulk Detection
- **Hue Range**: 40°-80° (yellow) or high lightness
- **Saturation**: Variable
- **Lightness**: >80% for white regions
- **Confidence Threshold**: >60%

## File Structure

```
segApp/
├── src/
│   ├── index.html          # Main UI structure
│   ├── index.css           # Modern styling and animations
│   ├── script.js           # Main application logic
│   ├── segmentation.js     # HBN analysis algorithms
│   └── preload.js          # Electron preload script
├── package.json            # Dependencies and scripts
├── forge.config.js         # Electron Forge configuration
└── README.md              # This file
```

## Keyboard Shortcuts

- **Escape**: Return to upload screen (when in analysis mode)

## Troubleshooting

### Common Issues

1. **Image not loading**
   - Ensure the image format is supported (JPG, PNG, BMP, TIFF)
   - Check that the file is not corrupted
   - Try reducing image size if it's very large

2. **Inaccurate measurements**
   - Ensure proper lighting and contrast in microscopy images
   - Check that the substrate background is clearly visible
   - Verify the image quality and resolution

3. **Performance issues**
   - Reduce image size for better performance
   - Close other resource-intensive applications
   - Ensure sufficient system memory

### Optimization Tips

- **Image Quality**: Use high-contrast, well-lit microscopy images
- **Resolution**: Optimal resolution is 1024x768 to 2048x1536 pixels
- **Background**: Ensure clear substrate background for accurate analysis
- **Lighting**: Consistent illumination across the sample

## Future Enhancements

- **Export Functionality**: Save analysis results as JSON/CSV
- **Batch Processing**: Analyze multiple images simultaneously
- **Statistical Analysis**: Generate thickness distribution histograms
- **Calibration Tools**: User-defined thickness standards
- **Advanced Filtering**: Gaussian blur and noise reduction
- **Machine Learning**: AI-enhanced layer detection

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-analysis`)
3. Commit changes (`git commit -am 'Add new analysis method'`)
4. Push to branch (`git push origin feature/new-analysis`)
5. Create a Pull Request

## Scientific References

1. Gorbachev, R. V. et al. "Hunting for monolayer boron nitride: optical and Raman signatures." *Small* 7, 465-468 (2011).
2. Li, L. H. et al. "Strong oxidation resistance of atomically thin boron nitride nanosheets." *ACS Nano* 8, 1457-1462 (2014).
3. Watanabe, K. & Taniguchi, T. "Direct-bandgap properties and evidence for ultraviolet lasing of hexagonal boron nitride single crystal." *Nature Materials* 3, 404-409 (2004).

## License

MIT License - See LICENSE file for details

## Acknowledgments

- Scientific community for HBN optical property research
- Electron framework for cross-platform desktop applications
- Contributors to the nanomaterial analysis field

---

**Made with ❤️ for the 2D materials research community**
