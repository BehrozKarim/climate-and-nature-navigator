"""Immutable assessment bundles, wallet-bound receipt lifecycle and verification."""
from datetime import datetime, timedelta, timezone
import hashlib
import json
import sqlite3
from uuid import uuid4

from .decisions import Conflict
from .navigator_workflows import ReviewService
from .solana_rpc import DevnetRPC, SolanaUnavailable, unsigned_memo, validate_signed, wallet_key
from .storage import now


MAX_BUNDLE_BYTES = 4 * 1024 * 1024
LIMITATION = 'Devnet proof of exact report bytes and wallet authorship. Prototype review only; wallet identity and scientific conclusions are not independently accredited.'


def canonical(value):
    return json.dumps(value, sort_keys=True, ensure_ascii=False, allow_nan=False, separators=(',', ':'))


def fingerprint(text):
    return hashlib.sha256(text.encode('utf-8')).hexdigest()


class ReceiptService:
    def __init__(self, store, settings, rpc=None):
        self.store, self.settings = store, settings
        self.rpc = rpc or DevnetRPC(settings.solana_rpc_url)

    def _row(self, dataset_id, receipt_id):
        with self.store.connect() as db:
            row = db.execute('SELECT * FROM solana_receipts WHERE id=? AND dataset_id=?', (receipt_id, dataset_id)).fetchone()
        if row is None:
            raise KeyError('Receipt not found in this snapshot')
        return dict(row)

    def _review(self, db, dataset_id, review_id, version):
        row = db.execute('SELECT payload FROM navigator_reviews WHERE id=? AND dataset_id=?', (review_id, dataset_id)).fetchone()
        if row is None:
            raise KeyError('Review not found in this snapshot')
        item = json.loads(row['payload'])
        if item['version'] != version:
            raise Conflict('Review changed; reload before signing this revision')
        if item['status'] != 'approved_for_demo' or item['blocking_reasons'] or item['target_type'] != 'run' or not item.get('run_id'):
            raise Conflict('Only an approved, unblocked saved calculation can be signed')
        return item

    def present(self, row, include_transaction=False):
        current = ReviewService(self.store, row['dataset_id']).get(row['review_id'])
        result = {k: row[k] for k in ('id', 'dataset_id', 'review_id', 'review_version', 'wallet', 'status', 'signature', 'digest', 'memo', 'last_valid_block_height', 'expires_at', 'created_at')}
        result.update(network='solana:devnet', verification=json.loads(row['verification']),
                      superseded=current['version'] != row['review_version'] or current['status'] != 'approved_for_demo',
                      explorer_url=f"https://explorer.solana.com/tx/{row['signature']}?cluster=devnet" if row['signature'] else None,
                      limitation=LIMITATION)
        if include_transaction:
            result['transaction_base64'] = row['transaction_base64']
        return result

    def get(self, dataset_id, receipt_id):
        return self.present(self._row(dataset_id, receipt_id))

    def list(self, dataset_id, review_id):
        ReviewService(self.store, dataset_id).get(review_id)
        with self.store.connect() as db:
            rows = db.execute('SELECT * FROM solana_receipts WHERE dataset_id=? AND review_id=? ORDER BY created_at DESC,id DESC LIMIT 25', (dataset_id, review_id)).fetchall()
        return {'receipts': [self.present(dict(row)) for row in rows], 'limit': 25}

    def prepare(self, dataset_id, review_id, expected_version, wallet):
        wallet_key(wallet)
        # Check eligibility before any external request, then recheck under the write lock.
        with self.store.connect() as db:
            self._review(db, dataset_id, review_id, expected_version)
        blockhash, height = self.rpc.blockhash()
        receipt_id, stamp = 'receipt_' + uuid4().hex, now()
        expires = (datetime.now(timezone.utc) + timedelta(minutes=2)).isoformat()
        with self.store.connect() as db:
            db.execute('BEGIN IMMEDIATE')
            item = self._review(db, dataset_id, review_id, expected_version)
            evidence = ReviewService(self.store, dataset_id).export(review_id)
            if evidence['audit_truncated']:
                raise ValueError('Review audit exceeds the receipt bound; a complete snapshot is required')
            if evidence['run']['dataset_id'] != dataset_id:
                raise Conflict('Calculation does not belong to this dataset')
            bundle = {'schema': 'weatherlens-assessment-receipt-v1', 'receipt_id': receipt_id,
                      'network': 'solana:devnet', 'wallet': wallet, 'created_at': stamp,
                      'dataset_id': dataset_id, 'review_version': item['version'],
                      'evidence': evidence, 'dataset_manifest': self.store.dataset(dataset_id), 'limitation': LIMITATION}
            frozen = canonical(bundle)
            if len(frozen.encode('utf-8')) > MAX_BUNDLE_BYTES:
                raise ValueError('Evidence bundle exceeds 4 MiB; choose a smaller saved calculation')
            digest = fingerprint(frozen)
            memo = f'weatherlens:v1:{receipt_id}:{digest}'
            transaction = unsigned_memo(wallet, memo, blockhash)
            db.execute('INSERT INTO solana_receipts(id,dataset_id,review_id,review_version,wallet,status,bundle_json,digest,memo,transaction_base64,last_valid_block_height,expires_at,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
                       (receipt_id, dataset_id, review_id, expected_version, wallet, 'prepared', frozen, digest, memo, transaction, height, expires, stamp))
        return self.present(self._row(dataset_id, receipt_id), include_transaction=True)

    def submit(self, dataset_id, receipt_id, signed_transaction=None):
        row = self._row(dataset_id, receipt_id)
        signed_transaction = signed_transaction or row['submitted_tx']
        if not signed_transaction:
            raise ValueError('Provide a wallet-signed transaction before submitting this receipt')
        signature = validate_signed(signed_transaction, row['transaction_base64'])
        if row['signature']:
            if row['signature'] != signature:
                raise Conflict('Receipt is already bound to another signature')
            checked = self.confirm(dataset_id, receipt_id)
            if checked.get('chain_check') == 'finalized' or row['status'] == 'finalized':
                return checked
            # An identical signed transaction can safely be rebroadcast after an
            # ambiguous send or a crash between recording and broadcasting it.
        if datetime.now(timezone.utc) > datetime.fromisoformat(row['expires_at']):
            raise Conflict('Prepared receipt expired; prepare a new receipt')
        self.rpc.check_network()
        height = self.rpc.call('getBlockHeight', [{'commitment': 'confirmed'}])
        if type(height) is not int or height < 0:
            raise SolanaUnavailable('Solana returned an invalid current block height; submission was not attempted')
        if height > row['last_valid_block_height']:
            raise Conflict('Transaction blockhash expired; prepare a new receipt')
        with self.store.connect() as db:
            db.execute('BEGIN IMMEDIATE')
            self._review(db, dataset_id, row['review_id'], row['review_version'])
            current = db.execute('SELECT signature FROM solana_receipts WHERE id=?', (receipt_id,)).fetchone()
            if current['signature'] and current['signature'] != signature:
                raise Conflict('Receipt already has a different signature')
            try:
                db.execute('UPDATE solana_receipts SET status=?,signature=?,submitted_tx=?,verification=? WHERE id=? AND status<>?', ('pending', signature, signed_transaction, '{}', receipt_id, 'finalized'))
            except sqlite3.IntegrityError as exc:
                raise Conflict('Signature is already used by another receipt') from exc
        try:
            returned = self.rpc.send(signed_transaction)
            if returned != signature:
                raise SolanaUnavailable('RPC returned an unexpected transaction signature')
        except SolanaUnavailable as exc:
            # A timeout may have broadcast successfully. Keep the known signature for polling.
            state = 'failed' if exc.code == -32002 else 'pending'
            with self.store.connect() as db:
                db.execute('UPDATE solana_receipts SET status=?,verification=? WHERE id=? AND status<>?', (state, canonical({'detail': str(exc), 'retry_confirmation': state == 'pending'}), receipt_id, 'finalized'))
            return self.get(dataset_id, receipt_id)
        return self.confirm(dataset_id, receipt_id)

    def confirm(self, dataset_id, receipt_id):
        row = self._row(dataset_id, receipt_id)
        if not row['signature']:
            return self.present(row)
        transaction = self.rpc.finalized(row['signature'])
        if transaction is None:
            return self.present(row) | {'chain_check': 'not_found_at_finalized'}
        try:
            encoded, encoding = transaction['transaction']
            if encoding != 'base64' or transaction['meta'] is None:
                raise ValueError('Incomplete transaction evidence')
            signature = validate_signed(encoded, row['transaction_base64'])
            if signature != row['signature']:
                raise ValueError('Unexpected transaction signature')
            if type(transaction['slot']) is not int or transaction['slot'] < 0:
                raise ValueError('Invalid finalized transaction slot')
            failed = transaction['meta']['err'] is not None
            verification = {'checked_at': now(), 'commitment': 'finalized', 'slot': transaction['slot'],
                            'block_time': transaction.get('blockTime'), 'message_matches': True, 'signature_valid': True,
                            'execution_error': transaction['meta']['err']}
        except (KeyError, TypeError, ValueError) as exc:
            raise SolanaUnavailable('Finalized transaction did not match the frozen receipt; no confirmation recorded') from exc
        with self.store.connect() as db:
            db.execute('UPDATE solana_receipts SET status=?,verification=? WHERE id=?', ('failed' if failed else 'finalized', canonical(verification), receipt_id))
        return self.get(dataset_id, receipt_id) | {'chain_check': 'finalized'}

    def export(self, dataset_id, receipt_id):
        row = self._row(dataset_id, receipt_id)
        return {'receipt': self.present(row), 'bundle_json': row['bundle_json'], 'verification_format': 'sha256-of-exact-utf8-file-bytes'}

    def verify(self, dataset_id, receipt_id, bundle_json):
        row = self._row(dataset_id, receipt_id)
        if len(bundle_json.encode('utf-8')) > MAX_BUNDLE_BYTES:
            raise ValueError('Bundle exceeds 4 MiB')
        matches = fingerprint(bundle_json) == row['digest']
        receipt = self.confirm(dataset_id, receipt_id) if matches and row['signature'] else self.present(row)
        return {'verified': matches and receipt['status'] == 'finalized' and receipt.get('chain_check') == 'finalized', 'bundle_matches': matches,
                'receipt': receipt, 'detail': 'Bundle bytes differ from the signed evidence' if not matches else 'Exact bundle matched; finalized receipt required for verified status'}
