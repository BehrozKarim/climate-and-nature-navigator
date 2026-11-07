import { getWallets } from '@wallet-standard/app';

export const DEVNET = 'solana:devnet';

export function receiptWallets() {
  return getWallets().get().filter(wallet => wallet.features['standard:connect'] &&
    wallet.features['solana:signTransaction']?.supportedTransactionVersions?.includes('legacy') &&
    wallet.chains.includes(DEVNET));
}

export function watchReceiptWallets(callback) {
  const registry = getWallets();
  const unregister = registry.on('unregister', callback);
  const register = registry.on('register', callback);
  return () => { register(); unregister(); };
}

export async function connectReceiptWallet(name) {
  const wallet = receiptWallets().find(item => item.name === name);
  if (!wallet) throw new Error('Unlock a compatible Solana wallet with Devnet support, then refresh wallets.');
  const result = await wallet.features['standard:connect'].connect();
  const account = result.accounts.find(item => item.chains.includes(DEVNET) && item.features.includes('solana:signTransaction'));
  if (!account) throw new Error('This wallet did not expose an account that can sign Devnet transactions.');
  return { wallet, account };
}

export async function signReceipt(wallet, account, prepared) {
  const transaction = Uint8Array.from(atob(prepared.transaction_base64), character => character.charCodeAt(0));
  const [result] = await wallet.features['solana:signTransaction'].signTransaction({ transaction, account, chain: DEVNET });
  if (!(result?.signedTransaction instanceof Uint8Array)) throw new Error('Wallet returned no signed receipt transaction.');
  return btoa(Array.from(result.signedTransaction, byte => String.fromCharCode(byte)).join(''));
}
