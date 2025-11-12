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

// Concatenate and minify JS files
console.log('Building...\n');

const jsFilesToConcat = [
  'assets/topogram.js',
  'assets/main.js'
];

const cssFiles = [
  { input: 'assets/style.css', output: 'dist/style.min.css' }
];

let allSuccess = true;

// Concatenate JS files and minify
try {
  let combinedCode = jsFilesToConcat
    .map(file => {
      const code = fs.readFileSync(file, 'utf8');
      return `/* ${file} */\n${code}`;
    })
    .join('\n\n');

  const result = UglifyJS.minify(combinedCode);

  if (result.error) {
    console.error('Error minifying JS files:', result.error);
    allSuccess = false;
  } else {
    fs.writeFileSync('dist/app.min.js', result.code, 'utf8');
    console.log(`✓ Concatenated and minified: ${jsFilesToConcat.join(', ')} → dist/app.min.js`);
  }
} catch (error) {
  console.error('Error processing JS files:', error.message);
  allSuccess = false;
}

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
