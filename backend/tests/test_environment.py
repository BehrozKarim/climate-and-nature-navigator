import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from weatherlens_backend.config import load_environment, Settings


class EnvironmentTests(unittest.TestCase):
    def test_backend_file_is_loaded_without_overriding_terminal_values(self):
        with tempfile.TemporaryDirectory() as directory:
            env = Path(directory) / '.env'
            env.write_text('WEATHERLENS_LLM_API_KEY=file-test-only\nWEATHERLENS_LLM_MODEL=file-model\nWEATHERLENS_LLM_BASE_URL=https://example.test/v1\n', encoding='utf-8')
            with patch.dict(os.environ, {'WEATHERLENS_LLM_MODEL': 'terminal-model'}, clear=True):
                load_environment(env)
                settings = Settings()
                self.assertEqual(settings.llm_api_key, 'file-test-only')
                self.assertEqual(settings.llm_model, 'terminal-model')
                self.assertEqual(settings.llm_base_url, 'https://example.test/v1')
