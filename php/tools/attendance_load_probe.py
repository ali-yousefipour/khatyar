#!/usr/bin/env python3
"""Read-only load probe for an isolated staging instance.

Example:
  python3 tools/attendance_load_probe.py --url https://staging.example.com --users 50
  python3 tools/attendance_load_probe.py --url https://staging.example.com --users 100

Does not generate real attendance, traffic writes, or login requests.
Requires explicit --allow-host for a non-local staging host. Production
app.yousefipour.ir is forbidden.
"""
import argparse
import concurrent.futures
import json
import statistics
import time
import urllib.error
import urllib.parse
import urllib.request

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--url', required=True)
    parser.add_argument('--users', type=int, choices=(50,100), default=50)
    parser.add_argument('--allow-host', default='', help='Explicit staging hostname')
    parser.add_argument('--timeout', type=float, default=12.0)
    args = parser.parse_args()
    url = args.url.rstrip('/')
    host = (urllib.parse.urlparse(url).hostname or '').lower()
    if host in ('app.yousefipour.ir','yousefipour.ir','admin.yousefipour.ir'):
        parser.error('Load testing production is prohibited')
    if not (host in ('localhost','127.0.0.1','::1') or host == args.allow_host.lower()):
        parser.error('Specify --allow-host with an isolated staging hostname')
    if not host: parser.error('Invalid URL')
    probe = url + '/api/health'
    def single(_):
        begin = time.monotonic()
        try:
            request = urllib.request.Request(probe, headers={'Cache-Control':'no-store'})
            with urllib.request.urlopen(request, timeout=args.timeout) as response:
                status = response.status
                # Read response to measure full service time.
                response.read()
        except urllib.error.HTTPError as error: status = error.code
        except Exception: status = 0
        return status, round((time.monotonic()-begin)*1000,1)
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.users) as pool:
        results = list(pool.map(single, range(args.users)))
    durations = sorted(ms for _, ms in results)
    successful = sum(status==200 for status,_ in results)
    p95 = durations[min(len(durations)-1,int(len(durations)*.95))]
    print(json.dumps({'users':args.users,'requests':len(results),'successful':successful,
        'error_count':len(results)-successful,'median_ms':statistics.median(durations),
        'p95_ms':p95,'max_ms':max(durations)}, ensure_ascii=False))
if __name__ == '__main__': main()
