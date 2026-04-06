/**
 * JSON Store
 * 
 * Local JSON-based storage for visibility into governance
 * Makes control story reviewable
 */

const fs = require('fs');
const path = require('path');

class JSONStore {
  constructor(dataDir = 'data') {
    this.dataDir = dataDir;
    this.ensureDataDir();
  }

  ensureDataDir() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  /**
   * Read a JSON file
   */
  read(filename) {
    const filepath = path.join(this.dataDir, filename);
    try {
      const data = fs.readFileSync(filepath, 'utf8');
      return JSON.parse(data);
    } catch (err) {
      if (err.code === 'ENOENT') {
        return null;
      }
      throw err;
    }
  }

  /**
   * Write a JSON file
   */
  write(filename, data) {
    const filepath = path.join(this.dataDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf8');
  }

  /**
   * Append to a JSON array file
   */
  append(filename, item) {
    const current = this.read(filename) || [];
    if (!Array.isArray(current)) {
      throw new Error(`${filename} is not an array`);
    }
    current.push(item);
    this.write(filename, current);
  }

  /**
   * List all files in data directory
   */
  listFiles() {
    return fs.readdirSync(this.dataDir).filter(f => f.endsWith('.json'));
  }
}

module.exports = JSONStore;