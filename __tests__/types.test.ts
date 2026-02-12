import { execSync } from 'child_process';
import * as path from 'path';

describe('type safety', () => {
  it('should pass type checking (src/_type_probe.ts)', () => {
    const root = path.resolve(__dirname, '..');
    try {
      execSync('npx tsc --noEmit', { cwd: root, stdio: 'pipe' });
    } catch (e: any) {
      const output = e.stdout?.toString() || e.stderr?.toString() || '';
      throw new Error(`Type checking failed:\n${output}`);
    }
  });
});
