use bevy::{
    prelude::*,
    pbr::{CascadeShadowConfigBuilder, DirectionalLightShadowMap},
    render::camera::{Exposure, PhysicalCameraParameters},
    input::mouse::*,
    window::*
};
use bevy_rapier3d::prelude::*;

#[derive(Resource, Default, Deref, DerefMut)]
struct Parameters(PhysicalCameraParameters);

#[derive(Component)]
struct CameraRotation(f32, f32);

fn game_run() {
    App::new()
        .insert_resource(ClearColor(Color::srgba_u8(127, 201, 255, 255)))
        .insert_resource(DirectionalLightShadowMap { size: 4096 })
        .insert_resource(Parameters(PhysicalCameraParameters {
            aperture_f_stops: 1.0,
            shutter_speed_s: 1.0 / 125.0,
            sensitivity_iso: 100.0,
            sensor_height: 0.01866,
        }))
        
        .add_plugins(DefaultPlugins.set(AssetPlugin {
            watch_for_changes_override: Some(true),
            ..Default::default()
        }).set(WindowPlugin {
            primary_window: Some(Window {
                title: "Bin Throw".to_string(),
                present_mode: PresentMode::AutoNoVsync,
                ..default()
            }),
            ..default()
        }))
        .add_plugins(RapierPhysicsPlugin::<NoUserData>::default())
        .add_plugins(RapierDebugRenderPlugin::default())

        .add_systems(Startup, setup)
        
        .add_systems(Update, look_mouse)

        .run();
}

fn look_mouse(q_camera: Single<(&mut Transform, &mut CameraRotation), With<Camera>>, mut mouse_motion: EventReader<MouseMotion>) {
    let (mut camera, mut rotation) = q_camera.into_inner();

    for ev in mouse_motion.read() {
        rotation.0 += ev.delta.x / 2.0;
        rotation.1 += ev.delta.y / 2.0;
        camera.rotation = Quat::from_euler(EulerRot::ZYX, 0.0, -rotation.0.to_radians(), -rotation.1.to_radians());
    }
}

fn setup(
    mut commands: Commands,
    asset_server: Res<AssetServer>,
    parameters: Res<Parameters>,
) {
    commands.spawn((
        Camera3d::default(),
        Transform::from_xyz(0.4, 1.742, 8.86).with_rotation(Quat::from_rotation_y(0_f32.to_radians())),
        Exposure::from_physical_camera(**parameters),
        CameraRotation(0.0, 0.0)
    ));

    commands.spawn((
        DirectionalLight {
            illuminance: light_consts::lux::OVERCAST_DAY,
            shadows_enabled: true,
            ..default()
        },
        Transform {
            translation: Vec3::new(0.0, 2.0, 0.0),
            rotation: Quat::from_euler(EulerRot::YXZ, -90_f32.to_radians(), -25_f32.to_radians(), 0_f32.to_radians()),
            ..default()
        },
        // The default cascade config is designed to handle large scenes.
        // As this example has a much smaller world, we can tighten the shadow
        // bounds for better visual quality.
        CascadeShadowConfigBuilder {
            first_cascade_far_bound: 4.0,
            maximum_distance: 20.0,
            ..default()
        }
        .build(),
    ));

    commands.spawn(SceneRoot(asset_server.load(
        GltfAssetLabel::Scene(0).from_asset("scene/scene_wn.glb"),
    )));
}

fn main() {
    game_run();
}