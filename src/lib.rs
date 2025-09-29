use winit::event_loop::EventLoop;

#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::*;

#[cfg(target_arch = "wasm32")]
use web_sys::console;

#[cfg(target_arch = "wasm32")]
use std::sync::{Arc, Mutex};

#[cfg(target_arch = "wasm32")]
use std::cell::RefCell;

#[cfg(target_arch = "wasm32")]
thread_local! {
    static GLOBAL_STATE: RefCell<Option<Arc<Mutex<State>>>> = RefCell::new(None);
}

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

#[cfg(target_arch = "wasm32")]
pub fn set_global_state(state: Arc<Mutex<State>>) {
    GLOBAL_STATE.with(|global_state| {
        *global_state.borrow_mut() = Some(state);
    });
}

#[cfg(target_arch = "wasm32")]
fn with_global_state<F, R>(f: F) -> Result<R, wasm_bindgen::JsValue>
where
    F: FnOnce(&mut State) -> Result<R, String>,
{
    GLOBAL_STATE.with(|global_state| {
        let state_ref = global_state.borrow();
        if let Some(state_arc) = state_ref.as_ref() {
            let mut state = state_arc.lock().map_err(|e| {
                wasm_bindgen::JsValue::from_str(&format!("Failed to lock state: {}", e))
            })?;
            f(&mut *state).map_err(|e| wasm_bindgen::JsValue::from_str(&e))
        } else {
            Err(wasm_bindgen::JsValue::from_str("Graphics state not initialized yet"))
        }
    })
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn reload_shader() -> Result<(), wasm_bindgen::JsValue> {
    // console::log_1(&"Reloading default shader".into());
    
    with_global_state(|state| {
        state.reload_default_shader()
    })
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn load_shader_from_text(shader_text: &str) -> Result<(), wasm_bindgen::JsValue> {
    // console::log_1(&format!("Loading shader from text ({} chars)", shader_text.len()).into());
    
    with_global_state(|state| {
        state.load_shader(&shader_text)
    })
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub fn get_current_shader_text() -> Result<String, wasm_bindgen::JsValue> {
    with_global_state(|state| {
        Ok(state.current_shader.clone())
    })
}
