function transform(x=0, y=0, z=0, rotX=0, rotY=0, rotZ=0, scaleX=1, scaleY=1, scaleZ=1) {
    return [
        transformationMatrix(x,y,z,rotX,rotY,rotZ,scaleX,scaleY,scaleZ), 
        new Float32Array([scaleX, scaleY, scaleZ])
    ];
}

function transformationMatrix(x=0, y=0, z=0, rotX=0, rotY=0, rotZ=0, scaleX=1, scaleY=1, scaleZ=1) {
    let viewMatrix = identity();
    translate(viewMatrix, x, y, z);
    rotate(viewMatrix, 1, 0, 0, rotX);
    rotate(viewMatrix, 0, 1, 0, rotY);
    rotate(viewMatrix, 0, 0, 1, rotZ);
    return scale(viewMatrix, scaleX, scaleY, scaleZ);
}

function identity() {
    let dst = new Float32Array(16);

    dst[0] = 1; dst[1] = 0; dst[2] = 0; dst[3] = 0;
    dst[4] = 0; dst[5] = 1; dst[6] = 0; dst[7] = 0;
    dst[8] = 0; dst[9] = 0; dst[10] = 1; dst[11] = 0;
    dst[12] = 0; dst[13] = 0; dst[14] = 0; dst[15] = 1;

    return dst;
}

function perspective(fov, aspect, zNear, zFar) {
    let dst = new Float32Array(16);

    const f = Math.tan(Math.PI * 0.5 - 0.5 * (fov * (180 / Math.PI)));

    dst[0] = f / aspect;
    dst[1] = 0;
    dst[2] = 0;
    dst[3] = 0;

    dst[4] = 0;
    dst[5] = f;
    dst[6] = 0;
    dst[7] = 0;

    dst[8] = 0;
    dst[9] = 0;
    dst[11] = -1;

    dst[12] = 0;
    dst[13] = 0;
    dst[15] = 0;

    if (zFar === Infinity) {
        dst[10] = -1;
        dst[14] = -zNear;
    } else {
        const rangeInv = 1 / (zNear - zFar);
        dst[10] = zFar * rangeInv;
        dst[14] = zFar * zNear * rangeInv;
    }

    return dst;
}

function orthographic(left, right, bottom, top, near, far) {
    let dst = new Float32Array(16);

    dst[0] = 2 / (right - left);
    dst[1] = 0;
    dst[2] = 0;
    dst[3] = 0;

    dst[4] = 0;
    dst[5] = 2 / (top - bottom);
    dst[6] = 0;
    dst[7] = 0;

    dst[8] = 0;
    dst[9] = 0;
    dst[10] = 1 / (near - far);
    dst[11] = 0;

    dst[12] = (right + left) / (left - right);
    dst[13] = (top + bottom) / (bottom - top);
    dst[14] = near / (near - far);
    dst[15] = 1;

    return dst;
}

function translate(m, v0, v1, v2) {
    const m00 = m[0];
    const m01 = m[1];
    const m02 = m[2];
    const m03 = m[3];
    const m10 = m[1 * 4 + 0];
    const m11 = m[1 * 4 + 1];
    const m12 = m[1 * 4 + 2];
    const m13 = m[1 * 4 + 3];
    const m20 = m[2 * 4 + 0];
    const m21 = m[2 * 4 + 1];
    const m22 = m[2 * 4 + 2];
    const m23 = m[2 * 4 + 3];
    const m30 = m[3 * 4 + 0];
    const m31 = m[3 * 4 + 1];
    const m32 = m[3 * 4 + 2];
    const m33 = m[3 * 4 + 3];

    m[12] = m00 * v0 + m10 * v1 + m20 * v2 + m30;
    m[13] = m01 * v0 + m11 * v1 + m21 * v2 + m31;
    m[14] = m02 * v0 + m12 * v1 + m22 * v2 + m32;
    m[15] = m03 * v0 + m13 * v1 + m23 * v2 + m33;
}

