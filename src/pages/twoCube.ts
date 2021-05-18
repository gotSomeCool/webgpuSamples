import { mat4, vec3 } from 'gl-matrix';
import { RefObject } from 'react';

import {
    Cube, cubePositionOffset, cubeUVOffset, cubeVertexCount, cubeVertexSize, CullMode,
    GPU_VERTEX_FORMAT_FLOAT_32_X2, GPU_VERTEX_FORMAT_FLOAT_32_X4, GPUComaperFunctionType,
    GPUPrimitiveTopology, HEIGHT, noop, WIDTH
} from '../constant';
import { basicPositionVertexShader, vertexPositionColorShader } from '../shaders/cube';

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
                code: basicPositionVertexShader
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
                            offset: cubeUVOffset,
                            format: GPU_VERTEX_FORMAT_FLOAT_32_X2
                        }
                    ]
                }
            ]
        },
        fragment: {
            module: device.createShaderModule({
                code: vertexPositionColorShader
            }),
            entryPoint: 'main',
            targets: [
                {
                    format: SWAP_CHAIN_FORMAT
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

    const matrixSize = 4 * 16;
    const uniformOffset = 256; // uniformBindGroup must be 256-byte aligned
    const uniformBufferSize = matrixSize + uniformOffset;
    const uniformBuffer = device.createBuffer({
        size: uniformBufferSize,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });

    const uniformBindGroup1 = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
            {
                binding: 0,
                resource: {
                    buffer: uniformBuffer,
                    offset: 0,
                    size: matrixSize
                }
            }
        ]
    });

    const uniformBindGroup2 = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
            {
                binding: 0,
                resource: {
                    buffer: uniformBuffer,
                    offset: uniformOffset,
                    size: matrixSize
                }
            }
        ]
    });

    const projectionMatrix = mat4.create();
    mat4.perspective(projectionMatrix,  Math.PI / 2, WIDTH / HEIGHT, 1, 100.0);
    mat4.translate(projectionMatrix, projectionMatrix, vec3.fromValues(0, 0, -7));

    const modelView1 = mat4.create();
    const modelView2 = mat4.create();

    mat4.translate(modelView1, modelView1, vec3.fromValues(4, 0, 0));
    mat4.translate(modelView2, modelView2, vec3.fromValues(-4, 0, 0));


    // const viewMatrix = mat4.create();
    // mat4.translate(viewMatrix, viewMatrix, vec3.fromValues(0, 0, -7));

    const angle = Math.PI / 90;

    const resultMatrix1 = mat4.create() as Float32Array;
    const resultMatrix2 = mat4.create() as Float32Array;

    function getTransformMatrix(): { m1: Float32Array, m2: Float32Array } {
        mat4.rotate(modelView1, modelView1, angle, vec3.fromValues(1, -1, 0));
        mat4.rotate(modelView2, modelView2, angle, vec3.fromValues(1, -1, 0));
        mat4.multiply(resultMatrix1, projectionMatrix, modelView1);
        mat4.multiply(resultMatrix2, projectionMatrix, modelView2);

        return {
            m1: resultMatrix1,
            m2: resultMatrix2
        };
    }

    function frame() {
        if (!canvas.current) return;

        const matrixs = getTransformMatrix();

        device.queue.writeBuffer(
            uniformBuffer,
            0,
            matrixs.m1.buffer,
            matrixs.m1.byteOffset,
            matrixs.m1.byteLength
        );

        device.queue.writeBuffer(
            uniformBuffer,
            uniformOffset,
            matrixs.m2.buffer,
            matrixs.m2.byteOffset,
            matrixs.m2.byteLength
        );


        const currTexture = swapChain.getCurrentTexture() ?? defaultTexture;
        renderPassDescriptor.colorAttachments[0].view = currTexture.createView();
        
        const commandEncoder = device.createCommandEncoder();
        const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
        passEncoder.setPipeline(pipeline);
        passEncoder.setVertexBuffer(0, verticesBuffer);

        passEncoder.setBindGroup(0, uniformBindGroup1);
        passEncoder.draw(cubeVertexCount, 1, 0, 0);

        passEncoder.setBindGroup(0, uniformBindGroup2);
        passEncoder.draw(cubeVertexCount, 1, 0, 0);

        passEncoder.endPass();
        
        device.queue.submit([commandEncoder.finish()]);
    }

    return frame;
}
