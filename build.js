// build.js
require('esbuild').build({
  entryPoints: ['index.js'],
  bundle: true,
  platform: 'node',
  outfile: 'dist/bundle.js',
  target: 'node18',
  external: ['typescript'], 
}).catch(() => process.exit(1));