function multiply(a, b) {
    let dst = new Float32Array(16);

    const a00 = a[0];
    const a01 = a[1];
    const a02 = a[2];
    const a03 = a[3];
    const a10 = a[4 + 0];
    const a11 = a[4 + 1];
    const a12 = a[4 + 2];
    const a13 = a[4 + 3];
    const a20 = a[8 + 0];
    const a21 = a[8 + 1];
    const a22 = a[8 + 2];
    const a23 = a[8 + 3];
    const a30 = a[12 + 0];
    const a31 = a[12 + 1];
    const a32 = a[12 + 2];
    const a33 = a[12 + 3];
    const b00 = b[0];
    const b01 = b[1];
    const b02 = b[2];
    const b03 = b[3];
    const b10 = b[4 + 0];
    const b11 = b[4 + 1];
    const b12 = b[4 + 2];
    const b13 = b[4 + 3];
    const b20 = b[8 + 0];
    const b21 = b[8 + 1];
    const b22 = b[8 + 2];
    const b23 = b[8 + 3];
    const b30 = b[12 + 0];
    const b31 = b[12 + 1];
    const b32 = b[12 + 2];
    const b33 = b[12 + 3];

    dst[0] = a00 * b00 + a10 * b01 + a20 * b02 + a30 * b03;
    dst[1] = a01 * b00 + a11 * b01 + a21 * b02 + a31 * b03;
    dst[2] = a02 * b00 + a12 * b01 + a22 * b02 + a32 * b03;
    dst[3] = a03 * b00 + a13 * b01 + a23 * b02 + a33 * b03;
    dst[4] = a00 * b10 + a10 * b11 + a20 * b12 + a30 * b13;
    dst[5] = a01 * b10 + a11 * b11 + a21 * b12 + a31 * b13;
    dst[6] = a02 * b10 + a12 * b11 + a22 * b12 + a32 * b13;
    dst[7] = a03 * b10 + a13 * b11 + a23 * b12 + a33 * b13;
    dst[8] = a00 * b20 + a10 * b21 + a20 * b22 + a30 * b23;
    dst[9] = a01 * b20 + a11 * b21 + a21 * b22 + a31 * b23;
    dst[10] = a02 * b20 + a12 * b21 + a22 * b22 + a32 * b23;
    dst[11] = a03 * b20 + a13 * b21 + a23 * b22 + a33 * b23;
    dst[12] = a00 * b30 + a10 * b31 + a20 * b32 + a30 * b33;
    dst[13] = a01 * b30 + a11 * b31 + a21 * b32 + a31 * b33;
    dst[14] = a02 * b30 + a12 * b31 + a22 * b32 + a32 * b33;
    dst[15] = a03 * b30 + a13 * b31 + a23 * b32 + a33 * b33;

    return dst;
}

function RadToDeg(x) {
    return x * 180 / Math.PI;
}

function DegToRad(x) {
    return x / 180 * Math.PI;
}

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
};

function rotate(m, x, y, z, angle) {
    let dst = m;
    angle *= Math.PI / 180;

    const n = Math.sqrt(x * x + y * y + z * z);
    x /= n;
    y /= n;
    z /= n;
    const xx = x * x;
    const yy = y * y;
    const zz = z * z;
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const oneMinusCosine = 1 - c;

    const r00 = xx + (1 - xx) * c;
    const r01 = x * y * oneMinusCosine + z * s;
    const r02 = x * z * oneMinusCosine - y * s;
    const r10 = x * y * oneMinusCosine - z * s;
    const r11 = yy + (1 - yy) * c;
    const r12 = y * z * oneMinusCosine + x * s;
    const r20 = x * z * oneMinusCosine + y * s;
    const r21 = y * z * oneMinusCosine - x * s;
    const r22 = zz + (1 - zz) * c;

    const m00 = m[0];
    const m01 = m[1];
    const m02 = m[2];
    const m03 = m[3];
    const m10 = m[4];
    const m11 = m[5];
    const m12 = m[6];
    const m13 = m[7];
    const m20 = m[8];
    const m21 = m[9];
    const m22 = m[10];
    const m23 = m[11];

    dst[0] = r00 * m00 + r01 * m10 + r02 * m20;
    dst[1] = r00 * m01 + r01 * m11 + r02 * m21;
    dst[2] = r00 * m02 + r01 * m12 + r02 * m22;
    dst[3] = r00 * m03 + r01 * m13 + r02 * m23;
    dst[4] = r10 * m00 + r11 * m10 + r12 * m20;
    dst[5] = r10 * m01 + r11 * m11 + r12 * m21;
    dst[6] = r10 * m02 + r11 * m12 + r12 * m22;
    dst[7] = r10 * m03 + r11 * m13 + r12 * m23;
    dst[8] = r20 * m00 + r21 * m10 + r22 * m20;
    dst[9] = r20 * m01 + r21 * m11 + r22 * m21;
    dst[10] = r20 * m02 + r21 * m12 + r22 * m22;
    dst[11] = r20 * m03 + r21 * m13 + r22 * m23;

    return dst;
}

