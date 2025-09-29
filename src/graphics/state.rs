use std::sync::Arc;
use winit::{
    event_loop::ActiveEventLoop,
    keyboard::KeyCode,
    window::Window,
};

use crate::graphics::{create_gpu_resources, create_render_pipeline};
use crate::graphics::vertex::{create_index_buffer, create_vertex_buffer, INDICES};
use crate::graphics::camera::Camera;

pub struct State {
    pub background_color: wgpu::Color,
    pub camera: Camera,
    pub surface: wgpu::Surface<'static>,
    pub device: wgpu::Device,
    pub queue: wgpu::Queue,
    pub config: wgpu::SurfaceConfiguration,
    pub is_surface_configured: bool,
    pub render_pipeline: wgpu::RenderPipeline,
    pub vertex_buffer: wgpu::Buffer,
    pub index_buffer: wgpu::Buffer,
    pub num_indices: u32,
    pub camera_buffer: wgpu::Buffer,
    pub camera_bind_group: wgpu::BindGroup,
    pub window: Arc<Window>,
    pub current_shader: String,
}

impl State {
    pub async fn new(window: Arc<Window>) -> anyhow::Result<State> {
        let (surface, device, queue, config) = create_gpu_resources(window.clone()).await?;

        let camera = Camera {
            // position the camera back on the z-axis
            eye: (0.0, 0.0, 2.0).into(),
            // have it look at the origin
            target: (0.0, 0.0, 0.0).into(),
            // which way is "up"
            up: cgmath::Vector3::unit_y(),
            aspect: config.width as f32 / config.height as f32,
            fovy: 45.0,
            znear: 0.1,
            zfar: 100.0,
        };

        let (render_pipeline, camera_buffer, camera_bind_group) = create_render_pipeline(&device, &config, &camera);
        let vertex_buffer = create_vertex_buffer(&device);
        let index_buffer = create_index_buffer(&device);
        let num_indices = INDICES.len() as u32;

        Ok(Self {
            surface,
            device,
            queue,
            config,
            is_surface_configured: false,
            window,
            background_color: wgpu::Color {
                r: 0.1,
                g: 0.2,
                b: 0.3,
                a: 1.0,
            },
            camera,
            vertex_buffer,
            index_buffer,
            num_indices,
            camera_buffer,
            camera_bind_group,
            render_pipeline,
            current_shader: include_str!("../shader.wgsl").to_string(),
        })
    }

    pub fn resize(&mut self, width: u32, height: u32) {
        if width > 0 && height > 0 {
            log::info!("Resizing surface to {}x{}", width, height);
            self.config.width = width;
            self.config.height = height;
            self.surface.configure(&self.device, &self.config);
            self.is_surface_configured = true;
            
            // Update camera aspect ratio and uniform buffer
            self.camera.aspect = width as f32 / height as f32;
            let mut camera_uniform = crate::graphics::camera::CameraUniform::new();
            camera_uniform.update_view_proj(&self.camera);
            self.queue.write_buffer(&self.camera_buffer, 0, bytemuck::cast_slice(&[camera_uniform]));
        }
    }

    pub fn handle_key(&mut self, event_loop: &ActiveEventLoop, code: KeyCode, is_pressed: bool) {
        match (code, is_pressed) {
            (KeyCode::Escape, true) => event_loop.exit(),
            _ => {}
        }
    }

    pub fn render(&mut self) -> Result<(), wgpu::SurfaceError> {
        self.window.request_redraw();

        // We can't render unless the surface is configured
        if !self.is_surface_configured {
            log::warn!("Surface not configured, skipping render");
            return Ok(());
        }
        
        log::debug!("Rendering frame");

        let output = self.surface.get_current_texture()?;
        let view = output
            .texture
            .create_view(&wgpu::TextureViewDescriptor::default());

        let mut encoder = self
            .device
            .create_command_encoder(&wgpu::CommandEncoderDescriptor {
                label: Some("Render Encoder"),
            });

        {
            let mut render_pass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
                label: Some("Render Pass"),
                color_attachments: &[Some(wgpu::RenderPassColorAttachment {
                    depth_slice: None,
                    view: &view,
                    resolve_target: None,
                    ops: wgpu::Operations {
                        load: wgpu::LoadOp::Clear(self.background_color),
                        store: wgpu::StoreOp::Store,
                    },
                })],
                depth_stencil_attachment: None,
                occlusion_query_set: None,
                timestamp_writes: None,
            });

            render_pass.set_pipeline(&self.render_pipeline);
            render_pass.set_vertex_buffer(0, self.vertex_buffer.slice(..));
            render_pass.set_index_buffer(self.index_buffer.slice(..), wgpu::IndexFormat::Uint16);
            render_pass.set_bind_group(0, &self.camera_bind_group, &[]);
            render_pass.draw_indexed(0..self.num_indices, 0, 0..1);
        }

        self.queue.submit(std::iter::once(encoder.finish()));
        output.present();

        Ok(())
    }

    pub fn update(&mut self) {
        // Future update logic goes here
    }

    pub fn load_shader(&mut self, shader_source: &str) -> Result<(), String> {
        // Validate shader source is not empty
        if shader_source.trim().is_empty() {
            return Err("Shader source cannot be empty".to_string());
        }

        // Try to create a new shader module
        let shader_result = self.device.create_shader_module(wgpu::ShaderModuleDescriptor {
            label: Some("Dynamic Shader"),
            source: wgpu::ShaderSource::Wgsl(shader_source.into()),
        });

        // Create new render pipeline with the new shader
        let (new_render_pipeline, new_camera_buffer, new_camera_bind_group) = 
            crate::graphics::pipeline::create_render_pipeline_with_shader(
                &self.device, 
                &self.config, 
                &self.camera,
                &shader_result
            );

        // If we got here, the shader compiled successfully
        self.render_pipeline = new_render_pipeline;
        self.camera_buffer = new_camera_buffer;
        self.camera_bind_group = new_camera_bind_group;
        self.current_shader = shader_source.to_string();

        log::info!("Successfully loaded new shader ({} chars)", shader_source.len());
        Ok(())
    }

    pub fn reload_default_shader(&mut self) -> Result<(), String> {
        let default_shader = include_str!("../shader.wgsl");
        self.load_shader(default_shader)
    }
}