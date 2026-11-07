from dataclasses import dataclass, field
from pathlib import Path
import os


BASE = Path(__file__).resolve().parents[1]
WORKSPACE = BASE.parent


def load_environment(path=None):
    """Load the local backend file at startup; explicit process settings take precedence."""
    from dotenv import load_dotenv
    load_dotenv(path or BASE / '.env', override=False)


def default_dataset_root() -> Path:
    packages = list((WORKSPACE / 'Apetit_SinceAI2026 _1_').glob('**/START_HERE.md'))
    return packages[0].parent if len(packages) == 1 else WORKSPACE / 'dataset'


@dataclass(frozen=True)
class Settings:
    database: Path = field(default_factory=lambda: Path(os.getenv('WEATHERLENS_DB', str(BASE / 'var/weatherlens.sqlite3'))))
    dataset_root: Path = field(default_factory=lambda: Path(os.getenv('WEATHERLENS_DATASET_ROOT', str(default_dataset_root()))))
    document_root: Path = field(default_factory=lambda: Path(os.getenv('WEATHERLENS_DOCUMENT_ROOT', str(WORKSPACE / 'new documents'))))
    api_token: str = field(default_factory=lambda: os.getenv('WEATHERLENS_API_TOKEN', ''))
    cors_origins: tuple[str, ...] = field(default_factory=lambda: tuple(x.strip() for x in os.getenv('WEATHERLENS_CORS_ORIGINS', 'http://localhost:5173,http://localhost:3000').split(',') if x.strip()))
    llm_base_url: str = field(default_factory=lambda: os.getenv('WEATHERLENS_LLM_BASE_URL', ''))
    llm_api_key: str = field(default_factory=lambda: os.getenv('WEATHERLENS_LLM_API_KEY', ''))
    llm_model: str = field(default_factory=lambda: os.getenv('WEATHERLENS_LLM_MODEL', ''))
