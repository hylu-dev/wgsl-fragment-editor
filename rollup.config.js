import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import copy from 'rollup-plugin-copy';
import gzipPlugin from 'rollup-plugin-gzip';
import { defineConfig } from 'rollup';

const isProduction = process.env.NODE_ENV === 'production';

export default [
  // Main shader canvas bundle
  {
    input: 'web/shader-canvas.js',
    output: [
      {
        file: 'dist/wgpu-shader-canvas.js',
        format: 'umd',
        name: 'ShaderCanvas',
        sourcemap: !isProduction
      },
      {
        file: 'dist/wgpu-shader-canvas.min.js',
        format: 'umd',
        name: 'ShaderCanvas',
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
      nodeResolve(),
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
    ]
  },
  // Syntax highlighting bundle
  {
    input: 'web/syntax-highlight.js',
    output: {
      file: 'dist/syntax-highlight.js',
      format: 'umd',
      name: 'SyntaxHighlight',
      sourcemap: !isProduction
    },
    plugins: [
      nodeResolve(),
      commonjs(),
      terser(),
      gzipPlugin({
        include: ['**/*.js'],
        minSize: 1024
      })
    ]
  }
];
