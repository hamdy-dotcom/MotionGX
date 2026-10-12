// Simple three.js stage: a ThreeCanvas sized to the video with brand-colored lights.
// Put your own meshes inside (use @react-three/fiber JSX elements and useCurrentFrame for motion).
import React from "react";
import { ThreeCanvas } from "@remotion/three";
import { useVideoConfig } from "remotion";
import { useMotion } from "./context";

export const ThreeStage: React.FC<{ cameraZ?: number; fov?: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ cameraZ = 6, fov = 40, children, style }) => {
  const { width, height } = useVideoConfig();
  const { palette } = useMotion();
  return (
    <ThreeCanvas width={width} height={height} camera={{ position: [0, 0, cameraZ], fov }} style={{ position: "absolute", inset: 0, ...style }}>
      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 4, 5]} intensity={1.2} color={palette.gradA} />
      <pointLight position={[-4, -2, 3]} intensity={0.8} color={palette.gradB} />
      {children}
    </ThreeCanvas>
  );
};
