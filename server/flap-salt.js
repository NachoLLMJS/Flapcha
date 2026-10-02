import crypto from 'node:crypto';
import { getContractAddress } from 'viem';

export function cloneInitCode(implementation) {
  const target = implementation.toLowerCase().replace(/^0x/, '');
  if (!/^[a-f0-9]{40}$/.test(target)) throw new Error('Invalid implementation address');
  return `0x3d602d80600a3d3981f3${'363d3d373d3d3d363d73'}${target}5af43d82803e903d91602b57fd5bf3`;
}

export function predictCloneAddress({ deployer, implementation, salt }) {
  return getContractAddress({
    bytecode: cloneInitCode(implementation),
    from: deployer,
    opcode: 'CREATE2',
    salt,
  });
}

export function mineVanitySalt({ deployer, implementation, suffix = '8888', maxAttempts = 1_000_000 }) {
  const normalizedSuffix = suffix.toLowerCase().replace(/^0x/, '');
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const salt = `0x${crypto.randomBytes(32).toString('hex')}`;
    const address = predictCloneAddress({ deployer, implementation, salt });
    if (address.toLowerCase().endsWith(normalizedSuffix)) return { salt, address, attempts: attempt };
  }
  throw new Error(`Unable to mine vanity suffix ${normalizedSuffix} in ${maxAttempts} attempts`);
}
