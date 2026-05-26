const fs = require('fs');
let code = fs.readFileSync('scripts/generate-perfect-rag-data.js', 'utf8');
code = code.replace(/\\\`/g, '`').replace(/\\\$/g, '$');
fs.writeFileSync('scripts/generate-perfect-rag-data.js', code, 'utf8');
console.log('Fixed');
