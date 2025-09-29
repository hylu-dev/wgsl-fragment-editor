import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import copy from 'rollup-plugin-copy';

export default {
  input: 'web/shader-canvas.js',
  output: [
    {
      file: 'dist/wgpu-shader-canvas.js',
      format: 'umd',
      name: 'ShaderCanvas',
      sourcemap: true
    },
    {
      file: 'dist/wgpu-shader-canvas.min.js',
      format: 'umd',
      name: 'ShaderCanvas',
      sourcemap: true,
      plugins: [terser()]
    },
    {
      file: 'dist/wgpu-shader-canvas.esm.js',
      format: 'es',
      sourcemap: true
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
    })
  ]
};
