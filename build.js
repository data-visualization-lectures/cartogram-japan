const fs = require('fs');
const path = require('path');
const UglifyJS = require('uglify-js');
const CleanCSS = require('clean-css');

// Create dist directory if it doesn't exist
const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir);
}

// Function to minify JS files
function minifyJS(inputFile, outputFile) {
  try {
    const code = fs.readFileSync(inputFile, 'utf8');
    const result = UglifyJS.minify(code);

    if (result.error) {
      console.error(`Error minifying ${inputFile}:`, result.error);
      return false;
    }

    fs.writeFileSync(outputFile, result.code, 'utf8');
    console.log(`✓ Minified: ${inputFile} → ${outputFile}`);
    return true;
  } catch (error) {
    console.error(`Error processing ${inputFile}:`, error.message);
    return false;
  }
}

// Function to minify CSS files
function minifyCSS(inputFile, outputFile) {
  try {
    const code = fs.readFileSync(inputFile, 'utf8');
    const result = new CleanCSS().minify(code);

    if (result.errors.length > 0) {
      console.error(`Error minifying ${inputFile}:`, result.errors);
      return false;
    }

    fs.writeFileSync(outputFile, result.styles, 'utf8');
    console.log(`✓ Minified: ${inputFile} → ${outputFile}`);
    return true;
  } catch (error) {
    console.error(`Error processing ${inputFile}:`, error.message);
    return false;
  }
}

// Minify JS files
console.log('Building...\n');

const jsFiles = [
  { input: 'assets/topogram.js', output: 'dist/topogram.min.js' },
  { input: 'assets/main.js', output: 'dist/main.min.js' }
];

const cssFiles = [
  { input: 'assets/style.css', output: 'dist/style.min.css' }
];

let allSuccess = true;

// Process JS files
jsFiles.forEach(file => {
  const success = minifyJS(file.input, file.output);
  allSuccess = allSuccess && success;
});

// Process CSS files
cssFiles.forEach(file => {
  const success = minifyCSS(file.input, file.output);
  allSuccess = allSuccess && success;
});

console.log('');
if (allSuccess) {
  console.log('✓ Build completed successfully!');
  process.exit(0);
} else {
  console.log('✗ Build completed with errors.');
  process.exit(1);
}
