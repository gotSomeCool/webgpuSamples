import {Cube, cubePositionOffset, cubeColorOffset, noop, cubeVertexSize, GPU_VERTEX_FORMAT_FLOAT_32_X4, GPUPrimitiveTopology, CullMode, GPUComaperFunctionType, WIDTH, HEIGHT, cubeVertexCount} from '../constant';

import { RefObject } from 'react';
import {vertex, fragment} from '../shaders/cube';
import {mat4, vec3} from 'gl-matrix';
const SWAP_CHAIN_FORMAT = 'bgra8unorm';
const DEPTH_TEXTURE_FORMAT = 'depth24plus';

export async function init(canvas: RefObject<HTMLCanvasElement>) {
    const context = canvas.current!.getContext('gpupresent');
    const adapter = await navigator.gpu.requestAdapter();
    const device = await adapter?.requestDevice();
    if (!context || !device) {
        return noop;
    }

    const swapChain = context.configureSwapChain({
        device,
        format: SWAP_CHAIN_FORMAT
    });

    const verticesBuffer = device.createBuffer({
        size: Cube.byteLength,
        usage: GPUBufferUsage.VERTEX,
        mappedAtCreation: true
    });

    new Float32Array(verticesBuffer.getMappedRange()).set(Cube);
    verticesBuffer.unmap();
    
    const pipeline = device.createRenderPipeline({
        vertex: {
            module: device.createShaderModule({
                code: vertex
            }),
            entryPoint: 'main',
            buffers: [
                {
                    arrayStride: cubeVertexSize,
                    attributes: [
                        {
                            shaderLocation: 0,
                            offset: cubePositionOffset,
                            format: GPU_VERTEX_FORMAT_FLOAT_32_X4
                        }, {
                            shaderLocation: 1,
                            offset: cubeColorOffset,
                            format: GPU_VERTEX_FORMAT_FLOAT_32_X4
                        }
                    ]
                }
            ]
        },
        fragment: {
            module: device.createShaderModule({
                code: fragment
            }),
            entryPoint: 'main',
            targets: [
                {
                    format: SWAP_CHAIN_FORMAT as GPUTextureFormat
                }
            ]
        },
        primitive: {
            topology: GPUPrimitiveTopology.TRIANGLE_LIST,
            cullMode: CullMode.BACK
        },
        depthStencil: {
            format: DEPTH_TEXTURE_FORMAT,
            depthWriteEnabled: true,
            depthCompare: GPUComaperFunctionType.LESS
        }
    });
    
    const depthTexture = device.createTexture({
        size: {
            width: WIDTH,
            height: HEIGHT
        },
        format: DEPTH_TEXTURE_FORMAT,
        usage: GPUTextureUsage.RENDER_ATTACHMENT
    });

    const defaultTexture = device.createTexture({
        size: {
            width: WIDTH,
            height: HEIGHT
        },
        format: SWAP_CHAIN_FORMAT,
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC
    });

    const renderPassDescriptor: GPURenderPassDescriptor = {
        colorAttachments: [
            {
              view: undefined, // Assigned later
              loadValue: { r: 0.5, g: 0.5, b: 0.5, a: 1.0 },
              storeOp: 'store' as GPUStoreOp
            },
        ],
        depthStencilAttachment: {
            view: depthTexture.createView(),
            depthLoadValue: 1.0,
            depthStoreOp: 'store',
            stencilLoadValue: 0, 
            stencilStoreOp: 'store'
        }
    };

    const uniformBufferSize = 4 * 16;
    const uniformBuffer = device.createBuffer({
        size: uniformBufferSize,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });

    const uniformBindGroup = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
            {
                binding: 0,
                resource: {
                    buffer: uniformBuffer
                }
            }
        ]
    });

    const projectionMatrix = mat4.create();
    mat4.perspective(projectionMatrix,  Math.PI / 2, WIDTH / HEIGHT, 1, 100.0);
    mat4.translate(projectionMatrix, projectionMatrix, vec3.fromValues(0, 0, -5));

    const viewMatrix = mat4.create();
    const angle = Math.PI / 90;

    function getTransformMatrix(): Float32Array {
        mat4.rotate(viewMatrix, viewMatrix, angle, vec3.fromValues(1, 1, 0));
        const transformMatrix = mat4.create();
        mat4.multiply(transformMatrix, projectionMatrix, viewMatrix);
        return transformMatrix as Float32Array;
    }

    function frame() {
        const matrix = getTransformMatrix();
        device!.queue.writeBuffer(uniformBuffer, 0, matrix.buffer, matrix.byteOffset, matrix.byteLength);
        const currTexture = swapChain.getCurrentTexture() ?? defaultTexture;
        renderPassDescriptor.colorAttachments[0].view = currTexture.createView();
        
        const commandEncoder = device.createCommandEncoder();
        const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
        passEncoder.setPipeline(pipeline);
        passEncoder.setVertexBuffer(0, verticesBuffer);
        passEncoder.setBindGroup(0, uniformBindGroup);
        passEncoder.draw(cubeVertexCount, 1, 0, 0);
        passEncoder.endPass();
        
        device.queue.submit([commandEncoder.finish()]);
    }

    return frame;
}
