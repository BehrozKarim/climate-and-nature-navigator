"""Devnet-only transport and signed Memo transaction validation. No private keys."""
import base64
from urllib.parse import urlsplit

import httpx
from solders.hash import Hash
from solders.instruction import AccountMeta, Instruction
from solders.message import Message
from solders.pubkey import Pubkey
from solders.transaction import Transaction


MEMO_PROGRAM = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'
DEVNET_GENESIS = 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG'
MAX_WIRE_BYTES = 1232


class SolanaUnavailable(Exception):
    def __init__(self, message, code=None):
        super().__init__(message)
        self.code = code


def wallet_key(address):
    try:
        key = Pubkey.from_string(address)
        if not key.is_on_curve():
            raise ValueError('Wallet must be an Ed25519 signing address')
        return key
    except (TypeError, ValueError) as exc:
        raise ValueError('Provide a valid Solana signing-wallet address') from exc


def decode_transaction(encoded):
    try:
        raw = base64.b64decode(encoded, validate=True)
        if not 0 < len(raw) <= MAX_WIRE_BYTES:
            raise ValueError('Transaction exceeds the supported legacy packet size')
        return Transaction.from_bytes(raw)
    except Exception as exc:
        raise ValueError('Invalid base64-encoded legacy Solana transaction') from exc


def unsigned_memo(address, memo, blockhash):
    key = wallet_key(address)
    instruction = Instruction(Pubkey.from_string(MEMO_PROGRAM), memo.encode('utf-8'), [AccountMeta(key, True, False)])
    message = Message.new_with_blockhash([instruction], key, Hash.from_string(blockhash))
    return base64.b64encode(bytes(Transaction.new_unsigned(message))).decode('ascii')


def validate_signed(encoded, prepared):
    transaction, expected = decode_transaction(encoded), decode_transaction(prepared)
    if bytes(transaction.message) != bytes(expected.message):
        raise ValueError('Wallet transaction differs from the prepared receipt; no modified instructions are accepted')
    try:
        transaction.verify()
    except Exception as exc:
        raise ValueError('The prepared transaction needs a valid signature from the expected wallet') from exc
    if len(transaction.signatures) != 1:
        raise ValueError('Receipt requires exactly one wallet signature')
    return str(transaction.signatures[0])


class DevnetRPC:
    def __init__(self, url):
        parsed = urlsplit(url)
        if parsed.scheme != 'https' or not parsed.hostname or parsed.username or parsed.password or parsed.fragment:
            raise ValueError('Solana RPC must be an HTTPS Devnet endpoint without embedded credentials or a fragment')
        self.url = url

    def call(self, method, params=None):
        try:
            with httpx.Client(timeout=10, follow_redirects=False) as client:
                response = client.post(self.url, json={'jsonrpc': '2.0', 'id': 1, 'method': method, 'params': params or []})
                response.raise_for_status()
                if len(response.content) > 2_000_000:
                    raise SolanaUnavailable('Solana RPC response exceeded the receipt limit')
                data = response.json()
        except (httpx.HTTPError, ValueError) as exc:
            raise SolanaUnavailable(f'Solana Devnet could not complete {method}; retry the receipt check') from exc
        if not isinstance(data, dict) or 'error' in data or 'result' not in data:
            error = data.get('error') if isinstance(data, dict) else None
            message = str(error.get('message', 'Invalid RPC response'))[:300] if isinstance(error, dict) else 'Invalid RPC response'
            raise SolanaUnavailable(f'Solana {method}: {message}', error.get('code') if isinstance(error, dict) else None)
        return data['result']

    def check_network(self):
        if self.call('getGenesisHash') != DEVNET_GENESIS:
            raise SolanaUnavailable('Configured RPC is not Solana Devnet; signing and confirmation are disabled')

    def blockhash(self):
        self.check_network()
        result = self.call('getLatestBlockhash', [{'commitment': 'confirmed'}])
        try:
            value = result['value']
            Hash.from_string(value['blockhash'])
            height = value['lastValidBlockHeight']
            if type(height) is not int or height < 0:
                raise ValueError('Invalid block height')
            return value['blockhash'], height
        except (KeyError, TypeError, ValueError) as exc:
            raise SolanaUnavailable('Solana returned an invalid transaction lifetime') from exc

    def send(self, encoded):
        self.check_network()
        return self.call('sendTransaction', [encoded, {'encoding': 'base64', 'skipPreflight': False, 'preflightCommitment': 'confirmed', 'maxRetries': 3}])

    def finalized(self, signature):
        self.check_network()
        return self.call('getTransaction', [signature, {'encoding': 'base64', 'commitment': 'finalized', 'maxSupportedTransactionVersion': 0}])
