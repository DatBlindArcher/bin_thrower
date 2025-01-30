let lastPos = { x: 0, y: 0 };
let camRot = { x: 0, y: 0 };
let shader, bshader;
let balls = [];

async function init_game() {
    shader = vertexCode + await getShader('default');
    bshader = vertexCode + await getShader('defaultb');
    await load_classroom();
}

function update_game() {
    var delta = { x: mousePos.x - lastPos.x, y: mousePos.y - lastPos.y };
    //let m = delta.x * delta.x + delta.y * delta.y;
    
    if (lastPos.x > 0 && lastPos.y > 0) {
        camRot.x += delta.x / 10;
        camRot.y += delta.y / 10;
    }
    
    setCameraObject(1, .5, -10, camRot.y, 180 + camRot.x, 0);

    lastPos.x = mousePos.x;
    lastPos.y = mousePos.y;

    if (pressedDownKeys[Key.SPACE]) {
        spawn_ball();
    }

    for (let i = 0; i < balls.length; i++) {
        let ball = balls[i];
        let pos = ball.rb.translation();
        let rot = ball.rb.rotation();
        let hit = physxWorld.intersectionWithShape(pos, rot, new RAPIER.Ball(.1), 4, 0x00080008);

        if (hit) {
            console.log('hit!');
            score++;
            physxWorld.removeRigidBody(ball.rb);
            balls.splice(i, 1);
            i--;
        }
        
        //let rot = ball.rb.rotation();
        //rot = quaternion_to_euler(rot.x, rot.y, rot.z, rot.w);
        //let t = transform(pos.x, pos.y, pos.z, 0, 0, 0, 1, 1, 1);
        //updateRenderObject(ball.r, t);
    }
}

async function load_classroom() {

    /*entity = createRenderObject(
        transform(
            0, 0, 0, 
            0, 0, 0, 
            1, 1, 1
        ), 
        'cube',
        shader
    );

    physxWorld.createCollider(RAPIER.ColliderDesc.cuboid(1,1,1)
        .setTranslation(0,0,0)
        .setRotation(euler_to_quaternion(0,0,0))
        .setCollisionGroups(0x00010001)
    );
    return;*/

    var json = JSON.parse(await (await fetch('./map.json', {cache: "no-store"})).text());
    var frags = new Map();
    var renders = [];
    var entities = [];
    var colliders = [];

    for (var e of json.renders) {
        //if (!frags.has(e.frag)) 
        //    frags.set(e.frag, await getShader(e.frag));

        renders.push(createRenderObject(
            transform(
                e.pos.x,e.pos.y,e.pos.z, 
                e.rot.x,e.rot.y,e.rot.z, 
                e.scl.x/2,e.scl.y/2,e.scl.z/2
            ), 
            'cube',
            //frags.get(e.frag)
            shader
        ));

        if (e.frag != 'border') {       
            let c;

            if (e.frag == 'bin') {
                c = physxWorld.createCollider(RAPIER.ColliderDesc
                    .cuboid(e.scl.x/2,e.scl.y/2,e.scl.z/2)
                    .setTranslation(e.pos.x, e.pos.y, e.pos.z)
                    .setRotation(euler_to_quaternion(e.rot.x, e.rot.y, e.rot.z))
                    .setCollisionGroups(0x00090009)
                );
            }

            else {
                c = physxWorld.createCollider(RAPIER.ColliderDesc
                    .cuboid(e.scl.x/2,e.scl.y/2,e.scl.z/2)
                    .setTranslation(e.pos.x, e.pos.y, e.pos.z)
                    .setRotation(euler_to_quaternion(e.rot.x, e.rot.y, e.rot.z))
                    .setCollisionGroups(0x00010001)
                );
            }

            colliders.push(c);
        } else {
            colliders.push(null);
        }
    }

    for (var e of json.entities) {
        let entity = { c: {} };
        if (e.id) entity.id = e.id;
        if (e.tags.length > 0) entity.tags = e.tags;

        for (var c of e.components) {
            let component = {
                type: c.type,
            };

            if (c.name == 'render') {
                component.handle = renders[c.properties[0].value];

                if (e.components.some(x => x.name == 'collect')) {
                    colliders[c.properties[0].value].setCollisionGroups(0x00090009);
                }
            }

            else {
                for (var p of c.properties) {
                    component[p.name] = p.value;
                }
            }

            entity.c[c.name] = component;
        }
    }
}

function spawn_ball() {

    let r = null; /*reateRenderObject(
        transform(
            1, .5, -10, 
            camRot.y, 180 + camRot.x, 0, 
            .1/4, .1/4, .1/4
        ), 
        'cube',
        bshader
    );*/

    let power = 10;
    let dy = -Math.sin(DegToRad(camRot.y));
    let dx = -Math.sin(DegToRad(camRot.x));

    let rb = physxWorld.createRigidBody(
        RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(1, .5, -10)
        .setRotation(euler_to_quaternion(camRot.y, 180 + camRot.x, 0))
        .setLinvel(dx * power, dy * power, power)
    );

    let c = physxWorld.createCollider(RAPIER.ColliderDesc
        .ball(.1)
        .setCollisionGroups(0x00010001), rb
    );

    if (balls.length >= 3) {
        physxWorld.removeRigidBody(balls[0].rb);
        balls = balls.slice(1);
    }

    balls.push({r, c, rb});
}