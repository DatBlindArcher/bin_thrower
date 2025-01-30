// WebGPU Context
var device;
var context;
var canvasFormat;
var depthTexture;

// Rendering
var modelviewBindGroupLayout;
var paramBindGroupLayout;
var bglForRender;
var sceneUniformBuffer;
var paramBuffer;
var sceneBindGroupForRender;
var renderPassDescriptor;

// Entities
var entities = [];
var models = {};

// Debug
var canTimestamp;
var querySet;
var resolveBuffer;
var resultBuffer;
var rt, gt;
var debugPipeline;
var debugVertexBuffer;
var screenRenderPassDescriptor;

async function setup_render() {
    var result = await initialize_webgpu();

    if (result != undefined) {
        alert(result);
    }

    createCubeModel();
    createHexModel();
}

function render() {
    var start = performance.now();
    const encoder = device.createCommandEncoder();
    const view = context.getCurrentTexture().createView();

    // Draw Entities
    {
        renderPassDescriptor.colorAttachments[0].view = view;
        const pass = encoder.beginRenderPass(renderPassDescriptor);

        for (var entity of entities) {
            pass.setPipeline(entity.pipeline);
            pass.setBindGroup(0, sceneBindGroupForRender);
            pass.setBindGroup(1, entity.modelViewBindGroup);
            pass.setBindGroup(2, entity.paramBindGroup);
            pass.setVertexBuffer(0, entity.model.vertexBuffer);
            pass.setIndexBuffer(entity.model.indexBuffer, "uint16");
            pass.drawIndexed(entity.model.indexCount, entity.instances);
        }

        pass.end();
    }

    // Draw Physics Debug
    if (showDebug)
    {
        const { vertices, colors } = physxWorld.debugRender();
        device.queue.writeBuffer(debugVertexBuffer, 0, vertices.buffer);

        screenRenderPassDescriptor.colorAttachments[0].view = view;
        const pass = encoder.beginRenderPass(screenRenderPassDescriptor);

        pass.setPipeline(debugPipeline);
        pass.setBindGroup(0, sceneBindGroupForRender);
        pass.setVertexBuffer(0, debugVertexBuffer);
        pass.draw(vertices.length / 3);
        pass.end();
    }

    if (canTimestamp) {
        encoder.resolveQuerySet(querySet, 0, querySet.count, resolveBuffer, 0);

        if (resultBuffer.mapState === 'unmapped') {
            encoder.copyBufferToBuffer(resolveBuffer, 0, resultBuffer, 0, resultBuffer.size);
        }
    }

    device.queue.submit([encoder.finish()]);

    var end = performance.now();
    rt = end - start;

    if (canTimestamp && resultBuffer.mapState === 'unmapped') {
        resultBuffer.mapAsync(GPUMapMode.READ).then(() => {
            const times = new BigInt64Array(resultBuffer.getMappedRange());
            gt = Number(times[1] - times[0]);
            resultBuffer.unmap();
        });
    }
}

