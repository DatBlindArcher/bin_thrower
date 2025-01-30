var physxWorld;
var time = 0, score = 0, showDebug = 1;
var dt = 0, fps = 0, ut = 0, rt = 0, gt = 0;
var width, height;
var in_background = false;
var scoreTxt;

async function main() {
    await RAPIER.init();
    let gravity = { x: 0.0, y: -9.81, z: 0.0 };
    physxWorld = new RAPIER.World(gravity);

    scoreTxt = document.getElementById('Score');

    await init_render();
    await init_game();
    
    background_update(background_update, 30);
    window.requestAnimationFrame(update);
}
async function init_render() {
    width = window.innerWidth;
    height = window.innerHeight;

    var surface = document.getElementById('surface');
    surface.width = width;
    surface.height = height;
    
    window.onresize = function () {
        width = window.innerWidth;
        height = window.innerHeight;
    
        var surface = document.getElementById('surface');
        surface.width = width;
        surface.height = height;
    
        renderResize(width, height);
    }

    defaultMaterial = await getShader('default');
    vertexCode = await getShader('vertex');
    await setup_render();
}

mousePos = { x: 0, y: 0 };
pressedKeys = new Map();
pressedDownKeys = new Map();

window.onkeyup = function(e) { pressedKeys[e.keyCode] = false; }
window.onkeydown = function(e) { 
    pressedKeys[e.keyCode] = true;
    pressedDownKeys[e.keyCode] = true;
    if (e.keyCode == Key.G) showDebug = showDebug == 0 ? 1 : 0;
}

window.onmousemove = function(e) { 
    mousePos = { x: e.clientX, y: e.clientY };
}

//window.onwheel = function(e) { zoom += e.deltaY / 100 }

window.onfocus = function (e) { in_background = false; }
window.onblur = function (e) { in_background = true; }

function update(t, background=false) {
    var start = performance.now();
    dt = (t - time) / 1000;
    fps = (1 / dt);
    time = t;

    physxWorld.step();
    let ptd = performance.now();
    pt = ptd - start;
    update_game();
    pressedDownKeys = new Map();
    et = performance.now() - ptd;
    render();
    update_ui();

    ut = performance.now() - start;
    if (!background) window.requestAnimationFrame(update);
}

function background_update() {
    if (in_background) update(performance.now(), true);
    setTimeout(background_update, 30);
}

function update_ui() {
    //fpsTxt.innerHTML = `fps: ${(fps).toFixed(1)}`;
    //dtTxt.innerHTML = `dt: ${(dt*1000).toFixed(1)}ms`;
    //ptTxt.innerHTML = `pt: ${pt.toFixed(1)}ms`;
    //etTxt.innerHTML = `et: ${et.toFixed(1)}ms`;
    //rtTxt.innerHTML = `rt: ${rt.toFixed(1)}ms`;
    //utTxt.innerHTML = `ut: ${ut.toFixed(1)}ms`;
    //gtTxt.innerHTML = `gt: ${(gt/1000/1000).toFixed(1)}ms`;

    scoreTxt.innerHTML = `Score: ${score}`;
}

window.main = main;