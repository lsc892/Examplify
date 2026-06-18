#!/usr/bin/env node
// CLI entrypoint: 분석 산출물 검증. 로직은 src/schema/check.mjs.
import { runValidate } from '../src/schema/check.mjs';

runValidate();
