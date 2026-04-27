// Electron dev bootstrap — registers tsx loader so the main process can be written in TypeScript
require('tsx/cjs')
require('../src/main/index')
