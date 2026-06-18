#!/usr/bin/env node
// CLI entrypoint: 자료 → build 산출물. 오케스트레이션은 src/convert/pipeline.mjs.
import { runConvert } from '../src/convert/pipeline.mjs';

runConvert();
