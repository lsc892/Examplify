#!/usr/bin/env node
// CLI entrypoint: Python·pymupdf4llm 환경 점검·설치. 오케스트레이션은 src/setup/pipeline.mjs.
import { runSetup } from '../src/setup/pipeline.mjs';

runSetup().catch(e => { console.error(e); process.exit(1); });
