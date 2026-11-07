"""Shared provenance and validation for Navigator feature services."""
from copy import deepcopy
from functools import lru_cache
from pathlib import Path
import hashlib
import json
from .freight import deduplicate, number


@lru_cache(maxsize=1)
def _models():
    raw = Path(__file__).with_name('navigator_models.json').read_bytes()
    return json.loads(raw), hashlib.sha256(raw).hexdigest()


def model(section):
    config, digest = _models()
    if section not in ('scenario', 'pathway', 'climate', 'nature', 'routing'):
        raise KeyError('Unknown Navigator model')
    return {'version': config['version'], 'config_sha256': digest, 'reference': deepcopy(config['reference']), 'parameters': deepcopy(config[section])}


def unique(rows, keys):
    keyed = [r | {'values': r['values'] | {'_composite_key': json.dumps([r['values'][k] for k in keys]) if all(r['values'].get(k, '').strip() for k in keys) else ''}} for r in rows]
    clean, issues = deduplicate(keyed, '_composite_key')
    return [r | {'values': {k: v for k, v in r['values'].items() if k != '_composite_key'}} for r in clean], issues


def numeric(value, name='value', negative=False):
    return float(number(value, name, allow_negative=negative))


def table_source(store, dataset_id, table, **filters):
    entry = next((r for r in store.sources(dataset_id) if r['table_name'] == table), None)
    return {'dataset_id': dataset_id, 'table': table, 'file': entry['path'] if entry else None, 'file_sha256': entry['sha256'] if entry else None, 'filters': filters}


def finding(dataset_id, code, message, refs, *, blocking=True, **detail):
    identity = json.dumps([dataset_id, code, refs], sort_keys=True)
    return {'id': 'dq_' + hashlib.sha256(identity.encode()).hexdigest()[:24], 'code': code, 'message': message, 'blocking': blocking, 'detection_method': 'deterministic_rule_not_ai', 'source_refs': refs, 'detail': detail, 'resolution': 'open', 'version': 0}
