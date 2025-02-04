use rand::Rng;

use bevy::{
    prelude::*, 
    window::*,
    input::mouse::*, 
    input::touch::*
};
use bevy_rapier3d::prelude::*;

#[derive(Clone, Copy, Debug, Eq, Hash, PartialEq, States, Default)]
enum GameState {
    #[default]
    Loading,
    Loaded,
    Play
}

#[derive(Component)]
struct CameraRotation(f32, f32);

#[derive(Component)]
struct Ball;

#[derive(Resource)]
struct Level(i32);

#[derive(Component)]
struct LevelText;

#[derive(Default, Resource)]
struct GameAssets {
    scene: Handle<Scene>,
    //extra: Handle<Scene>,
    row1: Handle<Scene>,
    row2: Handle<Scene>,
    row3: Handle<Scene>,
    row4: Handle<Scene>,
    bin: Handle<Scene>,
    ball: Handle<Scene>,
}

fn game_run() {
    App::new()
        .insert_resource(ClearColor(Color::srgba_u8(127, 201, 255, 255)))
        .insert_resource(AmbientLight {
            color: Color::default(),
            brightness: 400.0,
        })
        .insert_resource(TimestepMode::Fixed {
            dt: 0.02, 
            substeps: 1
        })
        .insert_resource(Level(1))
        
        .add_plugins(DefaultPlugins.set(WindowPlugin {
            primary_window: Some(Window {
                title: "Bin Throw".to_string(),
                present_mode: PresentMode::AutoNoVsync,
                fit_canvas_to_parent: true,
                ..default()
            }),
            ..default()
        }))
        .add_plugins(RapierPhysicsPlugin::<NoUserData>::default().in_fixed_schedule())
        //.add_plugins(RapierDebugRenderPlugin::default())
        .init_state::<GameState>()

        .add_systems(OnEnter(GameState::Loading), start_assets_loading)
        .add_systems(Update, check_if_loaded.run_if(in_state(GameState::Loading)))
        .add_systems(OnEnter(GameState::Loaded), setup)
        .add_systems(OnEnter(GameState::Play), setup_colliders)

        .add_systems(Update, look_mouse.run_if(in_state(GameState::Play)))
        .add_systems(Update, spawn_ball.run_if(in_state(GameState::Play)))
        .add_systems(Update, check_ball.run_if(in_state(GameState::Play)))

        .run();
}

fn look_mouse(
    q_camera: Single<(&mut Transform, &mut CameraRotation), With<Camera>>, 
    mut mouse_motion: EventReader<MouseMotion>, 
    window: Query<&Window>,
) {
    let window = window.single();
    let (mut camera, mut rotation) = q_camera.into_inner();

    for ev in mouse_motion.read() {
        rotation.0 += ev.delta.x / window.resolution.width() * 360.0;
        rotation.1 += ev.delta.y / window.resolution.height() * 360.0;
        rotation.1 = rotation.1.clamp(-90.0, 90.0);
        camera.rotation = Quat::from_euler(EulerRot::ZYX, 0.0, -rotation.0.to_radians(), -rotation.1.to_radians());
    }
}

fn spawn_ball(
    mut commands: Commands,
    game_assets: Res<GameAssets>,
    q_camera: Single<&Transform, With<Camera>>, 
    buttons: Res<ButtonInput<MouseButton>>,
    mut touch_evr: EventReader<TouchInput>,
    balls: Query<Entity, With<Ball>>
) {
    let mut release = false;

    for ev in touch_evr.read() {
        if ev.phase == TouchPhase::Ended {
            release = true;
        }
    }

    if buttons.just_released(MouseButton::Left) {
        release = true;
    }

    if release {
        let camera = q_camera.into_inner();
        let force = camera.forward() * 40.0;

        for entity in balls.iter() {
            commands.entity(entity).despawn();
        }
        
        commands.spawn((SceneRoot(game_assets.ball.clone()),
            Ball,
            RigidBody::Dynamic,
            Ccd::enabled(),
            Sleeping::disabled(),
            Collider::ball(1.0),
            Restitution::coefficient(0.4),
            GravityScale(0.5),
            Transform::from_translation(camera.translation + camera.forward() * 0.02).with_scale(Vec3::new(0.05,0.05,0.05)),
            ExternalImpulse {
                impulse: force,
                torque_impulse: Vec3::ZERO
            }
        ));
    }
}