function scale(m, x, y, z) {
    let mscale = new Float32Array(16);

    mscale[0] = x;
    mscale[1] = 0.0;
    mscale[2] = 0.0;
    mscale[3] = 0.0;
    mscale[4] = 0.0;
    mscale[5] = y;
    mscale[6] = 0.0;
    mscale[7] = 0.0;
    mscale[8] = 0.0;
    mscale[9] = 0.0;
    mscale[10] = z;
    mscale[11] = 0.0;
    mscale[12] = 0.0;
    mscale[13] = 0.0;
    mscale[14] = 0.0;
    mscale[15] = 1.0;

    return multiply(m, mscale);
}

function lookAt(eye, target, up) {
    let dst = new Float32Array(16);

    xAxis = new Float32Array(3);
    yAxis = new Float32Array(3);
    zAxis = new Float32Array(3);

    normalize(subtract(eye, target, zAxis), zAxis);
    normalize(cross(up, zAxis, xAxis), xAxis);
    normalize(cross(zAxis, xAxis, yAxis), yAxis);

    dst[0] = xAxis[0]; dst[1] = yAxis[0]; dst[2] = zAxis[0]; dst[3] = 0;
    dst[4] = xAxis[1]; dst[5] = yAxis[1]; dst[6] = zAxis[1]; dst[7] = 0;
    dst[8] = xAxis[2]; dst[9] = yAxis[2]; dst[10] = zAxis[2]; dst[11] = 0;

    dst[12] = -(xAxis[0] * eye[0] + xAxis[1] * eye[1] + xAxis[2] * eye[2]);
    dst[13] = -(yAxis[0] * eye[0] + yAxis[1] * eye[1] + yAxis[2] * eye[2]);
    dst[14] = -(zAxis[0] * eye[0] + zAxis[1] * eye[1] + zAxis[2] * eye[2]);
    dst[15] = 1;

    return dst;
}

function subtract(a, b, dst) {
    dst = dst || new Float32Array(3);

    dst[0] = a[0] - b[0];
    dst[1] = a[1] - b[1];
    dst[2] = a[2] - b[2];

    return dst;
}

function normalize(v, dst) {
    dst = dst || new Float32Array(3);

    const v0 = v[0];
    const v1 = v[1];
    const v2 = v[2];
    const len = Math.sqrt(v0 * v0 + v1 * v1 + v2 * v2);

    if (len > 0.00001) {
        dst[0] = v0 / len;
        dst[1] = v1 / len;
        dst[2] = v2 / len;
    } else {
        dst[0] = 0;
        dst[1] = 0;
        dst[2] = 0;
    }


    return dst;
}

function cross(a, b, dst) {
    dst = dst || new Float32Array(3);

    const t1 = a[2] * b[0] - a[0] * b[2];
    const t2 = a[0] * b[1] - a[1] * b[0];
    dst[0] = a[1] * b[2] - a[2] * b[1];
    dst[1] = t1;
    dst[2] = t2;

    return dst;
}

function dot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function project(a, b, dst) {
    dst = dst || new Float32Array(3);
    let s = dot(a, b) / (b[0]*b[0] + b[1]*b[1] + b[2]*b[2]);

    dst[0] = b[0] * s;
    dst[1] = b[1] * s;
    dst[2] = b[2] * s;

    return dst;
}

function invert(a) {
    var d = determinant(a);
    if (d == 0) reutrn;

    const m00 = a[0];
    const m01 = a[1];
    const m02 = a[2];
    const m03 = a[3];
    const m10 = a[4];
    const m11 = a[5];
    const m12 = a[6];
    const m13 = a[7];
    const m20 = a[8];
    const m21 = a[9];
    const m22 = a[10];
    const m23 = a[11];
    const m30 = a[12];
    const m31 = a[13];
    const m32 = a[14];
    const m33 = a[15];

    // first row
    var t00 = determinant3x3(m11, m12, m13, m21, m22, m23, m31, m32, m33);
    var t01 = -determinant3x3(m10, m12, m13, m20, m22, m23, m30, m32, m33);
    var t02 = determinant3x3(m10, m11, m13, m20, m21, m23, m30, m31, m33);
    var t03 = -determinant3x3(m10, m11, m12, m20, m21, m22, m30, m31, m32);

    // second row
    var t10 = -determinant3x3(m01, m02, m03, m21, m22, m23, m31, m32, m33);
    var t11 = determinant3x3(m00, m02, m03, m20, m22, m23, m30, m32, m33);
    var t12 = -determinant3x3(m00, m01, m03, m20, m21, m23, m30, m31, m33);
    var t13 = determinant3x3(m00, m01, m02, m20, m21, m22, m30, m31, m32);

    // third row
    var t20 = determinant3x3(m01, m02, m03, m11, m12, m13, m31, m32, m33);
    var t21 = -determinant3x3(m00, m02, m03, m10, m12, m13, m30, m32, m33);
    var t22 = determinant3x3(m00, m01, m03, m10, m11, m13, m30, m31, m33);
    var t23 = -determinant3x3(m00, m01, m02, m10, m11, m12, m30, m31, m32);

    // fourth row
    var t30 = -determinant3x3(m01, m02, m03, m11, m12, m13, m21, m22, m23);
    var t31 = determinant3x3(m00, m02, m03, m10, m12, m13, m20, m22, m23);
    var t32 = -determinant3x3(m00, m01, m03, m10, m11, m13, m20, m21, m23);
    var t33 = determinant3x3(m00, m01, m02, m10, m11, m12, m20, m21, m22);

    // transpose and divide by the determinant
    a[0] = t00 / d;
    a[1] = t10 / d;
    a[2] = t20 / d;
    a[3] = t30 / d;
    a[4] = t01 / d;
    a[5] = t11 / d;
    a[6] = t21 / d;
    a[7] = t31 / d;
    a[8] = t02 / d;
    a[9] = t12 / d;
    a[10] = t22 / d;
    a[11] = t32 / d;
    a[12] = t03 / d;
    a[13] = t13 / d;
    a[14] = t23 / d;
    a[15] = t33 / d;
}

