import { dirname, normalize } from 'path';
import { fileURLToPath } from 'url';

export const projectRootDir = normalize(dirname(fileURLToPath(import.meta.url)) + '/..');