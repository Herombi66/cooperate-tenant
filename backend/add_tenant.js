const fs = require('fs');
const path = require('path');

const modelsDir = path.join(__dirname, 'models');
const targets = ['Loan.js', 'User.js', 'Contribution.js'];

for (const file of targets) {
  const filePath = path.join(modelsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (content.includes('metadata: {')) continue;

  // Find the id field or first field
  const idRegex = /(id:\s*\{[\s\S]*?\},)/;
  
  if (idRegex.test(content)) {
    content = content.replace(idRegex, `$1\n  metadata: {\n    type: DataTypes.JSON,\n    allowNull: true,\n    comment: 'Flexible schema field for custom tenant data'\n  },`);
    fs.writeFileSync(filePath, content);
    console.log(`Added metadata to ${file}`);
  } else {
    console.log(`Could not find id field to inject after in ${file}`);
  }
}

console.log('Finished updating metadata columns.');
