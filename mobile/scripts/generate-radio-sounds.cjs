// Deterministic, original radio sound effects. No external audio samples.
// Run: node mobile/scripts/generate-radio-sounds.cjs
const fs = require('node:fs');
const path = require('node:path');
const SAMPLE_RATE = 44100;
const output = path.resolve(__dirname, '../assets/sounds');

function generate(name, durationMs, sound) {
  const count = Math.round(SAMPLE_RATE * durationMs / 1000);
  const data = Buffer.alloc(44 + count * 2);
  data.write('RIFF', 0);
  data.writeUInt32LE(data.length - 8, 4);
  data.write('WAVEfmt ', 8);
  data.writeUInt32LE(16, 16);
  data.writeUInt16LE(1, 20);
  data.writeUInt16LE(1, 22);
  data.writeUInt32LE(SAMPLE_RATE, 24);
  data.writeUInt32LE(SAMPLE_RATE * 2, 28);
  data.writeUInt16LE(2, 32);
  data.writeUInt16LE(16, 34);
  data.write('data', 36);
  data.writeUInt32LE(count * 2, 40);
  let seed = 0x51ed + name.length * 73;
  let previous = 0;
  let smooth = 0;
  for (let i = 0; i < count; i++) {
    const t = i / SAMPLE_RATE;
    const ms = t * 1000;
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const white = (seed / 0xffffffff) * 2 - 1;
    smooth += (white - smooth) * 0.34;
    const hiss = (white - smooth) * 0.65 + smooth * 0.12;
    const tone = (hz, gain = 1) =>
      gain * (Math.sin(2 * Math.PI * hz * t) + 0.13 * Math.sin(2 * Math.PI * hz * 2 * t));
    const pulse = (start, end, hz, amplitude = 0.12) => {
      if (ms < start || ms >= end) return 0;
      const local = ms - start;
      const edge = Math.min(1, local / 5, (end - ms) / 9);
      return tone(hz, amplitude * Math.max(0, edge));
    };
    const fade = Math.max(0, Math.min(1, ms / 5, (durationMs - ms) / 10));
    let value = 0;
    switch (sound) {
      case 'press':
        value = hiss * 0.095 * Math.exp(-ms / 22) + pulse(7, 42, 760, 0.07);
        break;
      case 'open':
        value = hiss * 0.13 * Math.exp(-ms / 75) + pulse(10, 68, 530, 0.04);
        break;
      case 'close':
        value = hiss * 0.16 * Math.exp(-ms / 42) + pulse(0, 36, 400, 0.025);
        break;
      case 'roger':
        value = pulse(4, 82, 1120, 0.13) + pulse(98, 163, 880, 0.105);
        break;
      case 'eot':
        value = pulse(4, 58, 1040, 0.12) + pulse(70, 136, 720, 0.10);
        break;
      case 'alert':
        value = pulse(9, 140, 920, 0.11) + pulse(175, 310, 920, 0.11) + hiss * 0.018;
        break;
    }
    // Gentle first-order low-pass reduces harsh high-frequency digital noise.
    previous += (value - previous) * 0.79;
    data.writeInt16LE(Math.round(Math.max(-0.7, Math.min(0.7, previous * fade)) * 32767), 44 + i * 2);
  }
  fs.writeFileSync(path.join(output, name + '.wav'), data);
  process.stdout.write(`${name}: ${durationMs} ms\n`);
}

[
  ['radio_call_alert', 360, 'alert'],
  ['radio_eot', 150, 'eot'],
  ['radio_ptt_press', 65, 'press'],
  ['radio_roger_beep', 180, 'roger'],
  ['radio_squelch_open', 210, 'open'],
  ['radio_squelch_close', 155, 'close'],
].forEach(spec => generate(...spec));
