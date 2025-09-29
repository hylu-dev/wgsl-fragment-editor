use winit::event_loop::EventLoop;

#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::*;

#[cfg(target_arch = "wasm32")]
use web_sys::console;

// Module declarations
mod app;
mod graphics;

// Re-export public API
pub use app::App;
pub use graphics::state::State;

// Courtesy of https://sotrh.github.io/learn-wgpu/

pub fn run() -> anyhow::Result<()> {
    #[cfg(not(target_arch = "wasm32"))]
    {
        env_logger::init();
    }
    #[cfg(target_arch = "wasm32")]
    {
        console_log::init_with_level(log::Level::Info).unwrap_throw();
    }

    let event_loop = EventLoop::with_user_event().build()?;
    let mut app = App::new(
        #[cfg(target_arch = "wasm32")]
        &event_loop,
    );
    event_loop.run_app(&mut app)?;

    Ok(())
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen(start)]
pub fn run_web() -> Result<(), wasm_bindgen::JsValue> {
    console_error_panic_hook::set_once();
    run().unwrap_throw();

    Ok(())
}

// Simple shader loading functions that work with the current shader file
#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn load_shader_from_url(shader_url: &str) -> Result<(), wasm_bindgen::JsValue> {
    // For now, just log the request - the actual implementation would need
    // to be integrated into the app's event loop
    console::log_1(&format!("Request to load shader from: {}", shader_url).into());
    Err(wasm_bindgen::JsValue::from_str("Shader loading from URL not yet implemented - use load_shader_from_text instead"))
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn reload_shader() -> Result<(), wasm_bindgen::JsValue> {
    console::log_1(&"Request to reload shader".into());
    Err(wasm_bindgen::JsValue::from_str("Shader reloading not yet implemented - use load_shader_from_text instead"))
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn load_shader_from_text(shader_text: &str) -> Result<(), wasm_bindgen::JsValue> {
    // For now, just log the request - the actual implementation would need
    // to be integrated into the app's event loop
    console::log_1(&format!("Request to load shader text ({} chars)", shader_text.len()).into());
    Err(wasm_bindgen::JsValue::from_str("Shader loading from text not yet implemented - this is a placeholder"))
}
