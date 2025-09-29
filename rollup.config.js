import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import copy from 'rollup-plugin-copy';
import gzipPlugin from 'rollup-plugin-gzip';

const isProduction = process.env.NODE_ENV === 'production';

export default [
  // Main shader canvas bundle
  {
    input: 'web/shader-canvas.js',
    output: [
      {
        file: 'dist/wgpu-shader-canvas.js',
        format: 'es',
        sourcemap: !isProduction
      },
      {
        file: 'dist/wgpu-shader-canvas.min.js',
        format: 'es',
        sourcemap: !isProduction,
        plugins: [terser()]
      },
      {
        file: 'dist/wgpu-shader-canvas.esm.js',
        format: 'es',
        sourcemap: !isProduction
      }
    ],
    plugins: [
      nodeResolve({
        preferBuiltins: false
      }),
      commonjs(),
      copy({
        targets: [
          { src: 'pkg/*.wasm', dest: 'dist' },
          { src: 'pkg/*.js', dest: 'dist' },
          { src: 'pkg/*.d.ts', dest: 'dist' },
          { src: 'web/style.css', dest: 'dist' }
        ]
      }),
      gzipPlugin({
        include: ['**/*.wasm', '**/*.js', '**/*.css'],
        minSize: 1024
      })
    ],
    external: (id) => {
      // Don't bundle the WASM module, let it be loaded at runtime
      return id.includes('dist/wgpu_shader_canvas.js');
    }
  }
];
