// Vertex shader

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
fn vs_main(
    model: VertexInput,
) -> VertexOutput {
    var out: VertexOutput;
    out.color = model.color;
    out.clip_position = vec4<f32>(model.pos, 1.0);
    out.uv = vec2<f32>(model.pos.x * 0.5 + 0.5, model.pos.y * 0.5 + 0.5);
    return out;
}

@fragment
fn fs_main(in: VertexOutput) -> @location(0) vec4<f32> {
    let uv = in.uv * 2.0 - 1.0;
    var dist = sin(length(uv * 8.0 * PI));
    dist += sin(atan2(uv.y, uv.x) * 8.0);
    var color = vec4<f32>(dist, dist, dist, 1.0);
    return color;
}
