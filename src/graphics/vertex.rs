use wgpu::util::DeviceExt;

#[repr(C)]
#[derive(Copy, Clone, Debug, bytemuck::Pod, bytemuck::Zeroable)]
pub struct Vertex {
    pub position: [f32; 3],
    pub color: [f32; 3],
}

pub const VERTICES: &[Vertex] = &[
    Vertex { position: [-1.0, -1.0, 0.0], color: [1.0, 0.0, 1.0] }, // Bottom-left
    Vertex { position: [1.0, -1.0, 0.0], color: [1.0, 0.0, 1.0] },  // Bottom-right
    Vertex { position: [1.0, 1.0, 0.0], color: [1.0, 0.0, 1.0] },   // Top-right
    Vertex { position: [-1.0, 1.0, 0.0], color: [1.0, 0.0, 1.0] },  // Top-left
];

pub const INDICES: &[u16] = &[
    0, 1, 2,  // First triangle: bottom-left, bottom-right, top-right
    0, 2, 3,  // Second triangle: bottom-left, top-right, top-left
];

impl Vertex {
    const ATTRIBS: [wgpu::VertexAttribute; 2] =
        wgpu::vertex_attr_array![0 => Float32x3, 1 => Float32x3];

    pub fn desc() -> wgpu::VertexBufferLayout<'static> {
        use std::mem;

        wgpu::VertexBufferLayout {
            array_stride: mem::size_of::<Self>() as wgpu::BufferAddress,
            step_mode: wgpu::VertexStepMode::Vertex,
            attributes: &Self::ATTRIBS,
        }
    }
}

pub fn create_vertex_buffer(device: &wgpu::Device) -> wgpu::Buffer {
    device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
        label: Some("Vertex Buffer"),
        contents: bytemuck::cast_slice(VERTICES),
        usage: wgpu::BufferUsages::VERTEX,
    })
}

pub fn create_index_buffer(device: &wgpu::Device) -> wgpu::Buffer {
    device.create_buffer_init(&wgpu::util::BufferInitDescriptor {
        label: Some("Index Buffer"),
        contents: bytemuck::cast_slice(INDICES),
        usage: wgpu::BufferUsages::INDEX,
    })
}