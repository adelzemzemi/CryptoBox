/**
 * Run the smoke test against the package as a consumer installs it.
 *
 * Copy this file and smoke.mjs into a directory where the packed tarball is
 * installed, then run it with node, bun or deno from there.
 */
import * as cryptobox from '@azemzemi/cryptobox';
import { smoke } from './smoke.mjs';

console.log(await smoke(cryptobox));
