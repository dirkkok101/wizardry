/**
 * Matrix math utilities for WebGL rendering.
 *
 * All matrices are column-major Float32Array (WebGL convention).
 */
export class MatrixService {
  /**
   * Create 4x4 perspective projection matrix.
   *
   * @param fovY - Vertical field of view in radians
   * @param aspect - Aspect ratio (width / height)
   * @param near - Near clipping plane
   * @param far - Far clipping plane
   * @returns Column-major 4x4 matrix
   */
  static perspective(fovY: number, aspect: number, near: number, far: number): Float32Array {
    const f = 1.0 / Math.tan(fovY / 2);
    const rangeInv = 1.0 / (near - far);

    return new Float32Array([
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (near + far) * rangeInv, -1,
      0, 0, near * far * rangeInv * 2, 0
    ]);
  }

  /**
   * Create 4x4 view matrix from position and direction.
   *
   * @param posX - Camera X position (world space)
   * @param posY - Camera Y position (world space, up axis)
   * @param posZ - Camera Z position (world space)
   * @param dirX - Direction X component
   * @param dirY - Direction Y component (typically 0 for horizontal view)
   * @param dirZ - Direction Z component
   * @returns Column-major 4x4 view matrix
   */
  static lookAt(
    posX: number, posY: number, posZ: number,
    dirX: number, dirY: number, dirZ: number
  ): Float32Array {
    // Calculate forward vector (normalized direction)
    const fwdLen = Math.sqrt(dirX * dirX + dirY * dirY + dirZ * dirZ);
    const fwdX = dirX / fwdLen;
    const fwdY = dirY / fwdLen;
    const fwdZ = dirZ / fwdLen;

    // Up vector (always Y-up in dungeon)
    const upX = 0, upY = 1, upZ = 0;

    // Right = forward × up
    const rightX = fwdY * upZ - fwdZ * upY;
    const rightY = fwdZ * upX - fwdX * upZ;
    const rightZ = fwdX * upY - fwdY * upX;
    const rightLen = Math.sqrt(rightX * rightX + rightY * rightY + rightZ * rightZ);
    const normRightX = rightX / rightLen;
    const normRightY = rightY / rightLen;
    const normRightZ = rightZ / rightLen;

    // Recalculate up = right × forward
    const newUpX = normRightY * fwdZ - normRightZ * fwdY;
    const newUpY = normRightZ * fwdX - normRightX * fwdZ;
    const newUpZ = normRightX * fwdY - normRightY * fwdX;

    // Create view matrix (inverse of camera transform)
    return new Float32Array([
      normRightX, newUpX, -fwdX, 0,
      normRightY, newUpY, -fwdY, 0,
      normRightZ, newUpZ, -fwdZ, 0,
      -(normRightX * posX + normRightY * posY + normRightZ * posZ),
      -(newUpX * posX + newUpY * posY + newUpZ * posZ),
      -(-fwdX * posX + -fwdY * posY + -fwdZ * posZ),
      1
    ]);
  }

  /**
   * Create identity matrix.
   */
  static identity(): Float32Array {
    return new Float32Array([
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    ]);
  }
}
