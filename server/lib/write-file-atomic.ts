import fs from "node:fs";

/**
 * Write to a sibling temp file, then rename over the target.
 * Truncating an existing file in place fails with UNKNOWN (-4094) on Windows when a sync
 * client such as OneDrive is busy with that file; replacing it by rename does not.
 */
export function writeFileAtomicSync(file: string, data: string | Uint8Array, options?: fs.WriteFileOptions): void {
  const tmp = `${file}.${process.pid}.tmp`;
  try {
    fs.writeFileSync(tmp, data, options);
    fs.renameSync(tmp, file);
  } catch (err) {
    fs.rmSync(tmp, { force: true });
    throw err;
  }
}
