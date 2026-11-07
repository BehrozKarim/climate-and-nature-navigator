"""ElevenLabs speech around the existing, snapshot-bound Navigator conversation."""
import re

import httpx
from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import Response

from .decisions import Conflict
from .navigator_workflows import ConversationService


BASE_URL = 'https://api.elevenlabs.io/v1'
MAX_AUDIO_BYTES = 6 * 1024 * 1024
MAX_SPEECH_BYTES = 16 * 1024 * 1024
AUDIO_TYPES = {'audio/webm': 'webm', 'audio/ogg': 'ogg', 'audio/mp4': 'm4a', 'audio/wav': 'wav', 'audio/x-wav': 'wav', 'audio/mpeg': 'mp3', 'audio/flac': 'flac'}


def voice_status(settings):
    reason = ''
    if not settings.elevenlabs_api_key:
        reason = 'Voice is not configured. Add ELEVENLABS_API_KEY to backend/.env and restart the backend.'
    elif not re.fullmatch(r'[A-Za-z0-9_-]{1,100}', settings.elevenlabs_voice_id):
        reason = 'Set ELEVENLABS_VOICE_ID to a valid ElevenLabs voice ID and restart the backend.'
    elif not all((settings.llm_api_key, settings.llm_base_url, settings.llm_model)):
        reason = 'Configure Gemini in backend/.env and restart the backend to use voice conversation.'
    return {'available': not reason, 'reason': reason, 'provider': 'elevenlabs', 'max_audio_bytes': MAX_AUDIO_BYTES, 'max_turn_seconds': 30}


def require_voice(settings):
    status = voice_status(settings)
    if not status['available']:
        raise HTTPException(503, status['reason'])


def provider_error(error):
    if isinstance(error, httpx.HTTPStatusError):
        code = error.response.status_code
        message = f'ElevenLabs returned HTTP {code}. '
        message += 'Check the API key permissions, voice and model settings.' if code in (400, 401, 403, 404) else 'Check available credits and rate limits.' if code == 429 else 'Please try again.'
    elif isinstance(error, httpx.TimeoutException):
        message = 'ElevenLabs took too long to respond. Please try again.'
    elif isinstance(error, httpx.HTTPError):
        message = 'The backend could not reach ElevenLabs. Please try again.'
    else:
        message = 'ElevenLabs returned an invalid speech response. Please try again.'
    return HTTPException(502, message)


async def transcribe(settings, audio, content_type):
    require_voice(settings)
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(45, connect=5), follow_redirects=False) as client:
            response = await client.post(BASE_URL + '/speech-to-text', headers={'xi-api-key': settings.elevenlabs_api_key}, files={'file': ('turn.' + AUDIO_TYPES[content_type], audio, content_type)}, data={'model_id': settings.elevenlabs_stt_model, 'tag_audio_events': 'false', 'diarize': 'false', 'timestamps_granularity': 'none'})
            response.raise_for_status()
            if len(response.content) > 65536:
                raise ValueError('Transcript response too large')
            data = response.json()
        text = data.get('text')
        if not isinstance(text, str):
            raise ValueError('Missing transcript')
        if len(text.strip()) > 2000:
            raise HTTPException(422, 'That voice turn is too long. Please ask a shorter question.')
        return {'text': text.strip(), 'language_code': data.get('language_code'), 'provider': 'elevenlabs'}
    except (httpx.HTTPError, ValueError, TypeError, AttributeError) as error:
        raise provider_error(error) from None


async def speech(settings, text):
    require_voice(settings)
    if not isinstance(text, str) or not 1 <= len(text.strip()) <= 8000:
        raise HTTPException(422, 'The assistant reply cannot be read aloud.')
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(45, connect=5), follow_redirects=False) as client:
            async with client.stream('POST', BASE_URL + '/text-to-speech/' + settings.elevenlabs_voice_id + '/stream', headers={'xi-api-key': settings.elevenlabs_api_key, 'Accept': 'audio/mpeg'}, params={'output_format': 'mp3_44100_128'}, json={'text': text, 'model_id': settings.elevenlabs_tts_model}) as response:
                response.raise_for_status()
                if response.headers.get('content-type', '').split(';')[0] not in ('audio/mpeg', 'audio/mp3', 'application/octet-stream'):
                    raise ValueError('Unexpected audio type')
                audio = bytearray()
                async for chunk in response.aiter_bytes():
                    audio.extend(chunk)
                    if len(audio) > MAX_SPEECH_BYTES:
                        raise ValueError('Speech response too large')
        if not audio:
            raise ValueError('Empty speech')
        return bytes(audio)
    except (httpx.HTTPError, ValueError) as error:
        raise provider_error(error) from None


def create_voice_router(settings, store):
    router = APIRouter(prefix='/navigator', tags=['Voice conversation'])

    @router.get('/voice/status')
    def status():
        return voice_status(settings)

    @router.post('/voice/transcriptions')
    async def transcript(request: Request):
        require_voice(settings)
        content_type = request.headers.get('content-type', '').split(';')[0].lower()
        if content_type not in AUDIO_TYPES:
            raise HTTPException(415, 'Use a supported microphone audio format (WebM, Ogg, MP4, WAV or MP3).')
        data = bytearray()
        async for chunk in request.stream():
            data.extend(chunk)
            if len(data) > MAX_AUDIO_BYTES:
                raise HTTPException(413, 'The recording is too large. Please ask a shorter question.')
        if not data:
            raise HTTPException(422, 'The microphone recording was empty. Please try again.')
        return await transcribe(settings, bytes(data), content_type)

    @router.post('/conversations/{conversation_id}/speech')
    async def read_reply(conversation_id: str, expected_version: int = Query(ge=1)):
        require_voice(settings)
        service = ConversationService(store(), settings)
        thread = service.get(conversation_id, limit=1)
        if thread['version'] != expected_version:
            raise Conflict('Conversation changed before reading the reply; use the current reply.')
        if not thread['message_count']:
            raise HTTPException(422, 'Ask a question before reading a reply.')
        message = service.get(conversation_id, limit=1, offset=thread['message_count'] - 1)['messages'][0]
        if message['role'] != 'assistant' or message.get('generation_mode') not in ('ai_explanation_requires_review', 'guidance_not_ai'):
            raise HTTPException(422, 'This reply is unavailable for speech. Check the AI connection and try again.')
        audio = await speech(settings, message['text'])
        return Response(audio, media_type='audio/mpeg', headers={'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff'})

    return router
