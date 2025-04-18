// fETCH ALLL

function base64toBytesArray(base64) {
      return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

fetch("http://95.63.53.46:8015/SIRI/SiriWS.asmx", {
  "headers": {
"User-Agent": "ksoap2-android/2.6.0+",
"SOAPAction": "http://tempuri.org/LinesDiscovery",
"Content-Type": "text/xml;charset=utf-8",
"Accept-Encoding": "gzip",
"Content-Length": "722"
  },
  "body": base64toBytesArray("PHY6RW52ZWxvcGUgeG1sbnM6aT0iaHR0cDovL3d3dy53My5vcmcvMjAwMS9YTUxTY2hlbWEtaW5zdGFuY2UiIHhtbG5zOmQ9Imh0dHA6Ly93d3cudzMub3JnLzIwMDEvWE1MU2NoZW1hIiB4bWxuczpjPSJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy9zb2FwL2VuY29kaW5nLyIgeG1sbnM6dj0iaHR0cDovL3NjaGVtYXMueG1sc29hcC5vcmcvc29hcC9lbnZlbG9wZS8iPjx2OkhlYWRlciAvPjx2OkJvZHk+PExpbmVzRGlzY292ZXJ5IHhtbG5zPSJodHRwOi8vdGVtcHVyaS5vcmcvIj48cmVxdWVzdD48UmVxdWVzdCB2ZXJzaW9uPSIyLjAiIHhtbG5zPSIiPjxuMDpSZXF1ZXN0VGltZXN0YW1wIHhtbG5zOm4wPSJodHRwOi8vd3d3LnNpcmkub3JnLnVrL3NpcmkiPjIwMjUtMDQtMTZUMjM6MjI6MTEuMDAwPC9uMDpSZXF1ZXN0VGltZXN0YW1wPjxuMTpBY2NvdW50SWQgeG1sbnM6bjE9Imh0dHA6Ly93d3cuc2lyaS5vcmcudWsvc2lyaSI+c2lyaXRlc3Q8L24xOkFjY291bnRJZD48bjI6QWNjb3VudEtleSB4bWxuczpuMj0iaHR0cDovL3d3dy5zaXJpLm9yZy51ay9zaXJpIj5zaXJpdGVzdDwvbjI6QWNjb3VudEtleT48bjM6TGluZXNEZXRhaWxMZXZlbCB4bWxuczpuMz0iaHR0cDovL3d3dy5zaXJpLm9yZy51ay9zaXJpIj5mdWxsPC9uMzpMaW5lc0RldGFpbExldmVsPjwvUmVxdWVzdD48L3JlcXVlc3Q+PC9MaW5lc0Rpc2NvdmVyeT48L3Y6Qm9keT48L3Y6RW52ZWxvcGU+DQo="),
  "method": "POST"
});