fn check_ball(
    mut commands: Commands,
    mut score: ResMut<Level>,
    balls: Query<Entity, With<Ball>>,
    text: Single<&mut Text, With<LevelText>>,
    rapier_context: Single<&RapierContext>,
    q_camera: Single<&mut Transform, With<Camera>>, 
) {
    let shape = Collider::ball(0.33/2.0);
    let shape_pos = Vec3::new(3.5917, 0.15, -3.6764);
    let shape_rot = Quat::IDENTITY;
    let filter = QueryFilter::from(QueryFilterFlags::ONLY_DYNAMIC);
    let mut t = text.into_inner();
    let mut camera = q_camera.into_inner();

    rapier_context.intersections_with_shape(shape_pos, shape_rot, &shape, filter, |_| {
        score.0 += 1;
        t.0 = format!("Level {}", score.0).to_string();

        if score.0 > 4 {
            score.0 = 4;
            t.0 = "Game Complete!".to_string();
        }

        for entity in balls.iter() {
            commands.entity(entity).despawn();
        }

        let xs = [3_f32, 1_f32, -1_f32, -3_f32];
        let x = xs[rand::thread_rng().gen_range(0..4)];
        let y = 1.25;
        let z = 0.68 + 1.6 * (score.0 as f32 - 1.0);
        camera.translation = Vec3::new(x, y, z);
        
        false
    });
}

fn start_assets_loading(mut commands: Commands, asset_server: Res<AssetServer>) {
    commands.insert_resource(GameAssets {
        scene: asset_server.load("Classroom.glb#Scene0"),
        row1: asset_server.load("row_1.glb#Scene0"),
        row2: asset_server.load("row_2.glb#Scene0"),
        row3: asset_server.load("row_3.glb#Scene0"),
        row4: asset_server.load("row_4.glb#Scene0"),
        //extra: asset_server.load("Classroom_Extra.glb#Scene0"),
        bin: asset_server.load("models/bin.glb#Scene0"),
        ball: asset_server.load("models/paper_ball.glb#Scene0"),
        ..default()
    });
}

fn check_if_loaded(
    mut scenes: ResMut<Assets<Scene>>,
    game_assets: Res<GameAssets>,
    mut game_state: ResMut<NextState<GameState>>,
) {
    let _ = if let Some(scene) = scenes.get_mut(&game_assets.scene) {
        scene
    } else {
        return;
    };

    game_state.set(GameState::Loaded);
}

fn setup(
    mut commands: Commands,
    game_assets: Res<GameAssets>,
    mut game_state: ResMut<NextState<GameState>>,
    rapier_context: Single<&mut RapierContext>
) {
    rapier_context.into_inner().integration_parameters.max_ccd_substeps = 4;

    let xs = [3_f32, 1_f32, -1_f32, -3_f32];
    let x = xs[rand::thread_rng().gen_range(0..4)];
    let y = 1.25;
    let z = 0.68;

    commands.spawn((
        Camera3d::default(),
        Projection::Perspective(PerspectiveProjection {
            near: 0.25,
            ..default()
        }),
        IsDefaultUiCamera,
        Transform::from_xyz(x, y, z).with_rotation(Quat::from_rotation_y(0_f32.to_radians())),
        CameraRotation(0.0, 0.0)
    ));

    commands.spawn((
        DirectionalLight {
            illuminance: 10000.0,
            shadows_enabled: false,
            ..default()
        },
        Transform {
            translation: Vec3::new(0.0, 2.0, 0.0),
            rotation: Quat::from_euler(EulerRot::YXZ, -90_f32.to_radians(), -25_f32.to_radians(), 0_f32.to_radians()),
            ..default()
        },
    ));

    commands.spawn((
        Text::new("Level 1"),
        LevelText
    ));

    commands.spawn(SceneRoot(game_assets.scene.clone()));
    commands.spawn(SceneRoot(game_assets.row1.clone()));
    commands.spawn(SceneRoot(game_assets.row2.clone()));
    commands.spawn(SceneRoot(game_assets.row3.clone()));
    commands.spawn(SceneRoot(game_assets.row4.clone()));
    commands.spawn(SceneRoot(game_assets.bin.clone()));
    game_state.set(GameState::Play);
}

fn setup_colliders(
    mut commands: Commands,
    asset_server: Res<Assets<Mesh>>,
    //game_assets: Res<GameAssets>,
    query: Query<(&Mesh3d, &GlobalTransform)>
) {
    let flags = TriMeshFlags::FIX_INTERNAL_EDGES | TriMeshFlags::DELETE_DUPLICATE_TRIANGLES;

    for (mesh3d, transform) in query.iter() {
        let mesh = asset_server.get(mesh3d).unwrap();

        commands.spawn((
            Collider::from_bevy_mesh(mesh, &ComputedColliderShape::TriMesh(flags)).unwrap(),
            transform.compute_transform()
        ));
    }

    //commands.spawn(SceneRoot(game_assets.extra.clone()));
}

fn main() {
    game_run();
}