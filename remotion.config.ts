// Remotion CLI config (Studio / CLI renders). Entry: remotion/index.ts
import { Config } from "@remotion/cli/config";

Config.setEntryPoint("remotion/index.ts");
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
Config.setCodec("h264");
Config.setCrf(20);
