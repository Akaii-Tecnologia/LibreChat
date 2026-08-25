const yaml = require('js-yaml');
const fs = require('fs');
const { configSchema } = require('../packages/data-provider/dist/index.js');

const file = process.argv[2] || 'librechat.yaml';
const config = yaml.load(fs.readFileSync(file, 'utf8'));
const result = configSchema.safeParse(config);
if (!result.success) {
  console.error('CONFIG INVALIDA:');
  console.error(JSON.stringify(result.error.errors, null, 2));
  process.exit(1);
}
console.log('CONFIG SCHEMA OK');
console.log('mcpSettings:', JSON.stringify(result.data.mcpSettings));
