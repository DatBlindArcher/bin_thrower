struct FragParams {
    show_bounds: f32
}

struct MatParams {
    nonce: f32
}

@group(2) @binding(0) var<uniform> fragProps : FragParams;
@group(2) @binding(1) var<uniform> matProps : MatParams;

struct FragmentInput {
    @location(0) fragPos : vec3f,
    @location(1) objPos : vec3f,
    @location(2) objEye: vec3f,
    @location(3) worldPos: vec3f,
    @location(4) scale: vec3f,
}

struct OutputStruct {
    @location(0) color: vec4<f32>,
    @builtin(frag_depth) depth: f32
}

const color = vec3f(0,.8,1);

@fragment
fn frag(input : FragmentInput) -> OutputStruct {
    var output: OutputStruct;

    let eye = input.objEye;
    let hit = input.objPos;
    let n = length((eye - hit) * input.scale);

    let worldEye = (scene.viewMatrixInverse * vec4(0, 0, 0, 1)).xyz;
    
    let t = max(abs(hit.z), abs(hit.x))/3 + .5;
    output.color = vec4f(t,t,t,1);
    output.depth = 1 - 1 / n;
    return output;
}

fn edge(pos: vec3<f32>) -> bool {
    return 
        select(0, 1, pos.x > 0.98 || pos.x < -0.98) +
        select(0, 1, pos.y > 0.98 || pos.y < -0.98) +
        select(0, 1, pos.z > 0.98 || pos.z < -0.98) > 1;
}

fn material(eye: vec3f, cet: vec3f, hit: vec3f, distance: f32) -> vec4f {
    let t = max(abs(hit.z), abs(hit.x))/3 + .5;
    return vec4(color * t, 1.0);
}