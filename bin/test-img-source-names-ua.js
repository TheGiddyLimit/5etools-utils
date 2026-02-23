#!/usr/bin/env node

import {BrewTesterImg} from "../lib/BrewTesterImg.js";

await BrewTesterImg.pTestSourceNames({isPrerelease: true});
