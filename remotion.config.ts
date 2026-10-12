// Remotion CLI config (Studio / CLI renders). Entry: remotion/index.ts
import { Config } from "@remotion/cli/config";
import { webpackOverride } from "./remotion/webpack-override";

Config.setEntryPoint("remotion/index.ts");
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
Config.setCodec("h264");
Config.setCrf(20);
Config.overrideWebpackConfig(webpackOverride);
