/**
 * Simple Shader Canvas
 * Usage: new ShaderCanvas('#app-container')
 */
class ShaderCanvas {
    constructor(selector) {
        this.selector = selector;
        this.container = null;
        this.canvas = null;
        this.codeEditor = null;
        this.statusElement = null;
        this.wasmModule = null;
        this.isInitialized = false;

        this.init();
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
                              placeholder="Paste your WGSL shader code here...">// Example shader - try editing this!
const PI: f32 = 3.1415926535;

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
fn vs_main(model: VertexInput) -> VertexOutput {
    var out: VertexOutput;
    out.color = model.color;
    out.clip_position = vec4<f32>(model.pos, 1.0);
    out.uv = vec2<f32>(model.pos.x * 0.5 + 0.5, model.pos.y * 0.5 + 0.5);
    return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    let uv = in.uv * 2.0 - 1.0;
    let dist = sin(length(uv * 8.0 * PI));
    let color = vec4<f32>(dist, dist, dist, 1.0);
    return color;
}</textarea>
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
            this.wasmModule = await import("/pkg/wgpu_shader_canvas.js");
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
    }

    updateStatus(message, isError = false) {
        this.statusElement.textContent = message;
        this.statusElement.className = 'shader-status';
        
        if (isError) {
            this.statusElement.classList.add('show');
        } else {
            // Hide status for success (no error)
            this.statusElement.classList.remove('show');
        }
    }

    loadShader(text) {
        console.log("Attempting to load shader");
        try {
            // Attempt to load the shader - Rust throws on error, returns undefined on success
            this.wasmFunctions.load_shader_from_text(text);
            
            // If we get here, the shader loaded successfully
            this.updateStatus('', false); // Hide status on success
            console.log("Shader loaded successfully");
        } catch (error) {
            // Shader compilation failed - show the error message
            this.updateStatus(`Shader Error`, true);
            console.warn("Caught error:", error);
        }
    }

    reloadDefaultShader() {
        try {
            this.wasmFunctions.reload_shader();
            
            // If we get here, the reload was successful
            this.updateStatus('✓ Default shader reloaded', false);
            console.log("Default shader reloaded");
            
            // Update textarea with current shader
            setTimeout(() => {
                try {
                    const shader = this.wasmFunctions.get_current_shader_text();
                    if (shader) {
                        this.codeEditor.value = shader;
                    }
                } catch (error) {
                    console.error("Failed to get current shader:", error);
                }
            }, 100);
        } catch (error) {
            // Reload failed - show the error message
            this.updateStatus(`✗ Reload failed: ${error.message || error}`, true);
            console.error("Failed to reload shader:", error);
        }
    }

    loadExampleShader(type) {
        const examples = this.options.exampleShaders;
        if (examples[type]) {
            this.codeEditor.value = examples[type];
            // The input event will automatically trigger shader loading
            this.codeEditor.dispatchEvent(new Event('input'));
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
