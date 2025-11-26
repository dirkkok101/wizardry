import { MatrixService } from '../MatrixService';

describe('MatrixService', () => {
  describe('identity', () => {
    it('creates 16-element matrix', () => {
      const mat = MatrixService.identity();
      expect(mat).toHaveLength(16);
    });

    it('creates identity matrix with 1s on diagonal', () => {
      const mat = MatrixService.identity();
      // Column-major format: diagonal elements are at indices 0, 5, 10, 15
      expect(mat[0]).toBe(1);  // [0,0]
      expect(mat[5]).toBe(1);  // [1,1]
      expect(mat[10]).toBe(1); // [2,2]
      expect(mat[15]).toBe(1); // [3,3]
    });

    it('creates identity matrix with 0s off diagonal', () => {
      const mat = MatrixService.identity();
      const offDiagonalIndices = [1, 2, 3, 4, 6, 7, 8, 9, 11, 12, 13, 14];

      offDiagonalIndices.forEach(index => {
        expect(mat[index]).toBe(0);
      });
    });

    it('returns Float32Array', () => {
      const mat = MatrixService.identity();
      expect(mat).toBeInstanceOf(Float32Array);
    });
  });

  describe('perspective', () => {
    it('creates 16-element matrix', () => {
      const mat = MatrixService.perspective(Math.PI / 2, 1.0, 0.1, 100);
      expect(mat).toHaveLength(16);
    });

    it('returns Float32Array', () => {
      const mat = MatrixService.perspective(Math.PI / 2, 1.0, 0.1, 100);
      expect(mat).toBeInstanceOf(Float32Array);
    });

    it('calculates field of view correctly for 90 degrees', () => {
      const fovY = Math.PI / 2; // 90 degrees
      const aspect = 1.0;
      const mat = MatrixService.perspective(fovY, aspect, 0.1, 100);

      // f = 1.0 / tan(PI/4) = 1.0 / 1.0 = 1.0
      // mat[0] = f / aspect = 1.0 / 1.0 = 1.0
      // mat[5] = f = 1.0
      expect(mat[0]).toBeCloseTo(1.0, 5);
      expect(mat[5]).toBeCloseTo(1.0, 5);
    });

    it('calculates field of view correctly for 60 degrees', () => {
      const fovY = Math.PI / 3; // 60 degrees
      const aspect = 1.0;
      const mat = MatrixService.perspective(fovY, aspect, 0.1, 100);

      // f = 1.0 / tan(PI/6) = 1.0 / 0.57735 ≈ 1.732
      const expectedF = 1.0 / Math.tan(Math.PI / 6);
      expect(mat[0]).toBeCloseTo(expectedF, 5);
      expect(mat[5]).toBeCloseTo(expectedF, 5);
    });

    it('handles aspect ratio correctly', () => {
      const fovY = Math.PI / 2;
      const aspect = 16.0 / 9.0; // Widescreen
      const mat = MatrixService.perspective(fovY, aspect, 0.1, 100);

      const f = 1.0 / Math.tan(fovY / 2);
      expect(mat[0]).toBeCloseTo(f / aspect, 5);
      expect(mat[5]).toBeCloseTo(f, 5);
    });

    it('sets up near and far planes correctly', () => {
      const near = 0.1;
      const far = 100;
      const mat = MatrixService.perspective(Math.PI / 2, 1.0, near, far);

      const rangeInv = 1.0 / (near - far);
      const expectedZ = (near + far) * rangeInv;
      const expectedW = near * far * rangeInv * 2;

      expect(mat[10]).toBeCloseTo(expectedZ, 5); // Z component
      expect(mat[14]).toBeCloseTo(expectedW, 5); // W component
    });

    it('sets perspective divide correctly', () => {
      const mat = MatrixService.perspective(Math.PI / 2, 1.0, 0.1, 100);

      // Column 2, row 3 should be -1 for perspective divide
      expect(mat[11]).toBe(-1);
    });

    it('zeros out unused elements', () => {
      const mat = MatrixService.perspective(Math.PI / 2, 1.0, 0.1, 100);

      // Verify zero elements in column-major format
      const zeroIndices = [1, 2, 3, 4, 6, 7, 8, 9, 12, 13, 15];
      zeroIndices.forEach(index => {
        expect(mat[index]).toBe(0);
      });
    });

    it('handles narrow field of view', () => {
      const fovY = Math.PI / 6; // 30 degrees - narrow FOV
      const mat = MatrixService.perspective(fovY, 1.0, 0.1, 100);

      const f = 1.0 / Math.tan(fovY / 2);
      expect(mat[0]).toBeCloseTo(f, 5);
      expect(f).toBeGreaterThan(3.0); // Narrow FOV means larger f value
    });

    it('handles wide field of view', () => {
      const fovY = (2 * Math.PI) / 3; // 120 degrees - wide FOV
      const mat = MatrixService.perspective(fovY, 1.0, 0.1, 100);

      const f = 1.0 / Math.tan(fovY / 2);
      expect(mat[0]).toBeCloseTo(f, 5);
      expect(f).toBeLessThan(1.0); // Wide FOV means smaller f value
    });
  });

  describe('lookAt', () => {
    it('creates 16-element matrix', () => {
      const mat = MatrixService.lookAt(0, 0, 0, 0, 0, -1);
      expect(mat).toHaveLength(16);
    });

    it('returns Float32Array', () => {
      const mat = MatrixService.lookAt(0, 0, 0, 0, 0, -1);
      expect(mat).toBeInstanceOf(Float32Array);
    });

    it('creates view matrix for camera at origin looking north', () => {
      // North = negative Z in our coordinate system
      const mat = MatrixService.lookAt(0, 0, 0, 0, 0, -1);

      // Right vector should be (-1, 0, 0) for north-facing (negated for left/right fix)
      expect(mat[0]).toBeCloseTo(-1, 5);
      expect(mat[1]).toBeCloseTo(0, 5);
      expect(mat[2]).toBeCloseTo(0, 5);

      // Up vector should remain (0, 1, 0)
      expect(mat[4]).toBeCloseTo(0, 5);
      expect(mat[5]).toBeCloseTo(1, 5);
      expect(mat[6]).toBeCloseTo(0, 5);

      // Forward vector (negated) should be (0, 0, 1)
      expect(mat[8]).toBeCloseTo(0, 5);
      expect(mat[9]).toBeCloseTo(0, 5);
      expect(mat[10]).toBeCloseTo(1, 5);
    });

    it('creates view matrix for camera at origin looking south', () => {
      // South = positive Z
      const mat = MatrixService.lookAt(0, 0, 0, 0, 0, 1);

      // Right vector should be (1, 0, 0) for south-facing (negated for left/right fix)
      expect(mat[0]).toBeCloseTo(1, 5);
      expect(mat[1]).toBeCloseTo(0, 5);
      expect(mat[2]).toBeCloseTo(0, 5);

      // Forward vector (negated) should be (0, 0, -1)
      expect(mat[8]).toBeCloseTo(0, 5);
      expect(mat[9]).toBeCloseTo(0, 5);
      expect(mat[10]).toBeCloseTo(-1, 5);
    });

    it('creates view matrix for camera at origin looking east', () => {
      // East = positive X
      const mat = MatrixService.lookAt(0, 0, 0, 1, 0, 0);

      // Right vector should be (0, 0, -1) for east-facing (negated for left/right fix)
      expect(mat[0]).toBeCloseTo(0, 5);
      expect(mat[1]).toBeCloseTo(0, 5);
      expect(mat[2]).toBeCloseTo(-1, 5);

      // Forward vector (negated) should be (-1, 0, 0)
      expect(mat[8]).toBeCloseTo(-1, 5);
      expect(mat[9]).toBeCloseTo(0, 5);
      expect(mat[10]).toBeCloseTo(0, 5);
    });

    it('creates view matrix for camera at origin looking west', () => {
      // West = negative X
      const mat = MatrixService.lookAt(0, 0, 0, -1, 0, 0);

      // Right vector should be (0, 0, 1) for west-facing (negated for left/right fix)
      expect(mat[0]).toBeCloseTo(0, 5);
      expect(mat[1]).toBeCloseTo(0, 5);
      expect(mat[2]).toBeCloseTo(1, 5);

      // Forward vector (negated) should be (1, 0, 0)
      expect(mat[8]).toBeCloseTo(1, 5);
      expect(mat[9]).toBeCloseTo(0, 5);
      expect(mat[10]).toBeCloseTo(0, 5);
    });

    it('handles camera position translation', () => {
      const posX = 5, posY = 2, posZ = 3;
      const mat = MatrixService.lookAt(posX, posY, posZ, 0, 0, -1);

      // Translation column should be computed from dot products
      // For north-facing at (5, 2, 3):
      // Right = (-1, 0, 0) [negated], Up = (0, 1, 0), Forward = (0, 0, -1)
      // TX = -(-1*5 + 0*2 + 0*3) = 5
      // TY = -(0*5 + 1*2 + 0*3) = -2
      // TZ = -(0*5 + 0*2 + 1*3) = -3
      expect(mat[12]).toBeCloseTo(5, 5);
      expect(mat[13]).toBeCloseTo(-2, 5);
      expect(mat[14]).toBeCloseTo(-3, 5);
    });

    it('normalizes direction vector', () => {
      // Pass unnormalized direction vector (2, 0, -2)
      const mat = MatrixService.lookAt(0, 0, 0, 2, 0, -2);

      // Should produce same result as normalized (0.707..., 0, -0.707...)
      const normalized = MatrixService.lookAt(0, 0, 0, Math.SQRT1_2, 0, -Math.SQRT1_2);

      for (let i = 0; i < 16; i++) {
        expect(mat[i]).toBeCloseTo(normalized[i], 5);
      }
    });

    it('maintains Y-up convention', () => {
      // Test that up vector is always based on Y-axis
      const mat = MatrixService.lookAt(0, 0, 0, 1, 0, 1);

      // Up vector (column 1) should have Y component
      expect(mat[5]).toBeGreaterThan(0.5); // Y component of up vector should be positive
    });

    it('sets homogeneous coordinate correctly', () => {
      const mat = MatrixService.lookAt(0, 0, 0, 0, 0, -1);

      // Last element should be 1 (homogeneous coordinate)
      expect(mat[15]).toBe(1);
    });

    it('creates orthogonal basis vectors', () => {
      const mat = MatrixService.lookAt(0, 0, 0, 0, 0, -1);

      // Extract right, up, forward vectors
      const right = [mat[0], mat[1], mat[2]];
      const up = [mat[4], mat[5], mat[6]];
      const forward = [mat[8], mat[9], mat[10]];

      // Verify right · up = 0
      const dotRightUp = right[0] * up[0] + right[1] * up[1] + right[2] * up[2];
      expect(dotRightUp).toBeCloseTo(0, 5);

      // Verify right · forward = 0
      const dotRightForward = right[0] * forward[0] + right[1] * forward[1] + right[2] * forward[2];
      expect(dotRightForward).toBeCloseTo(0, 5);

      // Verify up · forward = 0
      const dotUpForward = up[0] * forward[0] + up[1] * forward[1] + up[2] * forward[2];
      expect(dotUpForward).toBeCloseTo(0, 5);
    });

    it('creates unit-length basis vectors', () => {
      const mat = MatrixService.lookAt(0, 0, 0, 0, 0, -1);

      // Extract right, up, forward vectors
      const right = [mat[0], mat[1], mat[2]];
      const up = [mat[4], mat[5], mat[6]];
      const forward = [mat[8], mat[9], mat[10]];

      // Verify ||right|| = 1
      const rightLen = Math.sqrt(right[0]**2 + right[1]**2 + right[2]**2);
      expect(rightLen).toBeCloseTo(1, 5);

      // Verify ||up|| = 1
      const upLen = Math.sqrt(up[0]**2 + up[1]**2 + up[2]**2);
      expect(upLen).toBeCloseTo(1, 5);

      // Verify ||forward|| = 1
      const forwardLen = Math.sqrt(forward[0]**2 + forward[1]**2 + forward[2]**2);
      expect(forwardLen).toBeCloseTo(1, 5);
    });

    it('handles looking up or down', () => {
      // Looking 45 degrees down (positive Y direction, negative Z)
      const mat = MatrixService.lookAt(0, 0, 0, 0, -1, -1);

      // Should still produce valid orthonormal basis
      const right = [mat[0], mat[1], mat[2]];
      const up = [mat[4], mat[5], mat[6]];
      const forward = [mat[8], mat[9], mat[10]];

      const rightLen = Math.sqrt(right[0]**2 + right[1]**2 + right[2]**2);
      const upLen = Math.sqrt(up[0]**2 + up[1]**2 + up[2]**2);
      const forwardLen = Math.sqrt(forward[0]**2 + forward[1]**2 + forward[2]**2);

      expect(rightLen).toBeCloseTo(1, 5);
      expect(upLen).toBeCloseTo(1, 5);
      expect(forwardLen).toBeCloseTo(1, 5);
    });
  });
});
