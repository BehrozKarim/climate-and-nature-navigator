"""Check the local Entire integration without uploading sessions or calling models."""

import json
import shutil
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path


def main():
    repo = Path(__file__).resolve().parents[2]
    if not (repo / '.git').exists():
        raise SystemExit('Run this script from the independent Navigator Git checkout, not an ancestor repository.')
    entire = shutil.which('entire')
    if not entire:
        raise SystemExit('Entire is not on PATH. Install it, then open a new terminal.')
    commands = [
        ('cli_version', ['version']),
        ('graph_version', ['graph', 'version']),
        ('sessions_status', ['status']),
        ('graph_health', ['graph', 'health', '--repo', '.', '--json']),
        ('pathway_search', ['graph', 'query', '--repo', '.', '--head', '--profile', 'full',
                            '--format', 'agent', '--top-k', '3', '--max-context-bytes', '4096',
                            '--query', 'pathway calculate conservative overlap scope floors']),
        ('review_search', ['graph', 'query', '--repo', '.', '--head', '--profile', 'full',
                           '--format', 'agent', '--top-k', '3', '--max-context-bytes', '4096',
                           '--query', 'decision review approval blockers evidence assumptions']),
    ]
    evidence = {'recorded_at': datetime.now(timezone.utc).isoformat(),
                'scope': 'local Navigator checkout', 'checks': [],
                'limits': ['Hook installation does not prove a session was captured.',
                           'Graph output size and latency do not measure model token savings.',
                           'Brain and hosted Trails are not exercised by this check.']}
    failed = False
    for name, args in commands:
        started = time.perf_counter()
        try:
            result = subprocess.run([entire, *args], cwd=repo, capture_output=True,
                                    encoding='utf-8', errors='replace', timeout=60)
            item = {'name': name, 'args': args, 'exit_code': result.returncode,
                    'elapsed_ms': round((time.perf_counter() - started) * 1000),
                    'stdout_bytes': len(result.stdout.encode('utf-8')),
                    'stdout': result.stdout, 'stderr': result.stderr}
            ok = result.returncode == 0
            if name == 'graph_health' and ok:
                health = json.loads(result.stdout)
                item['counts'] = health['counts']
                ok = health['counts']['partial_failures'] == 0
            if name == 'pathway_search' and ok:
                ok = 'navigator_pathways.py' in result.stdout
            if name == 'review_search' and ok:
                ok = 'decisions.py' in result.stdout or 'navigator_workflows.py' in result.stdout
            item['passed'] = ok
        except (OSError, subprocess.TimeoutExpired, ValueError, KeyError) as exc:
            item = {'name': name, 'args': args, 'passed': False, 'error': str(exc)}
        evidence['checks'].append(item)
        failed |= not item['passed']
        print(f"{'PASS' if item['passed'] else 'FAIL'} {name}")
    output = repo / 'backend' / 'var' / 'entire' / 'evidence.json'
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(evidence, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    print(f'Evidence: {output}')
    return int(failed)


if __name__ == '__main__':
    sys.exit(main())
