/**
 * Initialize data directory with empty JSON files
 */

const fs = require('fs');
const path = require('path');

const dataDir = 'data';

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}

const files = {
  'accounts.json': [],
  'transactions.json': [],
  'cases.json': [],
  'approvals.json': [],
  'evidence.json': [],
  'handoffs.json': [],
};

Object.entries(files).forEach(([filename, content]) => {
  const filepath = path.join(dataDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(content, null, 2), 'utf8');
});

console.log('✅ Data directory initialized');