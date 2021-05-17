/// <reference types="@webgpu/types" />

interface HTMLCanvasElement extends HTMLElement {
    getContext(contextId: 'gpupresent'): GPUCanvasContext | null;
}

declare module '*.wgsl' {
    const shader: 'string';
    export default shader;
}
