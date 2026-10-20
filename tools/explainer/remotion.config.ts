import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(95);
Config.setCodec("h264");
Config.setCrf(16);
Config.setPixelFormat("yuv420p");
Config.setEntryPoint("./src/Root.tsx");
// In the cloud container Chromium is preinstalled; locally Remotion downloads its own.
if (process.env.REMOTION_CHROME) Config.setBrowserExecutable(process.env.REMOTION_CHROME);
Config.setChromiumOpenGlRenderer("angle");
