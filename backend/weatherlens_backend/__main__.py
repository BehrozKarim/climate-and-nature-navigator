import argparse
import os
import uvicorn
from .config import load_environment


def main():
    load_environment()
    parser = argparse.ArgumentParser(description='Run the standalone WeatherLens backend')
    parser.add_argument('--host', default='127.0.0.1')
    parser.add_argument('--port', type=int, default=8000)
    args = parser.parse_args()
    if args.host not in ('127.0.0.1', 'localhost', '::1') and not os.getenv('WEATHERLENS_API_TOKEN'):
        parser.error('Set WEATHERLENS_API_TOKEN before binding beyond loopback')
    uvicorn.run('weatherlens_backend.app:create_app', factory=True, host=args.host, port=args.port)


if __name__ == '__main__':
    main()
