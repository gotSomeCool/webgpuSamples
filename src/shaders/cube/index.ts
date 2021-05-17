
export const vertex = `
[[block]] struct Uniforms {
    modelViewProjectionMatrix: mat4x4<f32>;
};

[[binding(0), group(0)]] var<uniform> uniforms: Uniforms;

struct VertexOutput {
    [[builtin(position)]] Position: vec4<f32>;
    [[location(0)]] fragColor: vec4<f32>;
};

[[stage(vertex)]]
fn main([[location(0)]] position: vec4<f32>, [[location(1)]] color: vec4<f32>) -> VertexOutput {
    return VertexOutput(uniforms.modelViewProjectionMatrix * position, color);
}
`;
export const fragment = `
[[stage(fragment)]]
fn main([[location(0)]] fragColor: vec4<f32>) -> [[location(0)]] vec4<f32> {
    return fragColor;
}
`;
