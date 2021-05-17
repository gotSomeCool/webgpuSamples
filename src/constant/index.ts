export const HEIGHT = 600;
export const WIDTH = 800;
export const CANVAS_ID = 'renderView';

export * from './meshes';

export const noop = () => {return};

export const GPU_VERTEX_FORMAT_FLOAT_32_X4: GPUVertexFormat = 'float32x4';

export enum GPUPrimitiveTopology {
    TRIANGLE_LIST = 'triangle-list'
}

export enum CullMode {
    NONE = 'none',
    FRONT = 'front',
    BACK = 'back'
}

export enum GPUComaperFunctionType {
    LESS = 'less',
    EQUAL = 'equal',
    GREATER = 'greater'
}
