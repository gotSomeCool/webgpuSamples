import { mat4 } from 'gl-matrix';
// import vertex from '../shaders/triangle/vertex.wgsl';
// import fragment from '../shaders/triangle/fragment.wgsl';
import { HEIGHT, noop, WIDTH } from '../constant';
import { RefObject } from 'react';

const SWAP_CHAIN_FORMAT = 'bgra8unorm';
const TOPOLOGY = 'triangle-list';

const vertex = `
const pos: array<vec2<f32>, 3> = array<vec2<f32>, 3>(
    vec2<f32>(0.0, 0.5),
    vec2<f32>(-0.5, -0.5),
    vec2<f32>(0.5, -0.5)
);
[[stage(vertex)]]
fn main([[builtin(vertex_index)]] VertexIndex: u32) -> [[builtin(position)]] vec4<f32> {
    return vec4<f32>(pos[VertexIndex], 0.0, 1.0);
}
`;
const fragment = `
[[stage(fragment)]]
fn main() -> [[location(0)]] vec4<f32> {
    return vec4<f32>(1.0, 0.0, 0.0, 1.0);
}
`

export async function init(canvas: RefObject<HTMLCanvasElement>) {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
        return noop;
    }
    const device = await adapter.requestDevice();
    
    const swapChain = canvas.current!.getContext("gpupresent")!.configureSwapChain({
        device,
        format: SWAP_CHAIN_FORMAT
    });
    const pipeline = device.createRenderPipeline({
        vertex: {
            module: device.createShaderModule({
                code: vertex
            }),
            entryPoint: 'main'
        },
        fragment: {
            module: device.createShaderModule({
                code: fragment
            }),
            entryPoint: 'main',
            targets: [{
                format: SWAP_CHAIN_FORMAT as GPUTextureFormat
            }]
        },
        primitive: {
            topology: TOPOLOGY
        }
    });

    const defaultTexture = device.createTexture({
        size: {
            width: WIDTH,
            height: HEIGHT
        },
        format: SWAP_CHAIN_FORMAT,
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC
    });

    function frame() {
        const commandEncoder = device.createCommandEncoder();
        const currTexture = swapChain.getCurrentTexture() ?? defaultTexture;
        const textureView = currTexture.createView();
        const renderPassEncoder = commandEncoder.beginRenderPass({
            colorAttachments: [
                {
                    view: textureView,
                    loadValue: {r: 0.0, g: 0.0, b: 0.0, a: 1.0},
                    storeOp: 'store' as GPUStoreOp
                }
            ]
        });
        renderPassEncoder.setPipeline(pipeline);
        renderPassEncoder.draw(3, 1, 0, 0);
        renderPassEncoder.endPass();
        const commandBuffer = commandEncoder.finish();
        device.queue.submit([commandBuffer]);
    }
    return frame;
}