async function initialize_webgpu() {
    // Check if WebGPU is supported
    if (!navigator.gpu) {
        return "WebGPU not supported on this browser.";
    }

    // Request adapter and device
    const adapter = await navigator.gpu.requestAdapter();

    if (!adapter) {
        return "No appropriate GPUAdapter found.";
    }

    canTimestamp = adapter.features.has('timestamp-query');
    device = await adapter.requestDevice({
        requiredFeatures: [...(canTimestamp ? ['timestamp-query'] : [])]
    });

    // Configure the Canvas
    const canvas = document.getElementById("surface");
    context = canvas.getContext("webgpu");
    canvasFormat = navigator.gpu.getPreferredCanvasFormat();
    context.configure({ device: device, format: canvasFormat });

    depthTexture = device.createTexture({
        size: [canvas.width, canvas.height],
        format: 'depth24plus-stencil8',
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });

    sceneUniformBuffer = device.createBuffer({
        size: 2 * 4 * 16,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM
    });
    
    modelviewBindGroupLayout = device.createBindGroupLayout({
        label: 'ModelView',
        entries: [
            {
                binding: 0,
                visibility: GPUShaderStage.VERTEX,
                buffer: {
                    type: 'read-only-storage',
                },
            },
        ],
    });

    paramBindGroupLayout = device.createBindGroupLayout({
        label: 'Param',
        entries: [{
                binding: 0,
                visibility: GPUShaderStage.FRAGMENT,
                buffer: {
                    type: 'uniform',
                },
            },{
                binding: 1,
                visibility: GPUShaderStage.FRAGMENT,
                buffer: {
                    type: 'uniform',
                }
            },
        ],
    });

    bglForRender = device.createBindGroupLayout({
        label: 'Scene',
        entries: [
            {
                binding: 0,
                visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                buffer: {
                    type: 'uniform',
                },
            }
        ],
    });

    sceneBindGroupForRender = device.createBindGroup({
        layout: bglForRender,
        entries: [
            {
                binding: 0,
                resource: {
                    buffer: sceneUniformBuffer,
                },
            }
        ]
    });

    if (canTimestamp) {
        querySet = device.createQuerySet({
            type: 'timestamp',
            count: 2,
        });
    
        resolveBuffer = device.createBuffer({
            size: querySet.count * 8,
            usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC,
        });
    
        resultBuffer = device.createBuffer({
            size: resolveBuffer.size,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
        });
    }

    renderPassDescriptor = {
        colorAttachments: [
            {
                // view is acquired and set in render loop.
                view: undefined,

                clearValue: { r: 0.2, g: 0.2, b: 0.2, a: 1.0 },
                loadOp: 'clear',
                storeOp: 'store',
            },
        ],
        depthStencilAttachment: {
            view: depthTexture.createView(),

            depthClearValue: 1.0,
            depthLoadOp: 'clear',
            depthStoreOp: 'store',
            stencilClearValue: 0,
            stencilLoadOp: 'clear',
            stencilStoreOp: 'store',
        },
        ...(canTimestamp && {
            timestampWrites: {
                querySet,
                beginningOfPassWriteIndex: 0,
                endOfPassWriteIndex: 1,
            },
        })
    };

    screenRenderPassDescriptor = {
        colorAttachments: [{
            // view is acquired and set in render loop.
            view: undefined,
            clearValue: { r: 0, g: 0, b: 0, a: 0 },
            loadOp: 'load',
            storeOp: 'store',
        }]
    };

    debugVertexBuffer = device.createBuffer({
        label: "debug-vertices",
        size: Float32Array.BYTES_PER_ELEMENT * 6 * 1024,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    debugPipeline = device.createRenderPipeline({
        label: "debug-pipeline",
        layout: device.createPipelineLayout({
            bindGroupLayouts: [bglForRender],
        }),
        vertex: {
            module: device.createShaderModule({
                label: 'vertex shader',
                code: `
struct Scene {
    projectionViewMatrix: mat4x4f,
    viewMatrixInverse: mat4x4f
}

@group(0) @binding(0) var<uniform> scene : Scene;

@vertex
fn main(@location(0) position: vec3f) -> @builtin(position) vec4f {
    return scene.projectionViewMatrix * vec4(position, 1.0);
}
`
            }),
            entryPoint: "main",
            buffers: [{
                arrayStride: Float32Array.BYTES_PER_ELEMENT * 3,
                attributes: [
                    {
                        // position
                        shaderLocation: 0,
                        offset: 0,
                        format: 'float32x3',
                    }
                ],
            }]
        },
        fragment: {
            module: device.createShaderModule({
                label: 'fragment shader',
                code: `
@fragment
fn main() -> @location(0) vec4f {
    return vec4f(1.0, 1.0, 1.0, 1.0);
}
`
            }),
            entryPoint: "main",
            targets: [{
                format: canvasFormat
            }],
        },
        primitive: {
            topology: 'line-list',
            cullMode: 'front'
        }
    });

    setCameraObject(0, 0, -10);
}

function renderResize() {
    const canvas = document.getElementById("surface");

    depthTexture = device.createTexture({
        size: [canvas.width, canvas.height],
        format: 'depth24plus-stencil8',
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });

    renderPassDescriptor = {
        colorAttachments: [
            {
                // view is acquired and set in render loop.
                view: undefined,

                clearValue: { r: 0.2, g: 0.2, b: 0.2, a: 1.0 },
                loadOp: 'clear',
                storeOp: 'store',
            },
        ],
        depthStencilAttachment: {
            view: depthTexture.createView(),

            depthClearValue: 1.0,
            depthLoadOp: 'clear',
            depthStoreOp: 'store',
            stencilClearValue: 0,
            stencilLoadOp: 'clear',
            stencilStoreOp: 'store',
        },
    };

    setCameraObject(0, 0, -10);
}

function setCameraObject(x, y, z, pitch = 0, jaw = 0, roll = 0) {
    var canvas = document.getElementById("surface");

    var projectionMatrix = perspective(60.0, canvas.width / canvas.height, .2, 100);
    var viewMatrix = identity();
    rotate(viewMatrix, 1, 0, 0, pitch);
    rotate(viewMatrix, 0, 1, 0, jaw);
    rotate(viewMatrix, 0, 0, 1, roll);
    translate(viewMatrix, -x, -y, -z);

    var cameraMatrix = multiply(projectionMatrix, viewMatrix);
    invert(viewMatrix);

    device.queue.writeBuffer(sceneUniformBuffer,0,cameraMatrix.buffer);
    device.queue.writeBuffer(sceneUniformBuffer,64,viewMatrix.buffer);
}

function updateRenderObject(entity, transform, index = 0) {
    device.queue.writeBuffer(entity.modelViewBuffer, 0 + 144 * index, transform[0].buffer);

    invert(transform[0]);
    device.queue.writeBuffer(entity.modelViewBuffer, 64 + 144 * index, transform[0].buffer);
    device.queue.writeBuffer(entity.modelViewBuffer, 128 + 144 * index, transform[1].buffer);
}

function updatePropertiesObject(entity, fragProps, matProps) {
    fragProps = new Float32Array(fragProps);
    matProps = new Float32Array(matProps);
    device.queue.writeBuffer(entity.fragBuffer, 0, fragProps.buffer);
    device.queue.writeBuffer(entity.matBuffer, 0, matProps.buffer);
}

function removeRenderObject(entity) {
    entities.splice(entities.indexOf(entity), 1);
}

function createRenderObject(transform, model, shader, fragProps, matProps) {
    fragProps ??= 1;
    matProps ??= 1;

    var entity = createRenderObjectInstanced(model, shader, fragProps, matProps, 1);
    updateRenderObject(entity, transform, 0);
    return entity;
}

function createRenderObjectInstanced(model, shader, fragProps, matProps, instances = 1) {
    const modelViewBuffer = device.createBuffer({
        size: 144 * instances,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
    });

    const fragBuffer = device.createBuffer({
        size: fragProps * 4,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM
    });

    const matBuffer = device.createBuffer({
        size: matProps * 4,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.UNIFORM
    });

    const paramBindGroup = device.createBindGroup({
        layout: paramBindGroupLayout,
        entries: [{
                binding: 0,
                resource: {
                    buffer: fragBuffer,
                },
            },{
                binding: 1,
                resource: {
                    buffer: matBuffer,
                },
            }
        ]
    });

    const modelViewBindGroup = device.createBindGroup({
        layout: modelviewBindGroupLayout,
        entries: [{
            binding: 0,
            resource: {
                buffer: modelViewBuffer,
            }
        }],
    });

    let pipeline = device.createRenderPipeline({
        label: "pipeline",
        layout: device.createPipelineLayout({
            bindGroupLayouts: [bglForRender, modelviewBindGroupLayout, paramBindGroupLayout],
        }),
        vertex: {
            module: device.createShaderModule({
                label: 'vertex shader',
                code: shader
            }),
            entryPoint: "vert",
            buffers: [{
                arrayStride: Float32Array.BYTES_PER_ELEMENT * 3,
                attributes: [
                    {
                        // position
                        shaderLocation: 0,
                        offset: 0,
                        format: 'float32x3',
                    }
                ],
            }]
        },
        fragment: {
            module: device.createShaderModule({
                label: 'fragment shader',
                code: shader
            }),
            entryPoint: "frag",
            targets: [{
                format: canvasFormat
            }],
        },
        primitive: {
            topology: 'triangle-list',
            cullMode: 'front'
        },
        depthStencil: {
            depthWriteEnabled: true,
            depthCompare: 'less',
            format: 'depth24plus-stencil8'
        }
    });

    var entity = {
        model: models[model],
        modelViewBindGroup,
        modelViewBuffer,
        paramBindGroup,
        fragBuffer,
        matBuffer,
        pipeline,
        instances
    };

    entities.push(entity);
    return entity;
}

function createCubeModel() {
    let model = {};
    let vertices = cube_vertices;
    let indices = cube_indices;

    model.vertexCount = vertices.buffer.byteLength / 12;
    model.vertexBuffer = device.createBuffer({
        label: "vertices",
        size: vertices.buffer.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    model.indexCount = indices.buffer.byteLength / 2;
    model.indexBuffer = device.createBuffer({
        label: "indices",
        size: indices.buffer.byteLength,
        usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    });

    device.queue.writeBuffer(model.vertexBuffer, 0, vertices.buffer);
    device.queue.writeBuffer(model.indexBuffer, 0, indices.buffer);
    models['cube'] = model;
}

function createHexModel() {
    let model = {};
    var hex_model = polygon_prism(6);
    let vertices = hex_model.v;
    let indices = hex_model.i;

    model.vertexCount = vertices.buffer.byteLength / 12;
    model.vertexBuffer = device.createBuffer({
        label: "vertices",
        size: vertices.buffer.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    model.indexCount = indices.buffer.byteLength / 2;
    model.indexBuffer = device.createBuffer({
        label: "indices",
        size: indices.buffer.byteLength,
        usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    });

    device.queue.writeBuffer(model.vertexBuffer, 0, vertices.buffer);
    device.queue.writeBuffer(model.indexBuffer, 0, indices.buffer);
    models['hex'] = model;
}

const fragRegex = /^@import\s'(.*)'$/gm;

async function getShader(shader) {
    var shaderpath = shader.indexOf('/') > -1 ? shader.substring(0, shader.lastIndexOf("/") + 1) : '';
    var frag = await (await fetch(`./shaders/${shader}.wgsl`, {cache: "no-store"})).text();
    var match;
    
    while ((match = fragRegex.exec(frag))) {
        let path = getFragmentPath(match[1], shaderpath);
        frag = frag.replace(match[0], await getShader(path));
    }

    return frag;
}

function getFragmentPath(path, shaderpath) {
    if (path.endsWith('.wgsl')) {
        path = path.substring(0, path.length - 5);
    }

    if (path.startsWith('/')) {
        return path.substring(1, path.length);
    }

    if (path.startsWith('../')) {
        console.error('Path reversal not implemented yet.');
    }

    if (path.startsWith('./')) {
        path = path.substring(2, path.length);
    }

    return shaderpath + path;
}

const cube_vertices = new Float32Array([
    -1, -1, -1,
     1, -1, -1,
     1,  1, -1,
    -1,  1, -1,
    -1, -1,  1,
     1, -1,  1,
     1,  1,  1,
    -1,  1,  1
]);

const cube_indices = new Uint16Array([
    0, 1, 3, 3, 1, 2,
    1, 5, 2, 2, 5, 6,
    5, 4, 6, 6, 4, 7,
    4, 0, 7, 7, 0, 3,
    3, 2, 7, 7, 2, 6,
    4, 5, 0, 0, 5, 1
]);

function polygon_prism(c) {
    let a = 360 / c;
    let v = new Float32Array(3*(2 * c + 2));
    v[0] = 0; v[1] = .5; v[2] = 0;
    v[3] = 0; v[4] = -.5; v[5] = 0;

    let i = new Uint16Array(c * 12);

    for (var s = 0; s < c; s++) {
        var r = DegToRad(s * a);
        v[6 + s*3 + 0] = Math.cos(r)/2; 
        v[6 + s*3 + 1] = .5; 
        v[6 + s*3 + 2] = Math.sin(r)/2;
        
        v[6 + c*3 + s*3 + 0] = Math.cos(r)/2; 
        v[6 + c*3 + s*3 + 1] = -.5; 
        v[6 + c*3 + s*3 + 2] = Math.sin(r)/2;
    }

    for (var s = 0; s < c; s++) {
        let s2 = (s + 1) % c;

        // Top triangle
        i[s*12+0] = 0;
        i[s*12+1] = 2+s;
        i[s*12+2] = 2+s2;
        
        // Top side triangle
        i[s*12+3] = 2+c+s2;
        i[s*12+4] = 2+s2;
        i[s*12+5] = 2+s;
        
        // Bottom side triangle
        i[s*12+6] = 2+s;
        i[s*12+7] = 2+c+s;
        i[s*12+8] = 2+c+s2;

        // Bottom triangle
        i[s*12+ 9] = 1;
        i[s*12+10] = 2+c+s;
        i[s*12+11] = 2+c+s2;
    }

    return { v: new Float32Array(v), i: new Uint16Array(i) };
}

// Has issues
function debug_model(model) {
    let v = [];

    // Connect the lines for triangles
    for (var i = 0; i < model.i.length/3; i++) {
        v.push(model.v[model.i[i*3]*3]);
        v.push(model.v[model.i[i*3]*3+1]);
        v.push(model.v[model.i[i*3]*3+2]);
        
        v.push(model.v[model.i[i*3+1]*3]);
        v.push(model.v[model.i[i*3+1]*3+1]);
        v.push(model.v[model.i[i*3+1]*3+2]);
        
        v.push(model.v[model.i[i*3+2]*3]);
        v.push(model.v[model.i[i*3+2]*3+1]);
        v.push(model.v[model.i[i*3+2]*3+2]);

        v.push(model.v[model.i[i*3]*3]);
        v.push(model.v[model.i[i*3]*3+1]);
        v.push(model.v[model.i[i*3]*3+2]);
    }

    return new Float32Array(v);
}

function scale_model(model, scale) {
    for (var i = 0; i < model.v.length/3; i++) {
        model.v[i*3+0] *= scale[0];
        model.v[i*3+1] *= scale[1];
        model.v[i*3+2] *= scale[2];
    }

    return model;
}