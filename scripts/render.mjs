#!/usr/bin/env node
// CLI entrypoint: 분석 JSON → study-guide.html. 로직은 src/render/pipeline.mjs.
import { runRender } from '../src/render/pipeline.mjs';

runRender();
