
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

export const basicPositionVertexShader = `
[[block]] struct Uniforms{
    modelViewProjectionMatrxi: mat4x4<f32>;
};
[[binding(0), group(0)]] var<uniform> uniforms: Uniforms;

struct VertexOutput {
    [[builtin(position)]] position: vec4<f32>;
    [[location(0)]] fragUV: vec2<f32>;
    [[location(1)]] fragPosition: vec4<f32>;
};

[[stage(vertex)]]
fn main(
    [[location(0)]] position: vec4<f32>,
    [[location(1)]] uv: vec2<f32>
) -> VertexOutput {
    var output: VertexOutput;
    output.position = uniforms.modelViewProjectionMatrxi * position;
    output.fragUV = uv;
    output.fragPosition = 0.5 * (position + vec4<f32>(1.0, 1.0, 1.0, 1.0));
    return output;
}
`;

export const vertexPositionColorShader = `
[[stage(fragment)]]
fn main(
    [[location(0)]] fragUV: vec2<f32>,
    [[location(1)]] fragPosition: vec4<f32>
) -> [[location(0)]] vec4<f32> {
    return fragPosition;
}
`;
