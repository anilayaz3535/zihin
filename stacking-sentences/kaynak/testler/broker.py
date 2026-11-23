"""Minimal MQTT 3.1.1 broker over WebSocket, for local testing only (QoS 0).
usage: python3 broker.py PORT [PORT ...]   (each port is an independent broker)"""
import asyncio, base64, hashlib, struct, sys

GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'


class Broker:
    def __init__(self, name):
        self.name = name
        self.subs = {}  # topic -> set(client)
        self.count = 0

    async def handle(self, reader, writer):
        # --- websocket handshake
        req = b''
        while b'\r\n\r\n' not in req:
            chunk = await reader.read(4096)
            if not chunk:
                writer.close(); return
            req += chunk
        head = req.split(b'\r\n\r\n', 1)[0].decode('latin1').split('\r\n')
        hdr = {}
        for line in head[1:]:
            if ':' in line:
                k, v = line.split(':', 1); hdr[k.strip().lower()] = v.strip()
        key = hdr.get('sec-websocket-key', '')
        acc = base64.b64encode(hashlib.sha1((key + GUID).encode()).digest()).decode()
        proto = 'Sec-WebSocket-Protocol: mqtt\r\n' if 'mqtt' in hdr.get('sec-websocket-protocol', '') else ''
        writer.write(('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n'
                      f'Sec-WebSocket-Accept: {acc}\r\n{proto}\r\n').encode())
        await writer.drain()
        client = {'w': writer, 'topics': set(), 'buf': b''}
        try:
            while True:
                b0, b1 = await reader.readexactly(2)
                op = b0 & 0x0F; masked = b1 & 0x80; n = b1 & 0x7F
                if n == 126: n = struct.unpack('>H', await reader.readexactly(2))[0]
                elif n == 127: n = struct.unpack('>Q', await reader.readexactly(8))[0]
                mask = await reader.readexactly(4) if masked else b'\0\0\0\0'
                data = bytearray(await reader.readexactly(n))
                for i in range(n): data[i] ^= mask[i % 4]
                if op == 8: break
                if op == 9: self.send_ws(writer, bytes(data), 0xA); continue
                if op in (0, 2, 1):
                    client['buf'] += bytes(data)
                    if not self.mqtt(client): break
        except (asyncio.IncompleteReadError, ConnectionError):
            pass
        finally:
            for t in client['topics']: self.subs.get(t, set()).discard(id(client))
            self.subs = {t: s for t, s in self.subs.items() if s}
            self.clients.pop(id(client), None)
            try: writer.close()
            except Exception: pass

    clients = {}

    def send_ws(self, writer, payload, op=0x2):
        n = len(payload)
        if n < 126: h = bytes([0x80 | op, n])
        elif n < 65536: h = bytes([0x80 | op, 126]) + struct.pack('>H', n)
        else: h = bytes([0x80 | op, 127]) + struct.pack('>Q', n)
        try: writer.write(h + payload)
        except Exception: pass

    def mqtt(self, c):
        buf = c['buf']
        while len(buf) >= 2:
            mult, n, i = 1, 0, 1
            while True:
                if i >= len(buf): c['buf'] = buf; return True
                b = buf[i]; i += 1; n += (b & 127) * mult; mult *= 128
                if not (b & 128): break
            if len(buf) < i + n: break
            t = buf[0] >> 4; body = buf[i:i + n]; pkt = buf[:i + n]; buf = buf[i + n:]
            if t == 1:  # CONNECT
                self.clients[id(c)] = c; self.count += 1
                self.send_ws(c['w'], bytes([0x20, 2, 0, 0]))
            elif t == 8:  # SUBSCRIBE
                pid = body[:2]; tl = (body[2] << 8) | body[3]; topic = body[4:4 + tl].decode()
                c['topics'].add(topic); self.subs.setdefault(topic, set()).add(id(c))
                self.send_ws(c['w'], bytes([0x90, 3]) + pid + b'\0')
            elif t == 3:  # PUBLISH (QoS 0)
                tl = (body[0] << 8) | body[1]; topic = body[2:2 + tl].decode()
                for cid in list(self.subs.get(topic, ())):
                    cl = self.clients.get(cid)
                    if cl: self.send_ws(cl['w'], bytes(pkt))
            elif t == 12:  # PINGREQ
                self.send_ws(c['w'], bytes([0xD0, 0]))
            elif t == 14:  # DISCONNECT
                return False
        c['buf'] = buf
        return True


async def main(ports):
    servers = []
    for p in ports:
        br = Broker(str(p))
        servers.append(await asyncio.start_server(br.handle, '127.0.0.1', p))
    print('brokers on', ports, flush=True)
    await asyncio.gather(*(s.serve_forever() for s in servers))

if __name__ == '__main__':
    asyncio.run(main([int(x) for x in sys.argv[1:]]))