function determinant3x3(t00, t01, t02, t10, t11, t12, t20, t21, t22) {
    return (t00 * (t11 * t22 - t12 * t21)
          + t01 * (t12 * t20 - t10 * t22)
          + t02 * (t10 * t21 - t11 * t20));
}

function determinant(a) {
    const m00 = a[0];
    const m01 = a[1];
    const m02 = a[2];
    const m03 = a[3];
    const m10 = a[4];
    const m11 = a[5];
    const m12 = a[6];
    const m13 = a[7];
    const m20 = a[8];
    const m21 = a[9];
    const m22 = a[10];
    const m23 = a[11];
    const m30 = a[12];
    const m31 = a[13];
    const m32 = a[14];
    const m33 = a[15];

    var f
        = m00
        * ((m11 * m22 * m33 + m12 * m23 * m31 + m13 * m21 * m32)
        - m13 * m22 * m31
        - m11 * m23 * m32
        - m12 * m21 * m33);
    f -= m01
        * ((m10 * m22 * m33 + m12 * m23 * m30 + m13 * m20 * m32)
        - m13 * m22 * m30
        - m10 * m23 * m32
        - m12 * m20 * m33);
    f += m02
        * ((m10 * m21 * m33 + m11 * m23 * m30 + m13 * m20 * m31)
        - m13 * m21 * m30
        - m10 * m23 * m31
        - m11 * m20 * m33);
    f -= m03
        * ((m10 * m21 * m32 + m11 * m22 * m30 + m12 * m20 * m31)
        - m12 * m21 * m30
        - m10 * m22 * m31
        - m11 * m20 * m32);
    return f;
}

function euler_to_quaternion(x, y, z) {
    let cr = Math.cos(DegToRad(x) * 0.5);
    let sr = Math.sin(DegToRad(x) * 0.5);
    let cp = Math.cos(DegToRad(y) * 0.5);
    let sp = Math.sin(DegToRad(y) * 0.5);
    let cy = Math.cos(DegToRad(z) * 0.5);
    let sy = Math.sin(DegToRad(z) * 0.5);

    return {
        w: cr * cp * cy + sr * sp * sy,
        x: sr * cp * cy - cr * sp * sy,
        y: cr * sp * cy + sr * cp * sy,
        z: cr * cp * sy - sr * sp * cy
    }
}

function quaternion_to_euler(x, y, z, w) {
    // roll (x-axis rotation)
    let sinr_cosp = 2 * (w * x + y * z);
    let cosr_cosp = 1 - 2 * (x * x + y * y);

    // pitch (y-axis rotation)
    let sinp = Math.sqrt(1 + 2 * (w * y - x * z));
    let cosp = Math.sqrt(1 - 2 * (w * y - x * z));

    // yaw (z-axis rotation)
    let siny_cosp = 2 * (w * z + x * y);
    let cosy_cosp = 1 - 2 * (y * y + z * z);

    return {
        x: Math.atan2(sinr_cosp, cosr_cosp),
        y: Math.atan2(siny_cosp, cosy_cosp),
        z: 2 * Math.atan2(sinp, cosp) - Math.PI / 2
    };
}

function project_on_plane(v, n) {
    const d = dot(v, n);
    return [v[0] - n[0] * d, v[1] - n[1] * d, v[2] - n[2] * d];
}

function lerp(min, max, t) {
    return t * (max - min) + min;
}