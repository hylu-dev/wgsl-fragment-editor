# WGPU Shader Canvas

A WebGPU-based fragment shader canvas for interactive shader development. Write fragment shaders and see them rendered in real-time with automatic vertex shader generation.

## Features

- 🎨 **Fragment Shader Focus**: Just write your `@fragment` function - vertex shader and structs are auto-generated
- ⚡ **Real-time Compilation**: See your shaders update instantly as you type
- 🕒 **Time Uniform**: Built-in `u_time` uniform for animations
- 🎯 **Easy Integration**: Simple JavaScript API for embedding in any web project
- 📦 **Bundled Package**: Includes WASM and all dependencies

## Installation

```bash
npm install wgpu-shader-canvas
```

## Usage

### Basic Usage

```html
<!DOCTYPE html>
<html>
<head>
    <link rel="stylesheet" href="node_modules/wgpu-shader-canvas/dist/style.css">
</head>
<body>
    <div id="shader-container"></div>
    <script src="node_modules/wgpu-shader-canvas/dist/wgpu-shader-canvas.js"></script>
    <script>
        const canvas = new ShaderCanvas('#shader-container');
    </script>
</body>
</html>
```

### With Custom Initial Shader

```javascript
const canvas = new ShaderCanvas('#shader-container', {
    initialShader: `@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    let uv = in.uv * 2.0 - 1.0;
    let color = vec4<f32>(uv.x, uv.y, 0.5, 1.0);
    return color;
}`
});
```

### ES Modules

```javascript
import ShaderCanvas from 'wgpu-shader-canvas/dist/wgpu-shader-canvas.esm.js';
import 'wgpu-shader-canvas/dist/style.css';

const canvas = new ShaderCanvas('#shader-container');
```

## API

### Constructor

```javascript
new ShaderCanvas(selector, options)
```

- `selector`: CSS selector for the container element
- `options.initialShader`: Optional initial fragment shader code

### Methods

- `setShaderCode(code)`: Set the current shader code
- `getShaderCode()`: Get the current shader code
- `setInitialShader(code)`: Update the initial shader
- `reloadDefaultShader()`: Reset to initial shader
- `getCanvas()`: Get the canvas element
- `getCodeEditor()`: Get the textarea element
- `destroy()`: Clean up the component

## Shader Writing

Write your fragment shader as a complete `@fragment` function. The following are automatically provided:

### Available Variables

- `in.uv`: UV coordinates (0.0 to 1.0)
- `u_time.t`: Time uniform for animations
- `PI`: Pi constant

### Example Shader

```wgsl
@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    let uv = in.uv * 2.0 - 1.0;
    let dist = sin(length(uv * 8.0 * PI) + u_time.t);
    let color = vec4<f32>(dist, dist, dist, 1.0);
    return color;
}
```

## Development

```bash
# Install dependencies
npm install

# Build WASM and bundle
npm run build

# Development mode with watch
npm run dev

# Clean build artifacts
npm run clean
```

## Browser Support

Requires a browser with WebGPU support:
- Chrome 113+ (with WebGPU flag enabled)
- Firefox (experimental)
- Safari (experimental)

## License

MIT
