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
    var dist = sin(length(uv * 8.0 * PI) - u_time.t);
    dist += sin(atan2(uv.y, uv.x) * 8.0 + u_time.t);
    let color = vec4<f32>(dist, dist, dist, 1.0);
    return color;
}`;
    }

    getWasmModulePath() {
        // Try to determine the correct path for the WASM module
        // This handles both local development and GitHub Pages deployment scenarios
        
        // First, try to get the current script's base URL
        const currentScript = document.currentScript;
        if (currentScript) {
            const scriptSrc = currentScript.src;
            const baseUrl = scriptSrc.substring(0, scriptSrc.lastIndexOf('/'));
            return `${baseUrl}/wgpu_shader_canvas.js`;
        }
        
        // Fallback: use relative path (should work in most cases)
        return './wgpu_shader_canvas.js';
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
                    <div id="shader-text" class="code-editor"></div>
                </div>
                <div class="canvas-panel">
                    <canvas id="canvas" class="shader-canvas"></canvas>
                    <div class="shader-status" id="shader-status"></div>
                </div>
            </div>
        `;

        // Get references to elements
        this.canvas = document.getElementById('canvas');
        this.codeEditorElement = document.getElementById('shader-text');
        this.statusElement = document.getElementById('shader-status');

        // Initialize CodeMirror 6
        await this.initializeCodeMirror();
    }

    async initializeCodeMirror() {
        // Import CodeMirror 6 modules
        const { EditorView, basicSetup } = await import('codemirror');
        const { cpp } = await import('@codemirror/lang-cpp');
        const { oneDark } = await import('@codemirror/theme-one-dark');
        const { EditorState } = await import('@codemirror/state');

        // Create CodeMirror 6 editor
        this.codeEditor = new EditorView({
            state: EditorState.create({
                doc: this.initialShader,
                extensions: [
                    basicSetup,
                    cpp(),
                    oneDark,
                    EditorView.lineWrapping,
                    EditorView.theme({
                        "&": {
                            height: "100%",
                            minHeight: "0",
                            fontSize: "14px"
                        },
                        ".cm-content": {
                            padding: "10px",
                            height: "100%",
                            minHeight: "0"
                        },
                        ".cm-editor": {
                            height: "100%",
                            minHeight: "0"
                        },
                        ".cm-scroller": {
                            fontFamily: "monospace",
                            overflow: "auto"
                        },
                        ".cm-focused": {
                            outline: "none"
                        }
                    }),
                    EditorView.updateListener.of((update) => {
                        if (update.docChanged) {
                            this.onShaderChange();
                        }
                    })
                ]
            }),
            parent: this.codeEditorElement
        });
    }

    async loadWasmModule() {
        try {
            // Try to determine the correct path for the WASM module
            const wasmPath = this.getWasmModulePath();
            this.wasmModule = await import(wasmPath);
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

    onShaderChange() {
        const text = this.codeEditor.state.doc.toString();
        this.loadShader(text);
    }

    setupEventListeners() {
        // Load initial shader immediately
        const initialShader = this.codeEditor.state.doc.toString();
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
            this.codeEditor.dispatch({
                changes: {
                    from: 0,
                    to: this.codeEditor.state.doc.length,
                    insert: this.initialShader
                }
            });
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
        this.codeEditor.dispatch({
            changes: {
                from: 0,
                to: this.codeEditor.state.doc.length,
                insert: code
            }
        });
    }

    getShaderCode() {
        return this.codeEditor.state.doc.toString();
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

// ES module export
export default ShaderCanvas;
