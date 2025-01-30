struct Scene {
    projectionViewMatrix: mat4x4f,
    viewMatrixInverse: mat4x4f
}

struct Model {
    modelMatrix: mat4x4f,
    modelMatrixInverse: mat4x4f,
    scale: vec4f
}

@group(0) @binding(0) var<uniform> scene : Scene;
@group(1) @binding(0) var<storage, read> model : array<Model>;

struct VertexOutput {
    @location(0) fragPos: vec3f,
    @location(1) objPos: vec3f,
    @location(2) objEye: vec3f,
    @location(3) worldPos: vec3f,
    @location(4) scale: vec3f,

    @builtin(position) Position: vec4f,
}

@vertex
fn vert(@location(0) position: vec3<f32>, @builtin(instance_index) index: u32) -> VertexOutput {
    var output : VertexOutput;
    output.Position = scene.projectionViewMatrix * model[index].modelMatrix * vec4(position, 1.0);
    output.fragPos = output.Position.xyz;
    output.objPos = position.xyz;
    output.objEye = (model[index].modelMatrixInverse * scene.viewMatrixInverse * vec4(0, 0, 0, 1)).xyz;
    output.worldPos = (model[index].modelMatrix * vec4(position, 1)).xyz;
    output.scale = model[index].scale.xyz;
    return output;
}