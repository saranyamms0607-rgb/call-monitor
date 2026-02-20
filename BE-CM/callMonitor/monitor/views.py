import json
from django.http import JsonResponse
from django.conf import settings

from .models import MonitoringEntry


def create_monitoring(request):
    # Require POST
    # Handle preflight for dev: allow OPTIONS
    if request.method == 'OPTIONS':
        resp = JsonResponse({'detail': 'ok'}, status=200)
        resp['Access-Control-Allow-Origin'] = '*'
        resp['Access-Control-Allow-Headers'] = 'Authorization, Content-Type'
        resp['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        return resp

    if request.method != 'POST':
        return JsonResponse({'detail': 'Method not allowed'}, status=405)

    # Simple token auth - expect header 'Authorization: Token <token>'
    auth = request.META.get('HTTP_AUTHORIZATION', '')
    token = ''
    if auth.startswith('Token '):
        token = auth.split(' ', 1)[1].strip()

    expected = getattr(settings, 'MONITOR_API_TOKEN', None)
    if not expected or token != expected:
        return JsonResponse({'detail': 'Unauthorized'}, status=401)

    try:
        payload = json.loads(request.body.decode('utf-8'))
    except Exception:
        return JsonResponse({'detail': 'Invalid JSON'}, status=400)

    data = payload.get('data') or payload
    total_scorable = payload.get('total_scorable', 0)
    total_scored = payload.get('total_scored', 0)
    quality_percent = payload.get('quality_percent', 0)

    entry = MonitoringEntry.objects.create(
        data=data,
        total_scorable=total_scorable,
        total_scored=total_scored,
        quality_percent=quality_percent,
    )

    resp = JsonResponse({'id': entry.id, 'detail': 'Saved'}, status=201)
    resp['Access-Control-Allow-Origin'] = '*'
    return resp
