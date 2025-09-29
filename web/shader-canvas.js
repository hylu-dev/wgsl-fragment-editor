/**
 * Simple Shader Canvas
 * Usage: 
 *   new ShaderCanvas('#app-container')
 *   new ShaderCanvas('#app-container', { initialShader: 'your shader code here' })
 */
class ShaderCanvas {
    constructor(selector, options = {}) {
        this.selector = selector;
        this.container = null;
        this.canvas = null;
        this.codeEditor = null;
        this.statusElement = null;
        this.wasmModule = null;
        this.isInitialized = false;
        
        // Extract options
        this.initialShader = options.initialShader || this.getDefaultShader();

        this.init();
    }

    getDefaultShader() {
        return `// Fragment shader - write your complete @fragment function
// The vertex shader and structs will be added automatically

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    let uv = in.uv * 2.0 - 1.0;
    var dist = sin(length(uv * 8.0 * PI) + u_time.t);
    dist += sin(atan2(uv.y, uv.x) * 8.0 + u_time.t * 0.5);
    let color = vec4<f32>(dist, dist, dist, 1.0);
    return color;
}`;
    }

    async init() {
        try {
            await this.createLayout();
            await this.loadWasmModule();
            this.setupEventListeners();
            this.isInitialized = true;
            console.log('ShaderCanvasUI initialized successfully');
        } catch (error) {
            console.error('Failed to initialize ShaderCanvasUI:', error);
            throw error;
        }
    }

    async createLayout() {
        // Get the target container
        this.container = document.querySelector(this.selector);
        if (!this.container) {
            throw new Error(`Element with selector "${this.selector}" not found`);
        }

        // Clear existing content and add the shader canvas layout
        this.container.innerHTML = `
            <div class="code-panel">
                <div class="code-editor-container">
                    <textarea id="shader-text" 
                              class="code-editor" 
                              placeholder="Paste your fragment shader code here...">${this.initialShader}</textarea>
                </div>
                <div class="canvas-panel">
                    <canvas id="canvas" class="shader-canvas"></canvas>
                    <div class="shader-status" id="shader-status"></div>
                </div>
            </div>
        `;

        // Get references to elements
        this.canvas = document.getElementById('canvas');
        this.codeEditor = document.getElementById('shader-text');
        this.statusElement = document.getElementById('shader-status');
    }

    async loadWasmModule() {
        try {
            this.wasmModule = await import("../../pkg/wgpu_shader_canvas.js");
            const { load_shader_from_url, load_shader_from_text, reload_shader, get_current_shader_text } = this.wasmModule;

            // Initialize WASM
            const init = this.wasmModule.default;
            try {
                await init();
            } catch (wasmError) {
                // WASM initialization might throw "exceptions for control flow" - this is normal
            }

            // Store the functions for later use
            this.wasmFunctions = {
                load_shader_from_text,
                reload_shader,
                get_current_shader_text
            };

            console.log('WASM module loaded successfully');
        } catch (error) {
            console.error('Failed to load WASM module:', error);
            throw error;
        }
    }

    setupEventListeners() {
        // Auto-load shader on text change
        this.codeEditor.addEventListener('input', (e) => {
            const text = e.target.value;
            this.loadShader(text);
        });

        // Load initial shader immediately
        const initialShader = this.codeEditor.value;
        this.loadShader(initialShader);

        // Add hover behavior for error status
        this.statusElement.addEventListener('mouseenter', () => {
            const detailedError = this.statusElement.dataset.detailedError;
            if (detailedError) {
                this.statusElement.textContent = detailedError;
            }
        });

        this.statusElement.addEventListener('mouseleave', () => {
            // Reset to original message
            this.statusElement.textContent = 'Shader Error';
        });
    }

    updateStatus(message, isError = false, detailedError = '') {
        this.statusElement.textContent = message;
        this.statusElement.className = 'shader-status';
        
        if (isError) {
            this.statusElement.classList.add('show');
            // Store the detailed error for hover display
            this.statusElement.dataset.detailedError = detailedError || message;
        } else {
            // Hide status for success (no error)
            this.statusElement.classList.remove('show');
            this.statusElement.dataset.detailedError = '';
        }
    }

    wrapFragmentShader(fragmentCode) {
        // Always wrap the fragment code - assume user only writes fragment shader
        return this.createCompleteShader(fragmentCode);
    }

    createCompleteShader(fragmentCode) {
        const vertexShader = `// Vertex shader

const PI: f32 = 3.1415926535;

// Time uniform - 16-byte aligned
struct TimeUniform {
    t: f32,
    _padding: f32,
    _padding2: f32,
    _padding3: f32,
}

@group(0) @binding(0)
var<uniform> camera: mat4x4<f32>;

@group(0) @binding(1)
var<uniform> u_time: TimeUniform;

struct VertexInput {
    @location(0) pos: vec3<f32>,
    @location(1) color: vec3<f32>,
};

struct VertexOutput {
    @builtin(position) clip_position: vec4<f32>,
    @location(0) uv: vec2<f32>,
    @location(1) color: vec3<f32>,
};

@vertex
fn vs_main(
    model: VertexInput,
) -> VertexOutput {
    var out: VertexOutput;
    out.color = model.color;
    out.clip_position = vec4<f32>(model.pos, 1.0);
    out.uv = vec2<f32>(model.pos.x * 0.5 + 0.5, model.pos.y * 0.5 + 0.5);
    return out;
}

${fragmentCode}`;

        return vertexShader;
    }


    loadShader(text) {
        console.log("Attempting to load shader");
        try {
            // Wrap the fragment shader code if needed
            const completeShader = this.wrapFragmentShader(text);
            
            // Attempt to load the shader - Rust throws on error, returns undefined on success
            this.wasmFunctions.load_shader_from_text(completeShader);
            
            // If we get here, the shader loaded successfully
            this.updateStatus('Shader Error', false); // Hide status on success
            //console.log("Shader loaded successfully");
        } catch (error) {
            // Shader compilation failed - show the error message with details
            const errorMessage = error.message || error.toString() || 'Unknown shader error';
            this.updateStatus('Shader Error', true, errorMessage);
            console.warn("Shader compilation error:", error);
        }
    }

    reloadDefaultShader() {
        try {
            this.wasmFunctions.reload_shader();
            
            // If we get here, the reload was successful
            this.updateStatus('✓ Default shader reloaded', false);
            console.log("Default shader reloaded");
            
            // Reset to initial fragment shader code
            this.codeEditor.value = this.initialShader;
        } catch (error) {
            // Reload failed - show the error message
            this.updateStatus(`✗ Reload failed: ${error.message || error}`, true);
            //console.error("Failed to reload shader:", error);
        }
    }


    // Public API methods
    getCanvas() {
        return this.canvas;
    }

    getCodeEditor() {
        return this.codeEditor;
    }

    getStatusElement() {
        return this.statusElement;
    }

    setShaderCode(code) {
        this.codeEditor.value = code;
        this.codeEditor.dispatchEvent(new Event('input'));
    }

    getShaderCode() {
        return this.codeEditor.value;
    }

    setInitialShader(shaderCode) {
        this.initialShader = shaderCode;
    }

    destroy() {
        if (this.shaderLoadTimeout) {
            clearTimeout(this.shaderLoadTimeout);
        }
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ShaderCanvas;
} else if (typeof window !== 'undefined') {
    window.ShaderCanvas = ShaderCanvas;
}
