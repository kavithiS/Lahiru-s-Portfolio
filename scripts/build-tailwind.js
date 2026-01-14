const fs = require('fs');
const postcss = require('postcss');
const tailwindPostcss = require('@tailwindcss/postcss');
const autoprefixer = require('autoprefixer');

const inputPath = 'src/input.css';
const outputPath = 'styles/tailwind.css';

const input = fs.readFileSync(inputPath, 'utf8');

postcss([tailwindPostcss, autoprefixer])
  .process(input, { from: inputPath, to: outputPath })
  .then(result => {
    fs.mkdirSync(require('path').dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, result.css);
    if (result.map) fs.writeFileSync(outputPath + '.map', result.map.toString());
    console.log('Built', outputPath);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
